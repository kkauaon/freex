import { toggleMark } from 'prosemirror-commands';
import { Fragment, type Node as PmNode } from 'prosemirror-model';
import {
  TextSelection,
  type Command,
  type EditorState,
  type Transaction,
} from 'prosemirror-state';
import {
  UPPERCASE_ELEMENTS,
  blocksToDocument,
  documentToBlocks,
  nextOnEnter,
  nextOnShiftTab,
  nextOnTab,
  normalizeBlocks,
  normalizeMarks,
  parseFountain,
  scriptSchema,
  type Block,
  type ElementType,
  type Mark,
} from '@freex/screenplay';

const SPEECH: ReadonlySet<ElementType> = new Set(['character', 'parenthetical', 'dialogue']);

export function elementOf(node: PmNode): ElementType | null {
  switch (node.type.name) {
    case 'scene_heading':
      return 'scene-heading';
    case 'action':
    case 'transition':
    case 'shot':
    case 'character':
    case 'parenthetical':
    case 'dialogue':
      return node.type.name;
    default:
      return null;
  }
}

// ------------------------------------------------------------------ flat blocks

interface Caret {
  readonly index: number;
  readonly offset: number;
}

interface Edit {
  readonly blocks: Block[];
  readonly anchor: Caret;
  readonly head: Caret;
}

interface Context {
  readonly blocks: readonly Block[];
  readonly anchor: Caret;
  readonly head: Caret;
}

interface TextblockPos {
  /** Position before the node. */
  readonly pos: number;
  readonly node: PmNode;
}

function collectTextblocks(nodes: readonly PmNode[], start: number): TextblockPos[] {
  const out: TextblockPos[] = [];
  const walk = (n: PmNode, pos: number) => {
    if (n.isTextblock) {
      out.push({ pos, node: n });
      return;
    }
    n.forEach((child, offset) => walk(child, pos + 1 + offset));
  };
  let pos = start;
  for (const n of nodes) {
    walk(n, pos);
    pos += n.nodeSize;
  }
  return out;
}

function topChildren(doc: PmNode): PmNode[] {
  const out: PmNode[] = [];
  doc.forEach((n) => out.push(n));
  return out;
}

function topIndex(doc: PmNode, pos: number): number {
  return Math.min(doc.resolve(pos).index(0), doc.childCount - 1);
}

function caretAt(tbs: readonly TextblockPos[], pos: number): Caret {
  let index = tbs.findIndex((t) => pos >= t.pos + 1 && pos <= t.pos + 1 + t.node.content.size);
  if (index < 0) index = 0;
  const t = tbs[index];
  return { index, offset: t ? Math.max(0, pos - (t.pos + 1)) : 0 };
}

/**
 * Runs a structural edit on a small window of flat blocks (the blocks of the top-level nodes
 * around the selection) and rebuilds that window with the shared engine, so the document can
 * never leave the schema. The selection is carried through the rebuild.
 */
function runEdit(
  state: EditorState,
  dispatch: ((tr: Transaction) => void) | undefined,
  fn: (ctx: Context) => Edit | null,
): boolean {
  const sel = state.selection;
  if (!(sel instanceof TextSelection)) return false;
  const doc = state.doc;
  if (doc.childCount === 0) return false;
  const first = topIndex(doc, sel.from);
  const last = topIndex(doc, sel.to);
  const a = Math.max(0, Math.min(first, last) - 1);
  const b = Math.min(doc.childCount - 1, Math.max(first, last) + 1);

  const children = topChildren(doc);
  const nodes = children.slice(a, b + 1);
  let start = 0;
  for (let i = 0; i < a; i++) start += children[i]?.nodeSize ?? 0;
  const end = start + nodes.reduce((n, x) => n + x.nodeSize, 0);

  const tbs = collectTextblocks(nodes, start);
  const blocks = documentToBlocks({
    schemaVersion: 1,
    type: 'doc',
    content: nodes.map((n) => n.toJSON() as never),
  });
  const edit = fn({ blocks, anchor: caretAt(tbs, sel.anchor), head: caretAt(tbs, sel.head) });
  if (!edit) return false;
  if (!dispatch) return true;

  const norm = normalizeBlocks(edit.blocks);
  const at = (i: number) => Math.max(0, norm.origin.indexOf(i));
  const built = blocksToDocument(norm.blocks).content.map((j) => scriptSchema.nodeFromJSON(j));
  const tr = minimalReplace(state, start, end, built);
  const newTbs = collectTextblocks(built, start);
  const pos = (c: Caret) => {
    const t = newTbs[at(c.index)];
    return t ? t.pos + 1 + Math.min(c.offset, t.node.content.size) : start + 1;
  };
  tr.setSelection(TextSelection.create(tr.doc, pos(edit.anchor), pos(edit.head)));
  dispatch(tr.scrollIntoView());
  return true;
}

/**
 * Replaces `[start, end)` with `built`, touching only the part that really differs. When
 * several people edit the same script, a structural edit that rewrote every block around the
 * caret would delete and recreate text that someone else is typing; this keeps the change to
 * the blocks (or the characters) that changed. Falls back to replacing the whole window when
 * the narrow replacement would not give exactly the intended document.
 */
function minimalReplace(state: EditorState, start: number, end: number, built: readonly PmNode[]): Transaction {
  const full = state.tr.replaceWith(start, end, built);
  const oldFrag = state.doc.content.cut(start, end);
  const newFrag = Fragment.fromArray([...built]);
  const diffStart = oldFrag.findDiffStart(newFrag);
  if (diffStart === null) return state.tr; // nothing changed
  const ends = oldFrag.findDiffEnd(newFrag);
  if (!ends) return full;
  let { a: endOld, b: endNew } = ends;
  const overlap = diffStart - Math.min(endOld, endNew);
  if (overlap > 0) {
    endOld += overlap;
    endNew += overlap;
  }
  try {
    const slice = state.doc.copy(newFrag).slice(diffStart, endNew);
    const narrow = state.tr.replace(start + diffStart, start + endOld, slice);
    return narrow.doc.eq(full.doc) ? narrow : full;
  } catch {
    return full;
  }
}

// ------------------------------------------------------------------ block helpers

function build(b: Block, text: string, marks: readonly Mark[] | undefined): Block {
  const { marks: _old, ...rest } = b;
  const m = normalizeMarks(marks, text.length);
  return m.length > 0 ? { ...rest, text, marks: m } : { ...rest, text };
}

function clipMarks(marks: readonly Mark[] | undefined, from: number, to: number): Mark[] {
  return (marks ?? [])
    .map((m) => ({ type: m.type, from: Math.max(m.from, from) - from, to: Math.min(m.to, to) - from }))
    .filter((m) => m.to > m.from);
}

function shiftMarks(marks: readonly Mark[] | undefined, by: number): Mark[] {
  return (marks ?? []).map((m) => ({ type: m.type, from: m.from + by, to: m.to + by }));
}

/** An empty parenthetical is `()`, which the user has not typed into yet. */
function isEmptyBlock(b: Block): boolean {
  return b.type === 'parenthetical' ? b.text.replace(/[()\s]/g, '') === '' : b.text.trim() === '';
}

function splitAt(b: Block, offset: number): [Block, Block] {
  const o = Math.max(0, Math.min(offset, b.text.length));
  return [
    build(b, b.text.slice(0, o), clipMarks(b.marks, 0, o)),
    build(b, b.text.slice(o), clipMarks(b.marks, o, b.text.length)),
  ];
}

function merge(a: Block, b: Block): Block {
  return build(a, a.text + b.text, [...(a.marks ?? []), ...shiftMarks(b.marks, a.text.length)]);
}

/** Applies the rules of the element the block already has: upper case and parentheses. */
function confirm(b: Block): Block {
  return convert(b, b.type, true).block;
}

/**
 * Changes the element of a block. Entering an upper-case element upper-cases the text, entering
 * a parenthetical wraps it in parentheses and leaving one removes them. `shift` is how much a
 * caret inside the text moves.
 */
function convert(b: Block, type: ElementType, force = false): { block: Block; shift: number } {
  if (b.type === type && !force) return { block: b, shift: 0 };
  let { text } = b;
  let marks = [...(b.marks ?? [])];
  let shift = 0;
  if (b.type === 'parenthetical' && type !== 'parenthetical') {
    if (text.startsWith('(')) {
      text = text.slice(1);
      marks = shiftMarks(marks, -1);
      shift -= 1;
    }
    if (text.endsWith(')')) text = text.slice(0, -1);
  }
  if (type === 'parenthetical') {
    if (!text.startsWith('(')) {
      text = `(${text}`;
      marks = shiftMarks(marks, 1);
      shift += 1;
    }
    if (!text.endsWith(')')) text = `${text})`;
  }
  if (UPPERCASE_ELEMENTS.has(type)) {
    const upper = text.toUpperCase();
    if (upper.length === text.length) text = upper;
    else marks = [];
  }
  const { column: _column, ...rest } = b;
  const next: Block = { ...rest, type };
  return { block: build(next, text, marks), shift };
}

/**
 * Removes the empty cue, parenthetical and dialogue blocks that touch `index`: shells that an
 * earlier conversion needed to keep a speech valid. Without this, walking an element through
 * the speech elements with Tab would leave a trail of empty blocks behind it.
 * Returns the blocks and where `index` ended up.
 */
function dropEmptyShells(blocks: readonly Block[], index: number): { blocks: Block[]; index: number } {
  const isShell = (b: Block | undefined) => !!b && SPEECH.has(b.type) && isEmptyBlock(b);
  let lo = index;
  let hi = index;
  while (isShell(blocks[lo - 1])) lo--;
  while (isShell(blocks[hi + 1])) hi++;
  return {
    blocks: blocks.filter((_, i) => i < lo || i > hi || i === index),
    index: index - (index - lo),
  };
}

function caretFor(type: ElementType, text: string, offset: number): number {
  // inside the parentheses of a parenthetical
  if (type === 'parenthetical') return Math.max(1, Math.min(offset, text.length - 1));
  return Math.max(0, Math.min(offset, text.length));
}

function isInDual(blocks: readonly Block[], index: number): boolean {
  for (let i = index; i >= 0; i--) {
    const b = blocks[i];
    if (b?.type === 'character') return b.column !== undefined;
    if (b && !SPEECH.has(b.type)) return false;
  }
  return false;
}

// ------------------------------------------------------------------ commands

function replaceAt(blocks: readonly Block[], index: number, ...items: Block[]): Block[] {
  return [...blocks.slice(0, index), ...items, ...blocks.slice(index + 1)];
}

/** `Enter`: creates the next element by the state machine of ux-e-interface.md 5.2. */
export const enter: Command = (state, dispatch, view) => {
  if (view?.composing) return true;
  if (!state.selection.empty) {
    if (!dispatch) return true;
    dispatch(state.tr.deleteSelection());
    return view ? enter(view.state, view.dispatch.bind(view), view) : true;
  }
  return runEdit(state, dispatch, ({ blocks, head }) => {
    const k = head.index;
    const b = blocks[k];
    if (!b) return null;
    const dual = isInDual(blocks, k);

    if (isEmptyBlock(b)) {
      if (dual) return { blocks: [...blocks], anchor: head, head };
      const { block } = convert(b, nextOnEnter(b.type, true));
      const caret = { index: k, offset: caretFor(block.type, block.text, 0) };
      return { blocks: replaceAt(blocks, k, block), anchor: caret, head: caret };
    }

    const split = splitAt(b, head.offset);
    // typing happens inside `( )`, so the caret before the closing parenthesis is the end
    const closing = b.type === 'parenthetical' && split[1].text === ')';
    const before = closing ? b : split[0];
    const after = closing ? build(b, '', []) : split[1];
    const atEnd = after.text === '';

    // a cue or parenthetical already followed by its line: go there instead of adding another
    const following = blocks[k + 1];
    if (
      atEnd &&
      (b.type === 'character' || b.type === 'parenthetical') &&
      (following?.type === 'dialogue' || (b.type === 'character' && following?.type === 'parenthetical'))
    ) {
      const caret = { index: k + 1, offset: caretFor(following.type, following.text, 0) };
      return { blocks: replaceAt(blocks, k, confirm(b)), anchor: caret, head: caret };
    }

    let nextType = nextOnEnter(b.type, false);
    if (!atEnd && (b.type === 'action' || b.type === 'dialogue')) nextType = b.type;
    if (dual) nextType = 'dialogue';
    const { block: created, shift } = convert({ ...after, type: b.type }, nextType, nextType === b.type);
    const caret = { index: k + 1, offset: caretFor(created.type, created.text, shift) };
    return {
      blocks: replaceAt(blocks, k, confirm(before), created),
      anchor: caret,
      head: caret,
    };
  });
};

/** Changes the element of every block touched by the selection (toolbar and shortcuts). */
export function setElement(type: ElementType): Command {
  return (state, dispatch, view) => {
    if (view?.composing) return true;
    return runEdit(state, dispatch, ({ blocks, anchor, head }) => {
      const lo = Math.min(anchor.index, head.index);
      const hi = Math.max(anchor.index, head.index);
      let out = [...blocks];
      const carets = new Map<number, Caret>();
      for (let i = lo; i <= hi; i++) {
        const b = out[i];
        if (!b) continue;
        const { block, shift } = convert(b, type);
        out[i] = block;
        for (const c of [anchor, head]) {
          if (c.index === i) carets.set(i, { index: i, offset: caretFor(type, block.text, c.offset + shift) });
        }
      }
      const fix = (c: Caret) => carets.get(c.index) ?? c;
      if (lo === hi) {
        // one block: leave no empty speech shells behind, as with Tab
        const tidy = dropEmptyShells(out, lo);
        out = tidy.blocks;
        const caret = { index: tidy.index, offset: fix(head).offset };
        return { blocks: out, anchor: caret, head: caret };
      }
      return { blocks: out, anchor: fix(anchor), head: fix(head) };
    });
  };
}

function inDualPosition(state: EditorState): { depth: number; side: 0 | 1 } | null {
  const $from = state.selection.$from;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === 'dual_dialogue') {
      return { depth: d, side: $from.index(d) === 0 ? 0 : 1 };
    }
  }
  return null;
}

function selectAt(state: EditorState, dispatch: ((tr: Transaction) => void) | undefined, pos: number) {
  if (dispatch) {
    dispatch(
      state.tr.setSelection(TextSelection.near(state.doc.resolve(pos))).scrollIntoView(),
    );
  }
  return true;
}

/** `Tab` and `Shift+Tab`: next or previous element; inside dual dialogue they move between columns first. */
export function tab(shift: boolean): Command {
  return (state, dispatch, view) => {
    if (view?.composing) return true;
    const dual = inDualPosition(state);
    if (dual) {
      const node = state.selection.$from.node(dual.depth);
      const start = state.selection.$from.start(dual.depth);
      if (!shift && dual.side === 0) return selectAt(state, dispatch, start + (node.child(0)?.nodeSize ?? 0) + 2);
      if (shift && dual.side === 1) return selectAt(state, dispatch, start + 2);
      if (!shift) {
        // leaving the right column: continue after the block, creating an action when it is the last
        const after = start + node.content.size + 1;
        if (after < state.doc.content.size) return selectAt(state, dispatch, after + 1);
        if (dispatch) {
          const action = scriptSchema.nodes.action?.create();
          if (action) {
            const tr = state.tr.insert(after, action);
            dispatch(tr.setSelection(TextSelection.near(tr.doc.resolve(after + 1))).scrollIntoView());
          }
        }
        return true;
      }
      const before = start - 1;
      return before > 0 ? selectAt(state, dispatch, before - 1) : true;
    }
    return runEdit(state, dispatch, ({ blocks, head }) => {
      const b = blocks[head.index];
      if (!b) return null;
      const target = shift ? nextOnShiftTab(b.type) : nextOnTab(b.type);
      const { block, shift: moved } = convert(b, target);
      const tidy = dropEmptyShells(replaceAt(blocks, head.index, block), head.index);
      const caret = {
        index: tidy.index,
        offset: caretFor(target, block.text, head.offset + moved),
      };
      return { blocks: tidy.blocks, anchor: caret, head: caret };
    });
  };
}

/** `Backspace` at the start of a block: merge with the previous block or reset to action. */
export const backspace: Command = (state, dispatch, view) => {
  // while an IME is composing (mobile keyboards, most of the time) the keyboard deletes by itself
  if (view?.composing) return false;
  const sel = state.selection;
  if (!sel.empty || !(sel instanceof TextSelection) || sel.$from.parentOffset !== 0) return false;
  return runEdit(state, dispatch, ({ blocks, head }) => {
    const k = head.index;
    const b = blocks[k];
    const prev = blocks[k - 1];
    if (!b) return null;
    const keep = (out: Block[], caret: Caret): Edit => ({ blocks: out, anchor: caret, head: caret });

    if (!prev) {
      if (b.type === 'action') return keep([...blocks], head);
      const { block } = convert(b, 'action');
      return keep(replaceAt(blocks, k, block), { index: k, offset: 0 });
    }
    // an empty block just disappears and the caret goes up
    if (isEmptyBlock(b)) {
      const out = [...blocks.slice(0, k), ...blocks.slice(k + 1)];
      return keep(out, { index: k - 1, offset: prev.text.length });
    }
    // a block of another element first goes back to action, then merges on the next press
    if (prev.type !== b.type && b.type !== 'action') {
      const { block } = convert(b, 'action');
      return keep(replaceAt(blocks, k, block), { index: k, offset: 0 });
    }
    return keep([...blocks.slice(0, k - 1), merge(prev, b), ...blocks.slice(k + 1)], {
      index: k - 1,
      offset: prev.text.length,
    });
  });
};

/** `Delete` at the end of a block: pull the next block into this one. */
export const deleteForward: Command = (state, dispatch, view) => {
  if (view?.composing) return false;
  const sel = state.selection;
  if (!sel.empty || !(sel instanceof TextSelection)) return false;
  if (sel.$from.parentOffset !== sel.$from.parent.content.size) return false;
  return runEdit(state, dispatch, ({ blocks, head }) => {
    const k = head.index;
    const b = blocks[k];
    const next = blocks[k + 1];
    if (!b) return null;
    if (!next) return { blocks: [...blocks], anchor: head, head };
    const caret = { index: k, offset: b.text.length };
    return {
      blocks: [...blocks.slice(0, k), merge(b, next), ...blocks.slice(k + 2)],
      anchor: caret,
      head: caret,
    };
  });
};

/** `Ctrl/Cmd+Enter`: a new scene heading after the current block, leaving dual dialogue. */
export const insertSceneAfter: Command = (state, dispatch) => {
  const $from = state.selection.$from;
  if ($from.depth < 1) return false;
  const end = $from.after(1);
  if (dispatch) {
    const heading = scriptSchema.nodes.scene_heading?.create();
    if (!heading) return false;
    const tr = state.tr.insert(end, heading);
    dispatch(tr.setSelection(TextSelection.near(tr.doc.resolve(end + 1))).scrollIntoView());
  }
  return true;
};

/** Turns the speech under the caret and the next one into dual dialogue, or splits a dual block. */
export const toggleDualDialogue: Command = (state, dispatch, view) => {
  if (view?.composing) return true;
  return runEdit(state, dispatch, ({ blocks, head }) => {
    const k = head.index;
    const b = blocks[k];
    if (!b || !SPEECH.has(b.type)) return null;

    let cue = k;
    while (cue > 0 && blocks[cue]?.type !== 'character') cue--;
    let end = cue;
    while (blocks[end + 1] && SPEECH.has(blocks[end + 1]?.type as ElementType) && blocks[end + 1]?.type !== 'character') {
      end++;
    }
    const cueBlock = blocks[cue];
    if (!cueBlock) return null;
    const out = [...blocks];
    const drop = (i: number) => {
      const x = out[i];
      if (!x) return;
      const { column: _column, ...rest } = x;
      out[i] = rest;
    };

    if (cueBlock.column) {
      // leave dual dialogue: both cues lose their column
      if (cueBlock.column === 'left') {
        drop(cue);
        const partner = end + 1;
        if (out[partner]?.type === 'character') drop(partner);
      } else {
        drop(cue);
        let p = cue - 1;
        while (p >= 0 && out[p]?.type !== 'character') p--;
        if (p >= 0) drop(p);
      }
      return { blocks: out, anchor: head, head };
    }

    const nextCue = blocks[end + 1];
    if (nextCue?.type === 'character' && !nextCue.column) {
      out[cue] = { ...cueBlock, column: 'left' };
      out[end + 1] = { ...nextCue, column: 'right' };
      return { blocks: out, anchor: head, head };
    }
    // nothing to pair with: add an empty right column
    out[cue] = { ...cueBlock, column: 'left' };
    out.splice(
      end + 1,
      0,
      { type: 'character', text: '', column: 'right' },
      { type: 'dialogue', text: '' },
    );
    const caret = { index: end + 1, offset: 0 };
    return { blocks: out, anchor: caret, head: caret };
  });
};

/** Pastes plain text only; several lines are read as Fountain and inserted as new blocks. */
export function pastePlainText(state: EditorState, dispatch: (tr: Transaction) => void, text: string): boolean {
  const clean = text.replace(/\r\n?/g, '\n').replace(/\t/g, ' ');
  if (clean === '') return true;
  if (!clean.includes('\n')) {
    dispatch(state.tr.insertText(clean).scrollIntoView());
    return true;
  }
  const incoming = parseFountain(clean).blocks;
  if (incoming.length === 0) return true;
  return runEdit(state, dispatch, ({ blocks, head }) => {
    const k = head.index;
    const b = blocks[k];
    const replace = !!b && isEmptyBlock(b);
    const at = replace ? k : k + 1;
    const out = [...blocks.slice(0, at), ...incoming, ...blocks.slice(replace ? k + 1 : at)];
    const lastIndex = at + incoming.length - 1;
    const caret = { index: lastIndex, offset: incoming[incoming.length - 1]?.text.length ?? 0 };
    return { blocks: out, anchor: caret, head: caret };
  });
}

export const toggleBold = toggleMark(scriptSchema.marks.bold!);
export const toggleItalic = toggleMark(scriptSchema.marks.italic!);
export const toggleUnderline = toggleMark(scriptSchema.marks.underline!);

// ------------------------------------------------------------------ queries

export interface SelectionInfo {
  readonly element: ElementType | null;
  readonly inDual: boolean;
  /** 0-based index of the current block in the whole script. */
  readonly blockIndex: number;
}

export function selectionInfo(state: EditorState): SelectionInfo {
  const $from = state.selection.$from;
  const parent = $from.parent;
  const tbs = collectTextblocks(topChildren(state.doc), 0);
  const idx = tbs.findIndex((t) => t.pos === $from.before());
  return {
    element: parent.isTextblock ? elementOf(parent) : null,
    inDual: inDualPosition(state) !== null,
    blockIndex: Math.max(0, idx),
  };
}

/** Position inside the textblock of the `index`-th flat block, for "go to problem". */
export function positionOfBlock(doc: PmNode, index: number): number | null {
  const t = collectTextblocks(topChildren(doc), 0)[index];
  return t ? t.pos + 1 : null;
}
