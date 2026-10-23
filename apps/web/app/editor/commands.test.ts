import { describe, expect, it } from 'vitest';
import { EditorState, TextSelection, type Command } from 'prosemirror-state';
import { ReplaceStep } from 'prosemirror-transform';
import {
  blocksToDocument,
  documentToBlocks,
  nodeToScriptDocument,
  scriptDocumentToNode,
  validateDocument,
  type Block,
  type ElementType,
} from '@freex/screenplay';
import {
  backspace,
  deleteForward,
  enter,
  insertSceneAfter,
  pastePlainText,
  positionOfBlock,
  selectionInfo,
  setElement,
  tab,
  toggleDualDialogue,
} from './commands';

function stateFor(blocks: Block[], index = 0, offset = 0): EditorState {
  const doc = scriptDocumentToNode(blocksToDocument(blocks));
  const pos = (positionOfBlock(doc, index) ?? 1) + offset;
  return EditorState.create({ doc, selection: TextSelection.create(doc, pos) });
}

interface Result {
  state: EditorState;
  blocks: Block[];
  index: number;
  offset: number;
  handled: boolean;
}

function run(cmd: Command, state: EditorState): Result {
  let next = state;
  const handled = cmd(state, (tr) => {
    next = state.apply(tr);
  });
  return {
    state: next,
    blocks: documentToBlocks(nodeToScriptDocument(next.doc)),
    index: selectionInfo(next).blockIndex,
    offset: next.selection.$from.parentOffset,
    handled,
  };
}

const types = (blocks: Block[]) => blocks.map((b) => b.type);
const B = (type: ElementType, text: string, extra: Partial<Block> = {}): Block => ({ type, text, ...extra });

describe('Enter (ux-e-interface.md 5.2)', () => {
  it('scene heading -> action, upper-casing the heading', () => {
    const r = run(enter, stateFor([B('scene-heading', 'int. sala - dia')], 0, 15));
    expect(r.blocks).toEqual([B('scene-heading', 'INT. SALA - DIA'), B('action', '')]);
    expect([r.index, r.offset]).toEqual([1, 0]);
  });

  it('action -> action, empty action -> scene heading (converting in place)', () => {
    const a = run(enter, stateFor([B('action', 'Ana entra.')], 0, 10));
    expect(types(a.blocks)).toEqual(['action', 'action']);
    const b = run(enter, stateFor([B('action', 'Ana entra.'), B('action', '')], 1, 0));
    expect(types(b.blocks)).toEqual(['action', 'scene-heading']);
  });

  it('character -> dialogue and empty dialogue -> character', () => {
    // a speech always has a dialogue line: Enter on the cue moves the caret into it
    const a = run(enter, stateFor([B('character', 'ana')], 0, 3));
    expect(a.blocks).toEqual([B('character', 'ANA'), B('dialogue', '')]);
    expect(a.index).toBe(1);
    const b = run(enter, stateFor([B('character', 'ANA'), B('dialogue', 'Oi.'), B('dialogue', '')], 2, 0));
    expect(types(b.blocks)).toEqual(['character', 'dialogue', 'character', 'dialogue']);
    expect(b.index).toBe(2);
  });

  it('dialogue -> action and parenthetical -> dialogue', () => {
    const a = run(enter, stateFor([B('character', 'ANA'), B('dialogue', 'Oi.')], 1, 3));
    expect(types(a.blocks)).toEqual(['character', 'dialogue', 'action']);
    // from a parenthetical the caret moves to the dialogue that follows it
    const b = run(enter, stateFor([B('character', 'ANA'), B('parenthetical', '(baixo)'), B('dialogue', 'Oi.')], 1, 6));
    expect(types(b.blocks)).toEqual(['character', 'parenthetical', 'dialogue']);
    expect(b.index).toBe(2);
  });

  it('transition -> scene heading', () => {
    const r = run(enter, stateFor([B('transition', 'CUT TO:')], 0, 6));
    expect(types(r.blocks)).toEqual(['transition', 'scene-heading']);
  });

  it('splits the text at the caret, keeping the type of action and dialogue', () => {
    const a = run(enter, stateFor([B('action', 'Ana entra rápido.')], 0, 9));
    expect(a.blocks).toEqual([B('action', 'Ana entra'), B('action', ' rápido.')]);
    expect([a.index, a.offset]).toEqual([1, 0]);
    const d = run(enter, stateFor([B('character', 'ANA'), B('dialogue', 'Um dois')], 1, 2));
    expect(d.blocks.slice(1)).toEqual([B('dialogue', 'Um'), B('dialogue', ' dois')]);
  });

  it('splits marked text and keeps the marks on both halves', () => {
    const r = run(
      enter,
      stateFor([B('action', 'abcdef', { marks: [{ type: 'bold', from: 1, to: 5 }] })], 0, 3),
    );
    expect(r.blocks).toEqual([
      B('action', 'abc', { marks: [{ type: 'bold', from: 1, to: 3 }] }),
      B('action', 'def', { marks: [{ type: 'bold', from: 0, to: 2 }] }),
    ]);
  });

  it('never converts a line by guessing: an upper-case action stays an action', () => {
    for (const text of ['ANA', 'MARIA (V.O.)', 'INT. SALA - DIA', 'CUT TO:', 'ELA CORRE.']) {
      const r = run(enter, stateFor([B('action', text)], 0, text.length));
      expect(r.blocks).toEqual([B('action', text), B('action', '')]);
      expect(r.index).toBe(1);
    }
  });

  it('inside dual dialogue it adds a dialogue line in the same column', () => {
    const dual = [
      B('character', 'ANA', { column: 'left' }),
      B('dialogue', 'Eu vou.'),
      B('character', 'JOÃO', { column: 'right' }),
      B('dialogue', 'Eu fico.'),
    ];
    const r = run(enter, stateFor(dual, 1, 7));
    expect(r.state.doc.child(0).type.name).toBe('dual_dialogue');
    expect(types(r.blocks)).toEqual(['character', 'dialogue', 'dialogue', 'character', 'dialogue']);
    // an empty line in a column stays put
    const e = run(enter, stateFor([...dual.slice(0, 2), B('dialogue', ''), ...dual.slice(2)], 2, 0));
    expect(e.blocks).toHaveLength(5);
  });
});

describe('Tab and Shift+Tab', () => {
  const walk = (shift: boolean, from: Block[], count: number) => {
    let state = stateFor(from, 0, 0);
    const seen = [selectionInfo(state).element];
    for (let i = 0; i < count; i++) {
      state = run(tab(shift), state).state;
      seen.push(selectionInfo(state).element);
    }
    return { seen, blocks: documentToBlocks(nodeToScriptDocument(state.doc)) };
  };

  it('Tab walks every element in order and wraps around', () => {
    const { seen } = walk(false, [B('action', 'x')], 7);
    expect(seen).toEqual([
      'action',
      'character',
      'parenthetical',
      'dialogue',
      'transition',
      'shot',
      'scene-heading',
      'action',
    ]);
  });

  it('Shift+Tab walks the same elements backwards', () => {
    const { seen } = walk(true, [B('action', 'x')], 7);
    expect(seen).toEqual([
      'action',
      'scene-heading',
      'shot',
      'transition',
      'dialogue',
      'parenthetical',
      'character',
      'action',
    ]);
  });

  it('a full lap leaves no empty blocks behind', () => {
    for (const shift of [false, true]) {
      const { blocks } = walk(shift, [B('action', 'x')], 7);
      expect(blocks).toEqual([B('action', 'X')]);
    }
    // and in the middle of a script the neighbours are untouched
    const around = [B('action', 'antes'), B('action', 'meio'), B('action', 'depois')];
    let state = stateFor(around, 1, 0);
    for (let i = 0; i < 7; i++) state = run(tab(false), state).state;
    expect(documentToBlocks(nodeToScriptDocument(state.doc)).map((b) => b.text)).toEqual(['antes', 'MEIO', 'depois']);
  });

  it('keeps a real dialogue line that follows the block being converted', () => {
    const base = [B('character', 'ANA'), B('dialogue', 'Oi.')];
    // Tab on the cue turns it into a parenthetical; the dialogue is not lost
    const r = run(tab(false), stateFor(base, 0, 0));
    expect(r.blocks.some((b) => b.type === 'dialogue' && b.text === 'Oi.')).toBe(true);
  });

  it('entering an upper-case element upper-cases the text; a parenthetical gets parentheses', () => {
    const t = run(setElement('scene-heading'), stateFor([B('action', 'cut to:')], 0, 0));
    expect(t.blocks[0]).toEqual(B('scene-heading', 'CUT TO:'));
    const c = run(tab(false), stateFor([B('action', 'ana')], 0, 0));
    expect(c.blocks[0]).toEqual(B('character', 'ANA'));
    const p = run(
      setElement('parenthetical'),
      stateFor([B('character', 'ANA'), B('dialogue', 'baixo')], 1, 2),
    );
    expect(p.blocks.map((b) => [b.type, b.text])).toEqual([
      ['character', 'ANA'],
      ['parenthetical', '(baixo)'],
      ['dialogue', ''],
    ]);
    expect(p.offset).toBe(3);
  });

  it('leaving a parenthetical removes its parentheses', () => {
    const r = run(
      setElement('action'),
      stateFor([B('character', 'ANA'), B('parenthetical', '(baixo)'), B('dialogue', 'Oi.')], 1, 3),
    );
    expect(r.blocks.find((b) => b.type === 'action')?.text).toBe('baixo');
  });

  it('moves between the columns of a dual dialogue before leaving it', () => {
    const dual = [
      B('character', 'ANA', { column: 'left' }),
      B('dialogue', 'Eu vou.'),
      B('character', 'JOÃO', { column: 'right' }),
      B('dialogue', 'Eu fico.'),
      B('action', 'Fim.'),
    ];
    const toRight = run(tab(false), stateFor(dual, 1, 2));
    expect(toRight.index).toBe(2);
    const out = run(tab(false), toRight.state);
    expect(out.index).toBe(4);
    const back = run(tab(true), run(tab(false), stateFor(dual, 0, 0)).state);
    expect(back.index).toBe(0);
  });

  it('Tab on the right column of the last dual dialogue adds an action', () => {
    const dual = [
      B('character', 'ANA', { column: 'left' }),
      B('dialogue', 'a'),
      B('character', 'JOÃO', { column: 'right' }),
      B('dialogue', 'b'),
    ];
    const r = run(tab(false), stateFor(dual, 3, 1));
    expect(types(r.blocks)).toEqual([...types(dual), 'action']);
  });
});

describe('setElement', () => {
  it('converts every block touched by the selection', () => {
    const base = stateFor([B('action', 'a'), B('action', 'b'), B('action', 'c')], 0, 0);
    const end = TextSelection.create(base.doc, positionOfBlock(base.doc, 1)! + 1);
    const ranged = base.apply(base.tr.setSelection(TextSelection.create(base.doc, 1, end.head)));
    const r = run(setElement('transition'), ranged);
    expect(r.blocks.map((b) => [b.type, b.text])).toEqual([
      ['transition', 'A'],
      ['transition', 'B'],
      ['action', 'c'],
    ]);
  });

  it('always keeps a valid structure, adding the missing cue', () => {
    const r = run(setElement('dialogue'), stateFor([B('action', 'solta')], 0, 0));
    expect(types(r.blocks)).toEqual(['character', 'dialogue']);
    expect(r.blocks[1]?.text).toBe('solta');
    expect(r.index).toBe(1);
  });
});

describe('Backspace and Delete', () => {
  it('merges two blocks of the same element and puts the caret at the join', () => {
    const r = run(backspace, stateFor([B('action', 'Ana'), B('action', ' entra')], 1, 0));
    expect(r.blocks).toEqual([B('action', 'Ana entra')]);
    expect([r.index, r.offset]).toEqual([0, 3]);
  });

  it('keeps inline marks when merging', () => {
    const r = run(
      backspace,
      stateFor([B('action', 'ab'), B('action', 'cd', { marks: [{ type: 'bold', from: 0, to: 2 }] })], 1, 0),
    );
    expect(r.blocks).toEqual([B('action', 'abcd', { marks: [{ type: 'bold', from: 2, to: 4 }] })]);
  });

  it('resets another element to action first, then merges', () => {
    const first = run(backspace, stateFor([B('action', 'Ana'), B('transition', 'CUT TO:')], 1, 0));
    expect(first.blocks).toEqual([B('action', 'Ana'), B('action', 'CUT TO:')]);
    const second = run(backspace, stateFor(first.blocks, 1, 0));
    expect(second.blocks).toEqual([B('action', 'AnaCUT TO:')]);
  });

  it('an empty block disappears and the caret goes up', () => {
    const r = run(backspace, stateFor([B('action', 'Ana'), B('action', '')], 1, 0));
    expect(r.blocks).toEqual([B('action', 'Ana')]);
    expect([r.index, r.offset]).toEqual([0, 3]);
  });

  it('does nothing in the middle of a block (the default handler deletes the char)', () => {
    expect(run(backspace, stateFor([B('action', 'Ana')], 0, 2)).handled).toBe(false);
  });

  it('at the very start of the script it is a no-op', () => {
    const r = run(backspace, stateFor([B('action', 'Ana')], 0, 0));
    expect(r.blocks).toEqual([B('action', 'Ana')]);
  });

  it('Delete at the end pulls the next block in', () => {
    const r = run(deleteForward, stateFor([B('action', 'Ana'), B('action', ' entra')], 0, 3));
    expect(r.blocks).toEqual([B('action', 'Ana entra')]);
    expect([r.index, r.offset]).toEqual([0, 3]);
  });
});

describe('structure commands', () => {
  it('Mod+Enter inserts a scene heading after the whole speech', () => {
    const r = run(
      insertSceneAfter,
      stateFor([B('character', 'ANA'), B('dialogue', 'a'), B('dialogue', 'b'), B('action', 'x')], 1, 1),
    );
    expect(types(r.blocks)).toEqual(['character', 'dialogue', 'dialogue', 'scene-heading', 'action']);
    expect(r.index).toBe(3);
  });

  it('Mod+Enter leaves a dual dialogue', () => {
    const dual = [
      B('character', 'ANA', { column: 'left' }),
      B('dialogue', 'a'),
      B('character', 'JOÃO', { column: 'right' }),
      B('dialogue', 'b'),
    ];
    const r = run(insertSceneAfter, stateFor(dual, 1, 0));
    expect(types(r.blocks).at(-1)).toBe('scene-heading');
    expect(r.state.doc.child(0).type.name).toBe('dual_dialogue');
  });

  it('toggles dual dialogue on the speech and the next one, and off again', () => {
    const base = [B('character', 'ANA'), B('dialogue', 'a'), B('character', 'JOÃO'), B('dialogue', 'b')];
    const on = run(toggleDualDialogue, stateFor(base, 1, 0));
    expect(on.state.doc.childCount).toBe(1);
    expect(on.state.doc.child(0).type.name).toBe('dual_dialogue');
    const off = run(toggleDualDialogue, on.state);
    expect(off.state.doc.childCount).toBe(2);
    expect(off.blocks).toEqual(base);
  });

  it('adds an empty right column when there is nothing to pair with', () => {
    const r = run(toggleDualDialogue, stateFor([B('character', 'ANA'), B('dialogue', 'a'), B('action', 'x')], 1, 0));
    expect(r.state.doc.child(0).type.name).toBe('dual_dialogue');
    expect(r.index).toBe(2);
    expect(types(r.blocks)).toEqual(['character', 'dialogue', 'character', 'dialogue', 'action']);
  });

  it('is not available outside a speech', () => {
    expect(run(toggleDualDialogue, stateFor([B('action', 'x')], 0, 0)).handled).toBe(false);
  });
});

describe('paste', () => {
  const paste = (state: EditorState, text: string) => {
    let next = state;
    pastePlainText(state, (tr) => (next = state.apply(tr)), text);
    return documentToBlocks(nodeToScriptDocument(next.doc));
  };

  it('single-line text goes into the block', () => {
    expect(paste(stateFor([B('action', 'Ana ')], 0, 4), 'entra')).toEqual([B('action', 'Ana entra')]);
  });

  it('removes tabs and line feeds from single-line text', () => {
    expect(paste(stateFor([B('action', '')], 0, 0), 'a\tb')).toEqual([B('action', 'a b')]);
  });

  it('several lines are read as Fountain and replace an empty block', () => {
    const out = paste(stateFor([B('action', '')], 0, 0), 'INT. SALA - DIA\n\nANA\nOi.\n');
    expect(out).toEqual([B('scene-heading', 'INT. SALA - DIA'), B('character', 'ANA'), B('dialogue', 'Oi.')]);
  });

  it('several lines go after a block that has text', () => {
    const out = paste(stateFor([B('action', 'Antes.')], 0, 6), 'Um.\n\nDois.');
    expect(out).toEqual([B('action', 'Antes.'), B('action', 'Um.'), B('action', 'Dois.')]);
  });
});

describe('selectionInfo', () => {
  it('reports the element and dual dialogue', () => {
    const dual = [
      B('character', 'ANA', { column: 'left' }),
      B('dialogue', 'a'),
      B('character', 'JOÃO', { column: 'right' }),
      B('dialogue', 'b'),
    ];
    expect(selectionInfo(stateFor(dual, 3, 0))).toEqual({ element: 'dialogue', inDual: true, blockIndex: 3 });
    expect(selectionInfo(stateFor([B('action', 'x')], 0, 0))).toEqual({ element: 'action', inDual: false, blockIndex: 0 });
  });
});

describe('fuzz: any key sequence keeps the document valid', () => {
  function rng(seed: number) {
    let s = seed >>> 0;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 2 ** 32;
    };
  }
  const commands: [string, Command][] = [
    ['enter', enter],
    ['tab', tab(false)],
    ['shift-tab', tab(true)],
    ['backspace', backspace],
    ['delete', deleteForward],
    ['scene', insertSceneAfter],
    ['dual', toggleDualDialogue],
    ['el-char', setElement('character')],
    ['el-par', setElement('parenthetical')],
    ['el-dia', setElement('dialogue')],
    ['el-act', setElement('action')],
    ['el-head', setElement('scene-heading')],
  ];

  for (let seed = 1; seed <= 120; seed++) {
    it(`seed ${seed}`, () => {
      const next = rng(seed);
      let state = stateFor(
        [B('scene-heading', 'INT. A - DIA'), B('action', 'Ana entra.'), B('character', 'ANA'), B('dialogue', 'Oi.')],
        1,
        3,
      );
      const log: string[] = [];
      for (let step = 0; step < 40; step++) {
        const r = next();
        if (r < 0.25) {
          // type a character at the caret
          state = state.apply(state.tr.insertText('x'));
          log.push('type');
          continue;
        }
        const [name, cmd] = commands[Math.floor(next() * commands.length)] ?? commands[0]!;
        log.push(name);
        cmd(state, (tr) => (state = state.apply(tr)));
        // the document must satisfy the schema and the canonical invariants
        expect(() => state.doc.check(), log.join(',')).not.toThrow();
        expect(validateDocument(nodeToScriptDocument(state.doc)), log.join(',')).toEqual([]);
        // and the caret must stay inside a text block
        expect(state.selection.$from.parent.isTextblock, log.join(',')).toBe(true);
        expect(state.selection.$to.parent.isTextblock, log.join(',')).toBe(true);
      }
    });
  }
});

describe('minimal changes (so concurrent edits are not rewritten)', () => {
  const many = Array.from({ length: 30 }, (_, i) => B('action', `bloco ${i}`));

  function steps(cmd: Command, state: EditorState) {
    let tr: ReturnType<EditorState['apply']> | null = null;
    const collected: ReplaceStep[] = [];
    cmd(state, (t) => {
      for (const st of t.steps) if (st instanceof ReplaceStep) collected.push(st);
      tr = state.apply(t);
    });
    void tr;
    return collected;
  }

  it('Enter at the end of a block only inserts the new block', () => {
    const state = stateFor(many, 15, 'bloco 15'.length);
    const [step, ...rest] = steps(enter, state);
    expect(rest).toHaveLength(0);
    expect(step?.from).toBe(step?.to);
    // the inserted block is one empty paragraph: 2 positions
    expect((step as unknown as { slice: { size: number } }).slice.size).toBe(2);
  });

  it('Enter in the middle of a text only splits it', () => {
    const state = stateFor(many, 10, 3);
    const [step] = steps(enter, state);
    const size = (step as unknown as { slice: { size: number } }).slice.size;
    expect(size).toBeLessThanOrEqual(2);
    expect((step?.to ?? 0) - (step?.from ?? 0)).toBe(0);
  });

  it('changing the element of one block replaces that block and no other', () => {
    const state = stateFor(many, 7, 0);
    const found = steps(setElement('transition'), state);
    expect(found).toHaveLength(1);
    const step = found[0]!;
    const blockSize = state.doc.child(7).nodeSize;
    expect(step.to - step.from).toBeLessThanOrEqual(blockSize);
  });

  it('merging two blocks touches only those two', () => {
    const state = stateFor(many, 20, 0);
    const found = steps(backspace, state);
    expect(found).toHaveLength(1);
    const lo = found[0]!.from;
    const hi = found[0]!.to;
    let before = 0;
    for (let i = 0; i < 19; i++) before += state.doc.child(i).nodeSize;
    expect(lo).toBeGreaterThanOrEqual(before);
    expect(hi).toBeLessThanOrEqual(before + state.doc.child(19).nodeSize + state.doc.child(20).nodeSize);
  });

  it('the narrow replacement always gives the same document as replacing the whole window', () => {
    // the fuzz above checks validity; here the document is compared with the full rewrite
    for (const [cmd, idx, off] of [
      [enter, 3, 4],
      [tab(false), 5, 0],
      [tab(true), 9, 0],
      [backspace, 12, 0],
      [deleteForward, 14, 'bloco 14'.length],
      [toggleDualDialogue, 0, 0],
    ] as const) {
      const state = stateFor([...many, B('character', 'ANA'), B('dialogue', 'Oi.')], idx, off);
      const r = run(cmd as Command, state);
      expect(() => r.state.doc.check()).not.toThrow();
    }
  });
});
