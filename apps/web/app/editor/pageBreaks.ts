import type { Node as PmNode } from 'prosemirror-model';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { layoutTitlePage, type Line, type Page } from '@freex/layout';
import { CPI, ELEMENT_BOX, GRID, LPI, PAGE, type ElementType, type TitlePage } from '@freex/screenplay';

// 96 CSS px per inch. Courier Prime 12 pt is 16 px, so a row is 16 px and a column 9.6 px.
export const PX_PER_IN = 96;
export const ROW_PX = PX_PER_IN / LPI;
export const COL_PX = PX_PER_IN / CPI;
export const SHEET_W = PAGE.widthIn * PX_PER_IN;
export const SHEET_H = PAGE.heightIn * PX_PER_IN;
export const MARGIN_LEFT_PX = PAGE.marginLeftIn * PX_PER_IN;
export const MARGIN_RIGHT_PX = PAGE.marginRightIn * PX_PER_IN;
export const MARGIN_TOP_PX = PAGE.marginTopIn * PX_PER_IN;
export const MARGIN_BOTTOM_PX = PAGE.marginBottomIn * PX_PER_IN;
/** Space shown between two sheets. */
export const SHEET_GAP_PX = 32;

/** Where one page ends and the next one starts, as the paginator decided. */
export interface PageBreakSpec {
  /** Logical number of the page that starts here. */
  readonly page: number;
  readonly printedNumber: number | null;
  /** The block (flat index, same order as the textblocks) where the real text of the page starts. */
  readonly block: number;
  /** Offset in that block's text where the page starts. */
  readonly from: number;
  /** Rows the previous page used, `(MORE)` included. */
  readonly prevRows: number;
  /** The previous page ends with `(MORE)`. */
  readonly more: boolean;
  /** Cue lines the engine adds at the top of this page (`NAME (CONT'D)`). */
  readonly contd: readonly { readonly text: string; readonly col: number }[];
}

/** The page breaks of a paginated script. Page 1 has none. */
export function pageBreaks(pages: readonly Page[]): PageBreakSpec[] {
  const out: PageBreakSpec[] = [];
  pages.forEach((page, i) => {
    const prev = pages[i - 1];
    if (!prev || page.kind !== 'script') return;
    const first = page.lines.find((l) => !l.synthetic && l.block !== undefined);
    if (!first || first.block === undefined) return;
    out.push({
      page: page.number,
      printedNumber: page.printedNumber,
      block: first.block,
      from: first.from ?? 0,
      prevRows: prev.rows,
      more: prev.lines.some((l) => l.synthetic === 'more'),
      contd: page.lines
        .filter((l) => l.synthetic === 'contd')
        .map((l) => ({ text: l.text, col: l.col })),
    });
  });
  return out;
}

// ------------------------------------------------------------------ positions

interface Textblock {
  /** Position before the node. */
  readonly pos: number;
  readonly node: PmNode;
  /** Position before the top-level node that contains it. */
  readonly topPos: number;
  /** First textblock of its top-level node: a break here goes between top-level nodes. */
  readonly firstInTop: boolean;
  /** Left inset, in px from the paper edge, of the box the widget would be placed in. */
  readonly insetPx: number;
}

const ELEMENT_OF: Readonly<Record<string, ElementType>> = {
  scene_heading: 'scene-heading',
  action: 'action',
  transition: 'transition',
  shot: 'shot',
  character: 'character',
  parenthetical: 'parenthetical',
  dialogue: 'dialogue',
};

function textblocks(doc: PmNode): Textblock[] {
  const out: Textblock[] = [];
  doc.forEach((top, topOffset) => {
    let first = true;
    const walk = (n: PmNode, pos: number) => {
      if (n.isTextblock) {
        out.push({ pos, node: n, topPos: topOffset, firstInTop: first, insetPx: MARGIN_LEFT_PX });
        first = false;
        return;
      }
      n.forEach((child, offset) => walk(child, pos + 1 + offset));
    };
    walk(top, topOffset);
  });
  return out;
}

/** Left offset of the text of a textblock from the paper edge, for widgets inside it. */
function textInset(node: PmNode): number {
  const element = ELEMENT_OF[node.type.name];
  const indent = element ? ELEMENT_BOX[element].indent : 0;
  return MARGIN_LEFT_PX + indent * COL_PX;
}

export interface ResolvedBreak {
  readonly pos: number;
  /** The widget sits between two top-level nodes, after the 1-row gap the previous one leaves. */
  readonly between: boolean;
  /** Distance, in px, from the paper edge to the left edge of the box the widget is placed in. */
  readonly insetPx: number;
}

/** Finds the document position of a break; null when the block does not exist (stale layout). */
export function resolveBreak(doc: PmNode, spec: PageBreakSpec, tbs = textblocks(doc)): ResolvedBreak | null {
  const tb = tbs[spec.block];
  if (!tb) return null;
  if (spec.from > 0 && spec.from <= tb.node.content.size) {
    return { pos: tb.pos + 1 + spec.from, between: false, insetPx: textInset(tb.node) };
  }
  if (tb.firstInTop) return { pos: tb.topPos, between: true, insetPx: MARGIN_LEFT_PX };
  // before a parenthetical or dialogue inside a speech: the speech has no gap between its lines
  return { pos: tb.pos, between: false, insetPx: MARGIN_LEFT_PX };
}

// ------------------------------------------------------------------ geometry

/**
 * Height, in px, of the white space that finishes a page: from the end of its last row to the
 * bottom of the sheet, the bottom margin included. `between` is true when the last node of the
 * page still has its 1-row gap below it in the flow.
 */
export function pageEndPx(rows: number, between: boolean): number {
  return (GRID.bodyLines - rows) * ROW_PX - (between ? ROW_PX : 0) + MARGIN_BOTTOM_PX;
}

// ------------------------------------------------------------------ widgets

function el(tag: string, className: string, style: Partial<CSSStyleDeclaration> = {}): HTMLElement {
  const e = document.createElement(tag);
  e.className = className;
  Object.assign(e.style, style);
  return e;
}

function row(text: string, col: number): HTMLElement {
  const r = el('div', 'pb-row', { paddingLeft: `${MARGIN_LEFT_PX + col * COL_PX}px` });
  r.textContent = text;
  return r;
}

function shell(insetPx: number): HTMLElement {
  const e = el('div', 'pb', {
    marginLeft: `${-insetPx}px`,
    width: `${SHEET_W}px`,
  });
  e.contentEditable = 'false';
  return e;
}

function topOfSheet(printedNumber: number | null): HTMLElement {
  const top = el('div', 'pb-top', { height: `${MARGIN_TOP_PX}px` });
  if (printedNumber !== null) {
    const n = el('div', 'pb-number', { top: `${0.5 * PX_PER_IN}px`, right: `${MARGIN_RIGHT_PX}px` });
    n.textContent = `${printedNumber}.`;
    top.append(n);
  }
  return top;
}

/** The end of one sheet, the gap, and the top of the next one, with `(MORE)` and `(CONT'D)`. */
export function breakWidget(spec: PageBreakSpec, resolved: ResolvedBreak): HTMLElement {
  const w = shell(resolved.insetPx);
  if (spec.more) w.append(row('(MORE)', ELEMENT_BOX.character.indent));
  w.append(el('div', 'pb-bottom', { height: `${pageEndPx(spec.prevRows, resolved.between)}px` }));
  w.append(el('div', 'pb-gap', { height: `${SHEET_GAP_PX}px` }));
  w.append(topOfSheet(spec.printedNumber));
  for (const line of spec.contd) w.append(row(line.text, line.col));
  return w;
}

function absolute(line: Line): HTMLElement {
  const e = el('div', 'pb-line', {
    top: `${(PAGE.marginTopIn + line.row / LPI) * PX_PER_IN}px`,
    left: `${(PAGE.marginLeftIn + line.col / CPI) * PX_PER_IN}px`,
  });
  e.textContent = line.text;
  return e;
}

/** The title page as the first sheet; clicking it asks for the cover to be edited. */
export function coverWidget(titlePage: TitlePage, onOpen: () => void): HTMLElement {
  const sheet = el('div', 'pb-cover', { height: `${SHEET_H}px` });
  const page = layoutTitlePage(titlePage);
  for (const line of page.lines) sheet.append(absolute(line));
  const label = document.createElement('button');
  label.className = 'pb-cover-edit';
  label.textContent = 'Editar capa';
  label.type = 'button';
  label.addEventListener('click', onOpen);
  sheet.append(label);
  return sheet;
}

/** Top of the first script page, preceded by the cover when there is one. */
export function startWidget(titlePage: TitlePage | null, onOpenCover: () => void): HTMLElement {
  const w = shell(MARGIN_LEFT_PX);
  if (titlePage) {
    w.append(coverWidget(titlePage, onOpenCover));
    w.append(el('div', 'pb-gap', { height: `${SHEET_GAP_PX}px` }));
  }
  w.append(topOfSheet(null));
  return w;
}

/** The rest of the last page, down to the bottom margin. */
export function endWidget(lastRows: number): HTMLElement {
  const w = shell(MARGIN_LEFT_PX);
  w.append(el('div', 'pb-bottom pb-end', { height: `${pageEndPx(lastRows, true)}px` }));
  return w;
}

// ------------------------------------------------------------------ decorations

export interface PageDecorationInput {
  readonly pages: readonly Page[];
  readonly titlePage: TitlePage | null;
  readonly onOpenCover: () => void;
}

/** All the page furniture of the script: the first top margin, the breaks and the last page end. */
export function buildPageDecorations(doc: PmNode, input: PageDecorationInput): DecorationSet {
  const script = input.pages.filter((p) => p.kind === 'script');
  const tbs = textblocks(doc);
  const decorations: Decoration[] = [];

  const coverKey = input.titlePage ? JSON.stringify(input.titlePage) : 'none';
  decorations.push(
    Decoration.widget(0, () => startWidget(input.titlePage, input.onOpenCover), {
      side: -1,
      key: `start:${coverKey}`,
      ignoreSelection: true,
    }),
  );

  for (const spec of pageBreaks(script)) {
    const resolved = resolveBreak(doc, spec, tbs);
    if (!resolved) continue;
    const key = `pb:${spec.page}:${spec.prevRows}:${resolved.between}:${spec.more}:${spec.contd
      .map((c) => c.text)
      .join('|')}:${resolved.insetPx}:${spec.printedNumber}`;
    decorations.push(
      Decoration.widget(resolved.pos, () => breakWidget(spec, resolved), {
        side: -1,
        key,
        ignoreSelection: true,
      }),
    );
  }

  const last = script[script.length - 1];
  decorations.push(
    Decoration.widget(doc.content.size, () => endWidget(last?.rows ?? 0), {
      side: 1,
      key: `end:${last?.rows ?? 0}`,
      ignoreSelection: true,
    }),
  );
  return DecorationSet.create(doc, decorations);
}

export const pageDecorationsKey = new PluginKey<DecorationSet>('pageDecorations');

/**
 * Keeps the page furniture as decorations. They are rebuilt when the layout changes (the editor
 * sends them as transaction meta) and mapped through edits in between, so a break follows its
 * text while the next layout is computed.
 */
export const pageDecorations = new Plugin<DecorationSet>({
  key: pageDecorationsKey,
  state: {
    init: () => DecorationSet.empty,
    apply(tr, set) {
      const next = tr.getMeta(pageDecorationsKey) as DecorationSet | undefined;
      return next ?? set.map(tr.mapping, tr.doc);
    },
  },
  props: {
    decorations(state) {
      return pageDecorationsKey.getState(state) ?? null;
    },
  },
});
