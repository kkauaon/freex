import {
  DUAL_DIALOGUE_BOX,
  ELEMENT_BOX,
  GRID,
  CPI,
  LPI,
  PAGE,
  PROFILE_VERSION,
  TITLE_PAGE,
  classifyTransition,
  parseCharacterCue,
  wrap,
  wrapWithOffsets,
  type Block,
  type ElementType,
  type Mark,
  type TitlePage,
} from '@freex/screenplay';
import { sha256Hex } from './sha256';

export { wrap };

/**
 * Version of the pagination algorithm. Any change that alters where lines or pages break
 * must increment it (paginacao-e-quebras.md 9.3).
 * 2: cohesion rules, (MORE)/(CONT'D), action splitting, dual dialogue, inline marks.
 */
export const LAYOUT_VERSION = 2;

export interface Line {
  readonly type: ElementType;
  /**
   * Row of the body, 0..53, counted from the top margin. Several lines share a row in dual
   * dialogue; the title page uses half rows because its distances are given in inches.
   */
  readonly row: number;
  /** Column offset from the left edge of the text area; dual dialogue cues sit on half columns. */
  readonly col: number;
  readonly text: string;
  /** Inline emphasis, offsets relative to `text`. */
  readonly marks?: readonly Mark[];
}

export interface Page {
  /** Logical page number of the script; 0 for the title page, which is not numbered. */
  readonly number: number;
  readonly kind: 'title' | 'script';
  /** Number printed at the top right (`2.`); null on the title page and on script page 1. */
  readonly printedNumber: number | null;
  readonly lines: readonly Line[];
  /** Body rows used, blank separators included. */
  readonly rows: number;
}

// ------------------------------------------------------------------ cells

/** A line before it gets a page row; `r` is the row relative to the start of its block. */
interface Cell {
  readonly type: ElementType;
  readonly col: number;
  readonly text: string;
  readonly r: number;
  readonly marks?: readonly Mark[];
}

function lineMarks(source: readonly number[], marks: readonly Mark[] | undefined): Mark[] {
  if (!marks || marks.length === 0) return [];
  const out: Mark[] = [];
  for (const type of ['bold', 'italic', 'underline'] as const) {
    const of = marks.filter((m) => m.type === type);
    let from = -1;
    for (let j = 0; j <= source.length; j++) {
      const s = source[j];
      const on = s !== undefined && of.some((m) => m.from <= s && s < m.to);
      if (on && from < 0) from = j;
      else if (!on && from >= 0) {
        out.push({ type, from, to: j });
        from = -1;
      }
    }
  }
  return out;
}

function textCells(
  block: Block,
  indent: number,
  width: number,
  align: 'left' | 'right',
  type: ElementType = block.type,
): Cell[] {
  const text = block.type === 'scene-heading' ? block.text.toUpperCase() : block.text;
  // upper-casing can change the length (e.g. ß); marks would then point at the wrong chars
  const keepMarks = text.length === block.text.length;
  return wrapWithOffsets(text, width).map((l, r) => {
    const marks = keepMarks ? lineMarks(l.source, block.marks) : [];
    return {
      type,
      col: align === 'right' ? indent + width - l.text.length : indent,
      text: l.text,
      r,
      ...(marks.length > 0 && { marks }),
    };
  });
}

function toLine(cell: Cell, row: number): Line {
  return {
    type: cell.type,
    row,
    col: cell.col,
    text: cell.text,
    ...(cell.marks && { marks: cell.marks }),
  };
}

export function layoutBlock(block: Block): Line[] {
  const box = ELEMENT_BOX[block.type];
  // FADE IN: is the one transition kept on the left margin (normas-de-formatacao.md 5.6)
  const align =
    block.type === 'transition'
      ? (classifyTransition(block.text)?.align ?? box.align)
      : box.align;
  return textCells(block, box.indent, box.width, align).map((c) => toLine(c, c.r));
}

// ------------------------------------------------------------------ items

interface SpeechRow {
  readonly cell: Cell;
  readonly kind: 'parenthetical' | 'dialogue';
}

interface Speech {
  readonly kind: 'speech';
  readonly column: 'left' | 'right' | undefined;
  readonly cueText: string | null;
  readonly cue: readonly Cell[];
  readonly body: readonly SpeechRow[];
  /** Source blocks (cue first when present), kept to re-wrap in the dual dialogue columns. */
  readonly source: readonly Block[];
}

type Item =
  | { readonly kind: 'whole'; readonly cells: readonly Cell[] }
  | { readonly kind: 'action'; readonly cells: readonly Cell[] }
  | { readonly kind: 'scene'; readonly cells: readonly Cell[] }
  | { readonly kind: 'transition'; readonly cells: readonly Cell[] }
  | Speech
  | { readonly kind: 'dual'; readonly left: Speech; readonly right: Speech };

const CUE_BOX = ELEMENT_BOX.character;
const PAREN_BOX = ELEMENT_BOX.parenthetical;
const DIALOGUE_BOX = ELEMENT_BOX.dialogue;

function buildSpeech(blocks: readonly Block[], start: number): { speech: Speech; next: number } {
  const first = blocks[start];
  const hasCue = first?.type === 'character';
  let i = hasCue ? start + 1 : start;
  const body: SpeechRow[] = [];
  for (; i < blocks.length; i++) {
    const b = blocks[i];
    if (b?.type !== 'parenthetical' && b?.type !== 'dialogue') break;
    const box = b.type === 'parenthetical' ? PAREN_BOX : DIALOGUE_BOX;
    for (const cell of textCells(b, box.indent, box.width, 'left')) {
      body.push({ cell, kind: b.type });
    }
  }
  const cue = hasCue && first ? textCells(first, CUE_BOX.indent, CUE_BOX.width, 'left') : [];
  return {
    speech: {
      kind: 'speech',
      column: hasCue ? first?.column : undefined,
      cueText: hasCue && first ? first.text : null,
      cue,
      body,
      source: blocks.slice(start, i),
    },
    next: i,
  };
}

function buildItems(blocks: readonly Block[]): Item[] {
  const items: Item[] = [];
  for (let i = 0; i < blocks.length; ) {
    const b = blocks[i];
    if (!b) break;
    if (b.type === 'character' || b.type === 'parenthetical' || b.type === 'dialogue') {
      const { speech, next } = buildSpeech(blocks, i);
      const prev = items[items.length - 1];
      if (prev?.kind === 'speech' && prev.column === 'left' && speech.column === 'right' && prev.cueText !== null) {
        items[items.length - 1] = { kind: 'dual', left: prev, right: speech };
      } else {
        items.push(speech);
      }
      i = next;
      continue;
    }
    const cells = layoutBlock(b).map((l, r) => ({
      type: l.type,
      col: l.col,
      text: l.text,
      r,
      ...(l.marks && { marks: l.marks }),
    }));
    items.push({
      kind:
        b.type === 'action'
          ? 'action'
          : b.type === 'scene-heading'
            ? 'scene'
            : b.type === 'transition'
              ? 'transition'
              : 'whole',
      cells,
    });
    i++;
  }
  return items;
}

/** Dual dialogue column cells; a speech without a cue keeps the dialogue geometry. */
function dualCells(speech: Speech, side: 'left' | 'right'): Cell[] {
  const g = DUAL_DIALOGUE_BOX[side];
  const cells: Cell[] = [];
  for (const b of speech.source) {
    // the right cue column is narrower so the name stays inside the text area
    const box =
      b.type === 'character'
        ? { indent: g.character.indent, width: Math.min(CUE_BOX.width, Math.floor(GRID.columns - g.character.indent)) }
        : b.type === 'parenthetical'
          ? { indent: g.parenthetical.indent, width: Math.floor(g.parenthetical.width) }
          : { indent: g.dialogue.indent, width: g.dialogue.width };
    for (const c of textCells(b, box.indent, box.width, 'left')) {
      cells.push({ ...c, r: cells.length });
    }
  }
  return cells;
}

// ------------------------------------------------------------------ paginator

const SENTENCE_END = /[.!?…—]["')\]]?$/;

function endsSentence(cell: Cell | undefined): boolean {
  return cell !== undefined && SENTENCE_END.test(cell.text.trimEnd());
}

/** Cue text for the top of the next page: `NAME (EXT) (CONT'D)`. */
function contdCueText(cueText: string): string {
  const { name, extensions } = parseCharacterCue(cueText);
  const kept = extensions.filter((e) => !/^CONT['’]D$/i.test(e));
  return [name, ...kept.map((e) => `(${e})`), "(CONT'D)"].join(' ');
}

function cueCells(text: string): Cell[] {
  return wrapWithOffsets(text, CUE_BOX.width).map((l, r) => ({
    type: 'character' as const,
    col: CUE_BOX.indent,
    text: l.text,
    r,
  }));
}

export function paginate(blocks: readonly Block[]): Page[] {
  const items = buildItems(blocks);
  const pages: { lines: Line[]; used: number }[] = [{ lines: [], used: 0 }];
  const cur = () => pages[pages.length - 1] as { lines: Line[]; used: number };
  const remaining = () => GRID.bodyLines - cur().used;
  const isTop = () => cur().used === 0;
  const newPage = () => void pages.push({ lines: [], used: 0 });
  const gapRows = () => (isTop() ? 0 : 1);

  const put = (cells: readonly Cell[], gap: number, height = cells.length) => {
    const page = cur();
    const base = page.used + gap;
    for (const c of cells) page.lines.push(toLine(c, base + c.r));
    page.used = base + height;
  };

  /** The last chunk of the action just placed, so a transition can take its last lines along. */
  let lastAction: { page: number; count: number } | null = null;

  const chooseSplit = (cells: readonly Cell[], lo: number, hi: number) => {
    for (let k = hi; k >= lo; k--) if (endsSentence(cells[k - 1])) return k;
    return hi;
  };

  /** Splits between lines keeping `minSide` lines on each side whenever possible. */
  const placeSplittable = (all: readonly Cell[], minSide: number) => {
    let rest = all.map((c, r) => ({ ...c, r }));
    lastAction = null;
    while (rest.length > 0) {
      const gap = gapRows();
      const avail = remaining() - gap;
      if (rest.length <= avail) {
        put(rest, gap);
        if (minSide === 2) lastAction = { page: pages.length - 1, count: rest.length };
        return;
      }
      const hi = Math.min(avail, rest.length - minSide);
      if (hi >= minSide) {
        const k = chooseSplit(rest, minSide, hi);
        put(rest.slice(0, k), gap);
        newPage();
        rest = rest.slice(k).map((c, r) => ({ ...c, r }));
      } else if (!isTop()) {
        newPage();
      } else {
        put(rest.slice(0, avail), gap);
        newPage();
        rest = rest.slice(avail).map((c, r) => ({ ...c, r }));
      }
    }
  };

  const placeWhole = (cells: readonly Cell[], height: number, lead = 0) => {
    if (height > GRID.bodyLines) return placeSplittable(cells, 1);
    const need = (gap: number) => gap + height + (lead > 0 ? 1 + lead : 0);
    if (need(gapRows()) > remaining() && !isTop()) newPage();
    put(cells, gapRows(), height);
  };

  /**
   * A transition stays with at least two lines of the previous action (3.2): when it does not
   * fit, the last two lines of that action move to the next page together with it.
   */
  const placeTransition = (cells: readonly Cell[]) => {
    const height = cells.length;
    if (isTop() || gapRows() + height <= remaining()) return put(cells, gapRows());
    const la = lastAction as { page: number; count: number } | null;
    if (la && la.page === pages.length - 1 && la.count >= 4) {
      const page = cur();
      const moved = page.lines.splice(page.lines.length - 2, 2);
      page.used -= 2;
      newPage();
      put(
        moved.map((l, r) => ({
          type: l.type,
          col: l.col,
          text: l.text,
          r,
          ...(l.marks && { marks: l.marks }),
        })),
        0,
      );
      return put(cells, gapRows());
    }
    newPage();
    return put(cells, 0);
  };

  const heightOf = (cells: readonly Cell[]) => cells.length;

  const speechRows = (s: Speech): { cell: Cell; kind: 'cue' | 'parenthetical' | 'dialogue' }[] => [
    ...s.cue.map((cell) => ({ cell, kind: 'cue' as const })),
    ...s.body,
  ];

  const speechHeight = (s: Speech) => s.cue.length + s.body.length;

  /** Rows needed to start `item` on a page together with what precedes it. */
  const lead = (item: Item | undefined): number => {
    if (!item || item.kind === 'scene') return 0;
    // blocks that cannot be split (fewer than 2 + 2 lines) must start whole
    if (item.kind === 'action') return item.cells.length < 4 ? item.cells.length : 2;
    if (item.kind === 'whole' || item.kind === 'transition') return item.cells.length;
    if (item.kind === 'dual') return Math.max(speechHeight(item.left), speechHeight(item.right));
    const total = speechHeight(item);
    const first = item.body.findIndex((r) => r.kind === 'dialogue');
    const dialogue = item.body.filter((r) => r.kind === 'dialogue').length;
    if (first < 0 || dialogue < 4) return total;
    // cue, leading parentheticals, two dialogue lines and (MORE)
    return item.cue.length + first + 2 + 1;
  };

  const placeSpeech = (speech: Speech) => {
    let rows = speechRows(speech);
    let cueText = speech.cueText;
    while (rows.length > 0) {
      const gap = gapRows();
      const avail = remaining() - gap;
      if (rows.length <= avail) {
        put(
          rows.map((r, i) => ({ ...r.cell, r: i })),
          gap,
        );
        return;
      }
      const dialogueIn = (from: number, to: number) =>
        rows.slice(from, to).filter((r) => r.kind === 'dialogue').length;
      const valid = (k: number) =>
        k >= 1 &&
        k < rows.length &&
        k + 1 <= avail &&
        dialogueIn(0, k) >= 2 &&
        dialogueIn(k, rows.length) >= 2 &&
        rows[k - 1]?.kind !== 'parenthetical' &&
        rows[k - 1]?.kind !== 'cue';
      let k = -1;
      for (let c = Math.min(rows.length - 1, avail - 1); c >= 1; c--) {
        if (!valid(c)) continue;
        if (k < 0) k = c;
        if (endsSentence(rows[c - 1]?.cell)) {
          k = c;
          break;
        }
      }
      if (k < 0) {
        if (!isTop()) {
          newPage();
          continue;
        }
        k = Math.max(1, Math.min(avail - 1, rows.length - 1));
      }
      const head = rows.slice(0, k).map((r, i) => ({ ...r.cell, r: i }));
      head.push({ type: 'character', col: CUE_BOX.indent, text: '(MORE)', r: head.length });
      put(head, gap);
      newPage();
      const tail = rows.slice(k);
      if (cueText === null) {
        rows = tail;
      } else {
        const next = contdCueText(cueText);
        cueText = next;
        rows = [...cueCells(next).map((cell) => ({ cell, kind: 'cue' as const })), ...tail];
      }
    }
  };

  const placeDual = (item: Extract<Item, { kind: 'dual' }>) => {
    const left = dualCells(item.left, 'left');
    const right = dualCells(item.right, 'right');
    const height = Math.max(heightOf(left), heightOf(right));
    if (height > GRID.bodyLines) {
      placeSpeech(item.left);
      placeSpeech(item.right);
      return;
    }
    if (gapRows() + height > remaining()) newPage();
    put([...left, ...right], gapRows(), height);
  };

  items.forEach((item, idx) => {
    switch (item.kind) {
      case 'scene':
        placeWhole(item.cells, item.cells.length, lead(items[idx + 1]));
        break;
      case 'whole':
        placeWhole(item.cells, item.cells.length);
        break;
      case 'transition':
        if (item.cells.length > GRID.bodyLines) placeSplittable(item.cells, 1);
        else placeTransition(item.cells);
        break;
      case 'action':
        placeSplittable(item.cells, 2);
        break;
      case 'speech':
        placeSpeech(item);
        break;
      case 'dual':
        placeDual(item);
        break;
    }
    if (item.kind !== 'action') lastAction = null;
  });

  return pages.map((p, i) => ({
    number: i + 1,
    kind: 'script' as const,
    printedNumber: i > 0 ? i + 1 : null,
    lines: p.lines,
    rows: p.used,
  }));
}

// ------------------------------------------------------------------ title page

/** Title page (normas-de-formatacao.md 6.2): not numbered and outside the script numbering. */
export function layoutTitlePage(title: TitlePage): Page {
  const centerCol = (TITLE_PAGE.centerIn - PAGE.marginLeftIn) * CPI;
  const lines: Line[] = [];
  const centered = (text: string, row: number) => {
    lines.push({
      type: 'action',
      row,
      col: Math.max(0, Math.floor(centerCol - text.length / 2)),
      text,
    });
  };

  let row = (TITLE_PAGE.titleTopIn - PAGE.marginTopIn) * LPI;
  const titleLines = wrap(title.title.toUpperCase(), 50).filter((l) => l !== '');
  for (const l of titleLines) centered(l, row++);
  const credit = title.credit?.trim() || 'Written by';
  const authors = title.authors.map((a) => a.trim()).filter((a) => a !== '');
  if (titleLines.length > 0 || authors.length > 0) {
    row++;
    centered(credit, row);
    row += 2;
  }
  for (const a of authors) centered(a, row++);
  if (title.source?.trim()) {
    row++;
    centered(title.source.trim(), row);
  }

  const lastRow = (TITLE_PAGE.contactLastLineIn - PAGE.marginTopIn) * LPI;
  const contact = (title.contact ?? '')
    .split('\n')
    .map((c) => c.trim())
    .filter((c) => c !== '');
  contact.forEach((text, i) => {
    lines.push({ type: 'action', row: lastRow - (contact.length - 1 - i), col: 0, text });
  });
  const date = title.date?.trim();
  if (date) {
    const text = `Draft: ${date}`;
    lines.push({ type: 'action', row: lastRow, col: GRID.columns - text.length, text });
  }
  const rows = lines.reduce((m, l) => Math.max(m, Math.ceil(l.row) + 1), 0);
  return { number: 0, kind: 'title', printedNumber: null, lines, rows };
}

export interface DocumentOptions {
  readonly titlePage?: TitlePage | null;
  /** Include the title page when there is one. Default true. */
  readonly includeTitle?: boolean;
  /** Script pages to keep, by logical number, both inclusive. Numbers are never renumbered. */
  readonly range?: { readonly from: number; readonly to: number };
}

/** Title page (optional) plus the paginated script, with an optional page range (FR-EXP-004). */
export function layoutDocument(blocks: readonly Block[], options: DocumentOptions = {}): Page[] {
  let script = paginate(blocks);
  const { range } = options;
  if (range) script = script.filter((p) => p.number >= range.from && p.number <= range.to);
  const title =
    options.titlePage && options.includeTitle !== false ? [layoutTitlePage(options.titlePage)] : [];
  return [...title, ...script];
}

// ------------------------------------------------------------------ helpers

/** Plain-text rows of a page for monospace previews. Half rows and half columns are rounded up. */
export function pageRows(page: Page): string[] {
  const rows: string[][] = Array.from({ length: Math.max(page.rows, 0) }, () => []);
  for (const l of page.lines) {
    const row = rows[Math.round(l.row)];
    if (!row) continue;
    const col = Math.round(l.col);
    for (let i = 0; i < l.text.length; i++) row[col + i] = l.text.charAt(i);
  }
  return rows.map((r) => Array.from(r, (c) => c ?? ' ').join('').trimEnd());
}

/** Stable hash of the canonical layout output (paginacao-e-quebras.md 9.2). */
export function layoutHash(pages: readonly Page[]): string {
  const canonical = JSON.stringify([
    PROFILE_VERSION,
    LAYOUT_VERSION,
    pages.map((p) => [
      p.kind,
      p.printedNumber,
      p.lines.map((l) => [
        l.row,
        l.col,
        l.type,
        l.text,
        (l.marks ?? []).map((m) => [m.type, m.from, m.to]),
      ]),
    ]),
  ]);
  return `sha256:${sha256Hex(canonical)}`;
}
