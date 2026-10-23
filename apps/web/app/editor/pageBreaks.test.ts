import { describe, expect, it } from 'vitest';
import { EditorState } from 'prosemirror-state';
import { paginate } from '@freex/layout';
import {
  blocksToDocument,
  scriptDocumentToNode,
  type Block,
} from '@freex/screenplay';
import {
  MARGIN_BOTTOM_PX,
  ROW_PX,
  SHEET_GAP_PX,
  buildPageDecorations,
  pageBreaks,
  pageDecorations,
  pageDecorationsKey,
  pageEndPx,
  resolveBreak,
} from './pageBreaks';

const words = (n: number, w = 'palavra') => Array(n).fill(w).join(' ');
const docOf = (blocks: Block[]) => scriptDocumentToNode(blocksToDocument(blocks));

describe('pageBreaks', () => {
  it('a one-page script has none', () => {
    expect(pageBreaks(paginate([{ type: 'action', text: 'Ana entra.' }]))).toEqual([]);
  });

  it('a page that starts at a block says which block and the printed number', () => {
    const blocks: Block[] = [
      { type: 'action', text: words(54 * 7, 'x'.repeat(8)) }, // far more than a page of action
      { type: 'action', text: 'Fim.' },
    ];
    const breaks = pageBreaks(paginate(blocks));
    expect(breaks.length).toBeGreaterThan(0);
    expect(breaks[0]).toMatchObject({ page: 2, printedNumber: 2, block: 0, more: false, contd: [] });
    // an action split between pages continues inside the block
    expect(breaks[0]?.from).toBeGreaterThan(0);
  });

  it('a split speech has (MORE) before the break and a (CONT\'D) cue after it', () => {
    const blocks: Block[] = [
      { type: 'action', text: words(10, 'x'.repeat(59)) },
      { type: 'character', text: 'ANA (V.O.)' },
      { type: 'dialogue', text: words(70, 'y'.repeat(34)) },
    ];
    const [first] = pageBreaks(paginate(blocks));
    expect(first?.more).toBe(true);
    expect(first?.contd).toEqual([{ text: "ANA (V.O.) (CONT'D)", col: 22 }]);
    expect(first?.block).toBe(2);
    expect(first?.from).toBeGreaterThan(0);
  });

  it('the previous page rows include (MORE)', () => {
    const blocks: Block[] = [
      { type: 'character', text: 'ANA' },
      { type: 'dialogue', text: words(150, 'y'.repeat(34)) },
    ];
    const pages = paginate(blocks);
    const [first] = pageBreaks(pages);
    expect(first?.prevRows).toBe(pages[0]?.rows);
  });
});

describe('page end height', () => {
  it('a full page between blocks only needs the bottom margin minus the gap row', () => {
    expect(pageEndPx(54, true)).toBe(MARGIN_BOTTOM_PX - ROW_PX);
    expect(pageEndPx(54, false)).toBe(MARGIN_BOTTOM_PX);
  });

  it('the rows left on the page are added to the margin', () => {
    expect(pageEndPx(50, false)).toBe(4 * ROW_PX + MARGIN_BOTTOM_PX);
    expect(pageEndPx(40, true)).toBe(14 * ROW_PX - ROW_PX + MARGIN_BOTTOM_PX);
  });

  it('is never negative', () => {
    for (let rows = 0; rows <= 54; rows++) {
      expect(pageEndPx(rows, true)).toBeGreaterThan(0);
      expect(pageEndPx(rows, false)).toBeGreaterThan(0);
    }
    expect(SHEET_GAP_PX).toBe(32);
  });
});

describe('resolveBreak', () => {
  const blocks: Block[] = [
    { type: 'action', text: 'um dois três' },
    { type: 'character', text: 'ANA' },
    { type: 'parenthetical', text: '(baixo)' },
    { type: 'dialogue', text: 'Oi, tudo bem?' },
    { type: 'transition', text: 'CUT TO:' },
  ];
  const doc = docOf(blocks);
  const spec = (block: number, from: number) => ({
    page: 2,
    printedNumber: 2,
    block,
    from,
    prevRows: 10,
    more: false,
    contd: [],
  });

  it('a break at the start of a top-level block goes between top-level nodes', () => {
    const r = resolveBreak(doc, spec(0, 0));
    expect(r).toMatchObject({ pos: 0, between: true });
    // before the speech node, not inside it
    const cue = resolveBreak(doc, spec(1, 0));
    expect(cue?.between).toBe(true);
    expect(doc.resolve(cue?.pos ?? 0).depth).toBe(0);
    const last = resolveBreak(doc, spec(4, 0));
    expect(last?.between).toBe(true);
    expect(doc.resolve(last?.pos ?? 0).depth).toBe(0);
  });

  it('a break inside a text goes at that offset', () => {
    const r = resolveBreak(doc, spec(0, 3));
    expect(r?.between).toBe(false);
    expect(doc.textBetween(0, r?.pos ?? 0)).toBe('um ');
    // the inset is the paper margin plus the element indent: an action has none
    expect(r?.insetPx).toBe(144);
    const d = resolveBreak(doc, spec(3, 3));
    expect(d?.insetPx).toBe(144 + 10 * 9.6);
  });

  it('a break before a block inside a speech stays inside the speech', () => {
    const r = resolveBreak(doc, spec(3, 0)); // the dialogue after the parenthetical
    expect(r?.between).toBe(false);
    expect(doc.resolve(r?.pos ?? 0).parent.type.name).toBe('speech');
  });

  it('a block that no longer exists is ignored', () => {
    expect(resolveBreak(doc, spec(99, 0))).toBeNull();
  });
});

describe('page decorations plugin', () => {
  const blocks: Block[] = [
    { type: 'action', text: words(54 * 7, 'x'.repeat(8)) },
    { type: 'action', text: 'Fim.' },
  ];
  const pages = paginate(blocks);
  const doc = docOf(blocks);
  const state = EditorState.create({ doc, plugins: [pageDecorations] });
  const input = { pages, titlePage: null, onOpenCover: () => undefined };

  it('has the first top margin, one widget per break and the end of the last page', () => {
    const set = buildPageDecorations(doc, input);
    const found = set.find().sort((a, b) => a.from - b.from);
    expect(found).toHaveLength(pageBreaks(pages).length + 2);
    expect(found[0]?.from).toBe(0);
    expect(found.at(-1)?.from).toBe(doc.content.size);
  });

  it('keeps the widgets when the text is edited and moves them with the text', () => {
    const set = buildPageDecorations(doc, input);
    const withDecos = state.apply(state.tr.setMeta(pageDecorationsKey, set));
    const positions = (st: EditorState) =>
      (pageDecorationsKey.getState(st)?.find() ?? []).map((d) => d.from).sort((a, b) => a - b);
    const before = positions(withDecos);
    const typed = withDecos.apply(withDecos.tr.insertText('ZZZ', 1));
    const after = positions(typed);
    expect(after).toHaveLength(before.length);
    // widgets after the insertion shifted by its length, the one at the start did not
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBe((before[1] ?? 0) + 3);
  });

  it('a cover changes the first widget key only', () => {
    const byPos = (set: ReturnType<typeof buildPageDecorations>) => set.find().sort((a, b) => a.from - b.from);
    const plain = byPos(buildPageDecorations(doc, input));
    const covered = byPos(buildPageDecorations(doc, { ...input, titlePage: { title: 'Casa', authors: ['Ana'] } }));
    expect(covered).toHaveLength(plain.length);
    expect((covered[0]?.spec as { key: string }).key).not.toBe((plain[0]?.spec as { key: string }).key);
    expect((covered[1]?.spec as { key: string }).key).toBe((plain[1]?.spec as { key: string }).key);
  });
});
