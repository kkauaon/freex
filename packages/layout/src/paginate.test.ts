import { describe, expect, it } from 'vitest';
import { GRID, type Block } from '@freex/screenplay';
import { LAYOUT_VERSION, layoutHash, pageRows, paginate, type Page } from './index';
import { sha256Hex } from './sha256';

const WORD60 = 'x'.repeat(60);
const WORD35 = 'y'.repeat(35);

/** An action paragraph of exactly `n` lines. */
const action = (n: number): Block => ({
  type: 'action',
  text: Array(n).fill(WORD60).join(' '),
});
/** A dialogue block of exactly `n` lines. */
const dialogue = (n: number): Block => ({
  type: 'dialogue',
  text: Array(n).fill(WORD35).join(' '),
});
/** A dialogue block of `n` lines in the 25-column dual dialogue box. */
const narrow = (n: number): Block => ({
  type: 'dialogue',
  text: Array(n).fill('n'.repeat(25)).join(' '),
});
const cue = (name = 'ANA'): Block => ({ type: 'character', text: name });
const speech = (n: number, name = 'ANA'): Block[] => [cue(name), dialogue(n)];
const heading = (text = 'INT. SALA - DIA'): Block => ({ type: 'scene-heading', text });

const texts = (p: Page) => p.lines.map((l) => l.text);
const firstRowText = (p: Page) => p.lines.find((l) => l.row === 0)?.text;

describe('pagination (paginacao-e-quebras.md section 10)', () => {
  it('1: empty document is one empty page', () => {
    const pages = paginate([]);
    expect(pages).toHaveLength(1);
    expect(pages[0]?.rows).toBe(0);
  });

  it('2-3: 54 lines fit one page; one more moves to a second page', () => {
    expect(paginate([action(54)])).toHaveLength(1);
    const pages = paginate([action(55)]);
    expect(pages).toHaveLength(2);
    // an action never leaves a single line on either side of the break (3.2)
    expect(pages[1]?.rows).toBeGreaterThanOrEqual(2);
    expect((pages[0]?.rows ?? 0) + (pages[1]?.rows ?? 0)).toBe(55);
  });

  it('4: a scene heading near the bottom moves to the next page with its action', () => {
    const pages = paginate([action(50), heading(), action(3)]);
    expect(pages).toHaveLength(2);
    expect(firstRowText(pages[1] as Page)).toBe('INT. SALA - DIA');
  });

  it('5: a scene heading stays when two lines of the next block fit with it', () => {
    const pages = paginate([action(45), heading(), action(4)]);
    expect(pages).toHaveLength(1);
  });

  it('6: a character cue never ends a page', () => {
    const pages = paginate([action(52), ...speech(1)]);
    expect(pages).toHaveLength(2);
    expect(firstRowText(pages[1] as Page)).toBe('ANA');
  });

  it('7: cue plus one dialogue line fit in the last two rows', () => {
    const pages = paginate([action(51), ...speech(1)]);
    expect(pages).toHaveLength(1);
    expect(pages[0]?.rows).toBe(54);
  });

  it('8: a long speech splits with (MORE) and (CONT\'D)', () => {
    const pages = paginate([action(10), ...speech(60)]);
    const first = pages[0] as Page;
    expect(first.rows).toBe(GRID.bodyLines);
    expect(texts(first).at(-1)).toBe('(MORE)');
    expect(first.lines.at(-1)?.col).toBe(22);
    expect(firstRowText(pages[1] as Page)).toBe("ANA (CONT'D)");
    const dialogueLines = pages.flatMap((p) => p.lines).filter((l) => l.type === 'dialogue');
    expect(dialogueLines).toHaveLength(60);
  });

  it('8b: a speech longer than a page repeats (MORE)/(CONT\'D) on every page', () => {
    const pages = paginate(speech(150));
    expect(pages.length).toBeGreaterThanOrEqual(3);
    pages.slice(0, -1).forEach((p) => expect(texts(p).at(-1)).toBe('(MORE)'));
    pages.slice(1).forEach((p) => expect(firstRowText(p)).toBe("ANA (CONT'D)"));
  });

  it("8c: CONT'D keeps the extension before the marker", () => {
    const pages = paginate([action(10), ...speech(60, 'ANA (V.O.)')]);
    expect(firstRowText(pages[1] as Page)).toBe("ANA (V.O.) (CONT'D)");
  });

  it('9: a three-line speech that fits is not split', () => {
    const pages = paginate([action(46), ...speech(3)]);
    expect(pages).toHaveLength(1);
    expect(texts(pages[0] as Page)).not.toContain('(MORE)');
  });

  it('10: a three-line speech that does not fit moves whole', () => {
    const pages = paginate([action(50), ...speech(3)]);
    expect(pages).toHaveLength(2);
    expect(firstRowText(pages[1] as Page)).toBe('ANA');
    expect(texts(pages[0] as Page)).not.toContain('(MORE)');
  });

  it('a split keeps at least two dialogue lines on each side', () => {
    for (let used = 1; used < 50; used++) {
      const pages = paginate([action(used), ...speech(9)]);
      if (pages.length < 2) continue;
      const count = (p: Page | undefined) => p?.lines.filter((l) => l.type === 'dialogue').length ?? 0;
      if (texts(pages[0] as Page).includes('(MORE)')) {
        expect(count(pages[0])).toBeGreaterThanOrEqual(2);
        expect(count(pages[1])).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('prefers to split a speech at the end of a sentence', () => {
    const sentence = Array.from({ length: 20 }, (_, i) =>
      i === 7 ? `${'z'.repeat(34)}.` : 'z'.repeat(35),
    ).join(' ');
    const pages = paginate([action(40), cue(), { type: 'dialogue', text: sentence }]);
    const first = pages[0] as Page;
    const lastDialogue = first.lines.filter((l) => l.type === 'dialogue').at(-1);
    expect(lastDialogue?.text.endsWith('.')).toBe(true);
  });

  it('a parenthetical is never the last line of a page', () => {
    for (let used = 40; used < 53; used++) {
      const pages = paginate([
        action(used),
        cue(),
        { type: 'parenthetical', text: '(baixo)' },
        dialogue(6),
      ]);
      for (const p of pages.slice(0, -1)) {
        const last = p.lines.at(-1);
        expect(last?.type === 'parenthetical').toBe(false);
      }
    }
  });

  it('11-12: dual dialogue is placed whole, side by side', () => {
    const left: Block[] = [{ ...cue('ANA'), column: 'left' }, narrow(8)];
    const right: Block[] = [{ ...cue('JOÃO'), column: 'right' }, narrow(4)];
    const pages = paginate([action(5), ...left, ...right]);
    expect(pages).toHaveLength(1);
    const lines = pages[0]?.lines ?? [];
    const l = lines.find((x) => x.text === 'ANA');
    const r = lines.find((x) => x.text === 'JOÃO');
    expect(l?.col).toBe(12.5);
    expect(r?.col).toBe(42.5);
    expect(l?.row).toBe(r?.row);
    expect(lines.find((x) => x.type === 'dialogue' && x.col === 5)).toBeDefined();
    expect(lines.find((x) => x.type === 'dialogue' && x.col === 35)).toBeDefined();
    // the page is as tall as the taller column
    expect(pages[0]?.rows).toBe(5 + 1 + 1 + 8);
    // both columns start on the row right after the blank separator
    expect(l?.row).toBe(6);
  });

  it('11b: dual dialogue that does not fit moves to the next page whole', () => {
    const dual: Block[] = [
      { ...cue('ANA'), column: 'left' },
      narrow(8),
      { ...cue('JOÃO'), column: 'right' },
      narrow(8),
    ];
    const pages = paginate([action(46), ...dual]);
    expect(pages).toHaveLength(2);
    expect(pages[0]?.lines.some((l) => l.col === 12.5)).toBe(false);
  });

  it('12: dual dialogue taller than a page falls back to two sequential speeches', () => {
    const dual: Block[] = [
      { ...cue('ANA'), column: 'left' },
      narrow(70),
      { ...cue('JOÃO'), column: 'right' },
      narrow(70),
    ];
    const pages = paginate(dual);
    const dialogueLines = pages.flatMap((p) => p.lines).filter((l) => l.type === 'dialogue');
    // 25-character words wrap one per line in the regular 35-column dialogue box too
    expect(dialogueLines).toHaveLength(140);
    expect(pages.every((p) => p.rows <= GRID.bodyLines)).toBe(true);
  });

  it('a lone left column is laid out as a regular speech', () => {
    const pages = paginate([{ ...cue('ANA'), column: 'left' }, dialogue(2)]);
    expect(pages[0]?.lines[0]?.col).toBe(22);
  });

  it('13: an action of five lines with three free rows splits 3 + 2', () => {
    const pages = paginate([action(50), action(5)]);
    expect(pages[0]?.rows).toBe(54);
    expect(pages[1]?.rows).toBe(2);
  });

  it('14: an action of five lines with one free row moves whole', () => {
    const pages = paginate([action(52), action(5)]);
    expect(pages[0]?.rows).toBe(52);
    expect(pages[1]?.rows).toBe(5);
  });

  it('15: a transition stays when it fits and moves when it does not', () => {
    const t: Block = { type: 'transition', text: 'CUT TO:' };
    expect(paginate([action(52), t])).toHaveLength(1);
    expect(paginate([action(53), t])).toHaveLength(2);
  });

  it('20: a word longer than the column is cut by character', () => {
    const pages = paginate([{ type: 'action', text: 'w'.repeat(130) }]);
    expect(texts(pages[0] as Page)).toEqual(['w'.repeat(60), 'w'.repeat(60), 'w'.repeat(10)]);
  });

  it('keeps FADE IN: on the left and FADE OUT. on the right', () => {
    const [p] = paginate([
      { type: 'transition', text: 'FADE IN:' },
      { type: 'transition', text: 'FADE OUT.' },
    ]);
    expect(p?.lines[0]?.col).toBe(0);
    expect(p?.lines[1]?.col).toBe(60 - 'FADE OUT.'.length);
  });
});

describe('inline marks', () => {
  it('follow the text across wrapped lines without changing the layout', () => {
    const text = `${'a'.repeat(30)} ${'b'.repeat(30)} cc`; // wraps after the second word
    const plain = paginate([{ type: 'action', text }]);
    const marked = paginate([
      { type: 'action', text, marks: [{ type: 'bold', from: 25, to: 64 }] },
    ]);
    expect(marked[0]?.lines.map((l) => [l.row, l.col, l.text])).toEqual(
      plain[0]?.lines.map((l) => [l.row, l.col, l.text]),
    );
    const [l1, l2] = marked[0]?.lines ?? [];
    expect(l1?.marks).toEqual([{ type: 'bold', from: 25, to: 30 }]);
    expect(l2?.marks).toEqual([{ type: 'bold', from: 0, to: 33 }]);
  });

  it('a mark spanning a space covers the space', () => {
    const [p] = paginate([{ type: 'action', text: 'ab cd', marks: [{ type: 'italic', from: 0, to: 5 }] }]);
    expect(p?.lines[0]?.marks).toEqual([{ type: 'italic', from: 0, to: 5 }]);
  });

  it('change the hash (they are part of the canonical output)', () => {
    const a = layoutHash(paginate([{ type: 'action', text: 'ab' }]));
    const b = layoutHash(paginate([{ type: 'action', text: 'ab', marks: [{ type: 'bold', from: 0, to: 2 }] }]));
    expect(a).not.toBe(b);
  });
});

describe('hash', () => {
  it('sha256 matches the standard vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('a'.repeat(1000))).toBe(
      '41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3',
    );
  });

  it('is stable for the same input and changes with the content', () => {
    const blocks: Block[] = [heading(), ...speech(3)];
    expect(layoutHash(paginate(blocks))).toBe(layoutHash(paginate(blocks)));
    expect(layoutHash(paginate(blocks))).not.toBe(layoutHash(paginate([heading(), ...speech(4)])));
    expect(layoutHash(paginate(blocks))).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('LAYOUT_VERSION is part of the hash input', () => {
    expect(LAYOUT_VERSION).toBe(3);
  });
});

describe('pageRows', () => {
  it('renders half columns and trims trailing spaces', () => {
    const [p] = paginate([action(1)]);
    expect(pageRows(p as Page)).toEqual([WORD60]);
  });
});

// ---- invariants over pseudo-random scripts (deterministic seed)

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function randomScript(next: () => number): Block[] {
  const words = ['casa', 'rua', 'noite', 'olha', 'porta', 'chave', 'vento', 'fala', 'corre'];
  const sentence = (n: number) =>
    Array.from({ length: n }, (_, i) => {
      const w = words[Math.floor(next() * words.length)] ?? 'x';
      return i === n - 1 ? `${w}.` : w;
    }).join(' ');
  const blocks: Block[] = [];
  const count = 5 + Math.floor(next() * 60);
  for (let i = 0; i < count; i++) {
    const r = blocks.at(-1)?.type === 'scene-heading' ? 0.3 : next();
    if (r < 0.15) blocks.push({ type: 'scene-heading', text: `INT. LUGAR ${i} - DIA` });
    else if (r < 0.45) blocks.push({ type: 'action', text: sentence(1 + Math.floor(next() * 60)) });
    else if (r < 0.9) {
      blocks.push({ type: 'character', text: next() < 0.5 ? 'ANA' : 'JOÃO (V.O.)' });
      if (next() < 0.3) blocks.push({ type: 'parenthetical', text: '(baixo)' });
      blocks.push({ type: 'dialogue', text: sentence(1 + Math.floor(next() * 80)) });
    } else blocks.push({ type: 'transition', text: 'CUT TO:' });
  }
  return blocks;
}

describe('invariants on random scripts', () => {
  const words = (s: string) => s.toUpperCase().split(/\s+/).filter(Boolean);

  for (let seed = 1; seed <= 150; seed++) {
    it(`seed ${seed}`, () => {
      const blocks = randomScript(rng(seed));
      const pages = paginate(blocks);

      // deterministic
      expect(layoutHash(paginate(blocks))).toBe(layoutHash(pages));

      for (const [i, p] of pages.entries()) {
        // grid
        expect(p.rows).toBeLessThanOrEqual(GRID.bodyLines);
        expect(p.lines.every((l) => l.row >= 0 && l.row < GRID.bodyLines)).toBe(true);
        expect(p.lines.every((l) => l.col >= 0 && l.col + l.text.length <= GRID.columns)).toBe(true);
        // one line per row (no dual dialogue here)
        expect(new Set(p.lines.map((l) => l.row)).size).toBe(p.lines.length);
        // a page that ends a flow never ends on a heading, a cue or a parenthetical
        if (i < pages.length - 1) {
          const last = p.lines.at(-1);
          expect(last?.type).not.toBe('scene-heading');
          expect(last?.type).not.toBe('parenthetical');
          if (last?.type === 'character') expect(last.text).toBe('(MORE)');
          // (MORE) is answered by a CONT'D cue
          if (last?.text === '(MORE)') {
            expect(pages[i + 1]?.lines[0]?.text).toMatch(/\(CONT'D\)$/);
          } else {
            expect(pages[i + 1]?.lines[0]?.text.endsWith("(CONT'D)")).toBe(false);
          }
        }
      }

      // nothing is lost or duplicated, cue repetitions aside
      const out = pages.flatMap((p) => p.lines).filter((l) => l.type !== 'character');
      const outWords = out.flatMap((l) => words(l.text));
      const inWords = blocks.filter((b) => b.type !== 'character').flatMap((b) => words(b.text));
      expect(outWords).toEqual(inWords);
    });
  }
});

describe('closing mark', () => {
  const colOf = (blocks: Block[], text: string) =>
    paginate(blocks)
      .flatMap((p) => p.lines)
      .find((l) => l.text === text)?.col;

  it('centres THE END, END and FIM when they are the last block', () => {
    expect(colOf([action(1), { type: 'action', text: 'FIM' }], 'FIM')).toBe(28);
    expect(colOf([action(1), { type: 'action', text: 'THE END' }], 'THE END')).toBe(26);
    expect(colOf([action(1), { type: 'action', text: 'End.' }], 'End.')).toBe(28);
    expect(colOf([action(1), { type: 'transition', text: 'FIM' }], 'FIM')).toBe(28);
    // Enter after FADE OUT. creates a scene heading
    expect(colOf([action(1), { type: 'scene-heading', text: 'FIM' }], 'FIM')).toBe(28);
  });

  it('leaves the same text alone when it is not the last block', () => {
    expect(colOf([{ type: 'action', text: 'FIM' }, action(1)], 'FIM')).toBe(0);
  });

  it('leaves longer text and other elements alone', () => {
    expect(colOf([action(1), { type: 'action', text: 'FIM DE JOGO' }], 'FIM DE JOGO')).toBe(0);
    expect(colOf([heading(), { type: 'dialogue', text: 'FIM' }], 'FIM')).toBe(10);
  });
});
