import { describe, expect, it } from 'vitest';
import { GRID, type Block } from '@freex/screenplay';
import { layoutBlock, paginate, wrap } from './index';

describe('wrap', () => {
  it('never exceeds width and never splits words', () => {
    const lines = wrap('um dois tres quatro cinco seis', 10);
    expect(lines.every((l) => l.length <= 10)).toBe(true);
    expect(lines.join(' ')).toBe('um dois tres quatro cinco seis');
  });
});

describe('layoutBlock', () => {
  it('uppercases scene headings and right-aligns transitions', () => {
    expect(layoutBlock({ type: 'scene-heading', text: 'int. sala - dia' })[0]?.text).toBe(
      'INT. SALA - DIA',
    );
    const t = layoutBlock({ type: 'transition', text: 'CORTA PARA:' })[0];
    expect(t && t.col + t.text.length).toBe(60);
  });
});

describe('paginate', () => {
  it('is deterministic and respects the 54-line grid', () => {
    const blocks: Block[] = Array.from({ length: 40 }, (_, i) => ({
      type: 'action' as const,
      text: `Linha de acao numero ${i} `.repeat(4),
    }));
    const a = paginate(blocks);
    expect(paginate(blocks)).toEqual(a);
    expect(a.length).toBeGreaterThan(1);
    expect(a.every((p) => p.lines.length <= GRID.bodyLines)).toBe(true);
  });
});
