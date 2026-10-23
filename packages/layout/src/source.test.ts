import { describe, expect, it } from 'vitest';
import type { Block } from '@freex/screenplay';
import { paginate } from './index';

const words = (n: number, w = 'palavra') => Array(n).fill(w).join(' ');

describe('line source', () => {
  it('every line says which block it came from and where in the text it starts', () => {
    const blocks: Block[] = [
      { type: 'scene-heading', text: 'int. sala - dia' },
      { type: 'action', text: words(30) },
      { type: 'character', text: 'ANA' },
      { type: 'parenthetical', text: '(baixo)' },
      { type: 'dialogue', text: words(20) },
    ];
    const lines = paginate(blocks).flatMap((p) => p.lines);
    for (const l of lines) {
      expect(l.block).toBeDefined();
      const text = blocks[l.block ?? -1]?.text ?? '';
      const source = blocks[l.block ?? -1]?.type === 'scene-heading' ? text.toUpperCase() : text;
      const first = l.text.split(' ')[0] ?? '';
      expect(source.slice(l.from ?? 0).startsWith(first)).toBe(true);
    }
    // the second line of a wrapped paragraph starts after the first one
    const action = lines.filter((l) => l.block === 1);
    expect(action[0]?.from).toBe(0);
    expect(action.length).toBeGreaterThan(1);
    expect(action[1]?.from).toBeGreaterThan(0);
  });

  it('marks the (MORE) line and the (CONT\'D) cue as synthetic', () => {
    const blocks: Block[] = [
      { type: 'action', text: words(10, 'x'.repeat(59)) },
      { type: 'character', text: 'ANA' },
      { type: 'dialogue', text: words(70, 'y'.repeat(34)) },
    ];
    const pages = paginate(blocks);
    const more = pages.flatMap((p) => p.lines).filter((l) => l.synthetic === 'more');
    const contd = pages.flatMap((p) => p.lines).filter((l) => l.synthetic === 'contd');
    expect(more.length).toBeGreaterThan(0);
    expect(contd).toHaveLength(more.length);
    expect(more.every((l) => l.text === '(MORE)')).toBe(true);
    expect(contd.every((l) => l.text === "ANA (CONT'D)" && l.block === 1)).toBe(true);
    // the first real line after the cue says where the page break falls inside the dialogue
    const second = pages[1];
    const firstReal = second?.lines.find((l) => !l.synthetic);
    expect(firstReal?.block).toBe(2);
    expect(firstReal?.from).toBeGreaterThan(0);
  });

  it('the source fields do not change the hash of a layout', () => {
    // the golden test keeps the hash value; here, the same text gives the same lines either way
    const a = paginate([{ type: 'action', text: 'Ana entra.' }]);
    expect(a[0]?.lines[0]).toMatchObject({ block: 0, from: 0, text: 'Ana entra.' });
  });

  it('dual dialogue lines also point at their blocks', () => {
    const lines = paginate([
      { type: 'character', text: 'ANA', column: 'left' },
      { type: 'dialogue', text: 'Eu vou.' },
      { type: 'character', text: 'JOÃO', column: 'right' },
      { type: 'dialogue', text: 'Eu fico.' },
    ]).flatMap((p) => p.lines);
    expect(lines.map((l) => [l.text, l.block])).toEqual([
      ['ANA', 0],
      ['Eu vou.', 1],
      ['JOÃO', 2],
      ['Eu fico.', 3],
    ]);
  });
});
