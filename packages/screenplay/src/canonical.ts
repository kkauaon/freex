import type { Block, Mark, MarkType } from './block';
import { normalizeMarks } from './marks';

/**
 * Canonical script document (docs/03-arquitetura/modelo-de-dados.md section 5): the ProseMirror
 * tree stored and synchronised, as plain JSON. `Block[]` is the flat form used by layout.
 */
export const SCHEMA_VERSION = 1;

export interface PmMark {
  readonly type: MarkType;
}

export interface PmNode {
  readonly type: string;
  readonly attrs?: Readonly<Record<string, unknown>>;
  readonly content?: readonly PmNode[];
  readonly text?: string;
  readonly marks?: readonly PmMark[];
}

export interface ScriptDocument {
  readonly schemaVersion: typeof SCHEMA_VERSION;
  readonly type: 'doc';
  readonly content: readonly PmNode[];
}

const MARK_ORDER: readonly MarkType[] = ['bold', 'italic', 'underline'];

function textNodes(text: string, marks: readonly Mark[] | undefined): PmNode[] {
  if (text === '') return [];
  const ms = normalizeMarks(marks, text.length);
  const cuts = new Set([0, text.length]);
  for (const m of ms) {
    cuts.add(m.from);
    cuts.add(m.to);
  }
  const points = [...cuts].sort((a, b) => a - b);
  const out: PmNode[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i] ?? 0;
    const to = points[i + 1] ?? from;
    const active = MARK_ORDER.filter((t) => ms.some((m) => m.type === t && m.from <= from && to <= m.to));
    out.push({
      type: 'text',
      text: text.slice(from, to),
      ...(active.length > 0 && { marks: active.map((type) => ({ type })) }),
    });
  }
  return out;
}

function leaf(type: string, block: Block | undefined, attrs?: Record<string, unknown>): PmNode {
  const content = textNodes(block?.text ?? '', block?.marks);
  return {
    type,
    ...(attrs && { attrs }),
    ...(content.length > 0 && { content }),
  };
}

const SPEECH_TYPES: ReadonlySet<Block['type']> = new Set(['character', 'parenthetical', 'dialogue']);

export interface NormalizedBlocks {
  readonly blocks: Block[];
  /** `origin[i]` is the index in the input of `blocks[i]`, or null for a block that was added. */
  readonly origin: (number | null)[];
}

/**
 * Makes a flat sequence satisfy the schema: a stray parenthetical or dialogue gets an empty
 * character in front, a character without dialogue gets an empty dialogue after it, and a
 * `left` column without a `right` column right after it (or the reverse) loses its column.
 * Blocks keep their order; `origin` lets callers carry a selection through the change.
 */
export function normalizeBlocks(blocks: readonly Block[]): NormalizedBlocks {
  type Item = { block: Block; origin: number | null };
  const groups: (Item | Item[])[] = [];

  for (let i = 0; i < blocks.length; ) {
    const b = blocks[i];
    if (!b) break;
    if (!SPEECH_TYPES.has(b.type)) {
      groups.push({ block: b, origin: i });
      i++;
      continue;
    }
    const speech: Item[] = [];
    if (b.type === 'character') {
      speech.push({ block: b, origin: i });
      i++;
    } else {
      speech.push({ block: { type: 'character', text: '' }, origin: null });
    }
    for (; i < blocks.length; i++) {
      const x = blocks[i];
      if (x?.type !== 'parenthetical' && x?.type !== 'dialogue') break;
      // two parentheticals in a row need a dialogue between them
      if (x.type === 'parenthetical' && speech[speech.length - 1]?.block.type === 'parenthetical') {
        speech.push({ block: { type: 'dialogue', text: '' }, origin: null });
      }
      speech.push({ block: x, origin: i });
    }
    // every parenthetical must be followed by a dialogue; the speech needs at least one
    const last = speech[speech.length - 1];
    if (!last || last.block.type !== 'dialogue') {
      speech.push({ block: { type: 'dialogue', text: '' }, origin: null });
    }
    groups.push(speech);
  }

  // dual dialogue: only a `left` speech immediately followed by a `right` one is kept
  const speeches = groups.filter((g): g is Item[] => Array.isArray(g));
  const paired = new Set<Item[]>();
  for (let k = 0; k < groups.length - 1; k++) {
    const x = groups[k];
    const y = groups[k + 1];
    if (Array.isArray(x) && Array.isArray(y) && x[0]?.block.column === 'left' && y[0]?.block.column === 'right') {
      paired.add(x);
      paired.add(y);
    }
  }
  for (const sp of speeches) {
    const cue = sp[0];
    if (cue && cue.block.column !== undefined && !paired.has(sp)) {
      const { column: _drop, ...rest } = cue.block;
      sp[0] = { block: rest, origin: cue.origin };
    }
  }

  const out: Block[] = [];
  const origin: (number | null)[] = [];
  for (const g of groups) {
    for (const item of Array.isArray(g) ? g : [g]) {
      out.push(item.block);
      origin.push(item.origin);
    }
  }
  return { blocks: out, origin };
}

/**
 * Builds the document tree from flat blocks, normalising them first (see `normalizeBlocks`)
 * so the result is always valid. Use `validateBlocks` to report such problems.
 */
export function blocksToDocument(blocks: readonly Block[]): ScriptDocument {
  const flat = normalizeBlocks(blocks).blocks;
  type Entry = { node: PmNode; column: 'left' | 'right' | undefined };
  const entries: Entry[] = [];

  for (let i = 0; i < flat.length; ) {
    const b = flat[i];
    if (!b) break;
    if (b.type === 'character') {
      let j = i + 1;
      const body: PmNode[] = [];
      for (; j < flat.length; j++) {
        const x = flat[j];
        if (x?.type !== 'parenthetical' && x?.type !== 'dialogue') break;
        body.push(leaf(x.type, x));
      }
      entries.push({ node: { type: 'speech', content: [leaf('character', b), ...body] }, column: b.column });
      i = j;
      continue;
    }
    const type = b.type === 'scene-heading' ? 'scene_heading' : b.type;
    entries.push({
      node: leaf(type, b, b.type === 'scene-heading' ? { sceneNumber: null, revisionColor: null } : undefined),
      column: undefined,
    });
    i++;
  }

  const content: PmNode[] = [];
  for (let k = 0; k < entries.length; k++) {
    const e = entries[k];
    const next = entries[k + 1];
    if (e && next && e.column === 'left' && next.column === 'right') {
      content.push({ type: 'dual_dialogue', content: [e.node, next.node] });
      k++;
    } else if (e) {
      content.push(e.node);
    }
  }
  return { schemaVersion: SCHEMA_VERSION, type: 'doc', content };
}

function readText(node: PmNode): { text: string; marks: Mark[] } {
  let text = '';
  const marks: Mark[] = [];
  for (const child of node.content ?? []) {
    if (child.type !== 'text') throw new TypeError(`Unexpected node "${child.type}" inside text`);
    const from = text.length;
    text += child.text ?? '';
    for (const m of child.marks ?? []) marks.push({ type: m.type, from, to: text.length });
  }
  return { text, marks: normalizeMarks(marks, text.length) };
}

function textBlock(type: Block['type'], node: PmNode, column?: 'left' | 'right'): Block {
  const { text, marks } = readText(node);
  return { type, text, ...(marks.length > 0 && { marks }), ...(column && { column }) };
}

const SIMPLE: Readonly<Record<string, Block['type']>> = {
  scene_heading: 'scene-heading',
  action: 'action',
  transition: 'transition',
  shot: 'shot',
};

function speechBlocks(node: PmNode, column?: 'left' | 'right'): Block[] {
  return (node.content ?? []).map((child) => {
    if (child.type === 'character') return textBlock('character', child, column);
    if (child.type === 'parenthetical' || child.type === 'dialogue') return textBlock(child.type, child);
    throw new TypeError(`Unexpected node "${child.type}" inside speech`);
  });
}

/** Flattens the document tree into blocks. Throws `TypeError` on a node type it does not know. */
export function documentToBlocks(doc: ScriptDocument): Block[] {
  const out: Block[] = [];
  for (const node of doc.content) {
    const simple = SIMPLE[node.type];
    if (simple) out.push(textBlock(simple, node));
    else if (node.type === 'speech') out.push(...speechBlocks(node));
    else if (node.type === 'dual_dialogue') {
      const [left, right] = node.content ?? [];
      if (left) out.push(...speechBlocks(left, 'left'));
      if (right) out.push(...speechBlocks(right, 'right'));
    } else throw new TypeError(`Unexpected node "${node.type}" at the top level`);
  }
  return out;
}

export interface DocumentIssue {
  /** Index path from `doc.content`, e.g. `[3, 1]`. */
  readonly path: readonly number[];
  readonly message: string;
}

/** Checks the invariants of modelo-de-dados.md 5.3. Messages never contain script text. */
export function validateDocument(doc: ScriptDocument): DocumentIssue[] {
  const issues: DocumentIssue[] = [];
  const bad = (path: number[], message: string) => issues.push({ path, message });

  const checkText = (node: PmNode, path: number[]) => {
    for (const child of node.content ?? []) {
      if (child.type !== 'text') bad(path, 'Nó de texto esperado.');
      else if ((child.text ?? '').includes('\n')) bad(path, 'Texto não pode conter quebra de linha.');
    }
  };

  const checkSpeech = (node: PmNode, path: number[]) => {
    const kids = node.content ?? [];
    kids.forEach((k, i) => checkText(k, [...path, i]));
    if (kids.filter((k) => k.type === 'character').length !== 1 || kids[0]?.type !== 'character') {
      bad(path, 'A fala deve começar com exatamente um personagem.');
    }
    if (!kids.some((k) => k.type === 'dialogue')) bad(path, 'A fala precisa de ao menos um diálogo.');
    kids.forEach((k, i) => {
      if (!['character', 'parenthetical', 'dialogue'].includes(k.type)) {
        bad([...path, i], 'Nó inválido dentro de fala.');
      }
      if (k.type === 'parenthetical') {
        const prev = kids[i - 1]?.type;
        const next = kids[i + 1]?.type;
        if (!(prev === 'character' || prev === 'dialogue') || !(next === 'dialogue')) {
          bad([...path, i], 'Parêntese deve ficar entre personagem e diálogo, ou entre diálogos.');
        }
      }
    });
  };

  doc.content.forEach((node, i) => {
    if (node.type === 'speech') checkSpeech(node, [i]);
    else if (node.type === 'dual_dialogue') {
      const kids = node.content ?? [];
      if (kids.length !== 2 || kids.some((k) => k.type !== 'speech')) {
        bad([i], 'Diálogo duplo deve ter exatamente duas falas.');
      }
      kids.forEach((k, j) => {
        if (k.type === 'speech') checkSpeech(k, [i, j]);
      });
    } else if (node.type in SIMPLE) checkText(node, [i]);
    else if (node.type === 'dialogue' || node.type === 'character' || node.type === 'parenthetical') {
      bad([i], 'Personagem, parêntese e diálogo devem estar dentro de uma fala.');
    } else bad([i], 'Tipo de nó desconhecido.');
  });
  return issues;
}
