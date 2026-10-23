import { describe, expect, it } from 'vitest';
import { CPI, ELEMENT_BOX, GRID, LPI, PAGE } from './constants';

describe('page profile', () => {
  it('text area is 6 x 9 in => 60 columns x 54 lines', () => {
    const w = PAGE.widthIn - PAGE.marginLeftIn - PAGE.marginRightIn;
    const h = PAGE.heightIn - PAGE.marginTopIn - PAGE.marginBottomIn;
    expect(w * CPI).toBe(GRID.columns);
    expect(h * LPI).toBe(GRID.bodyLines);
  });

  it('element boxes match the canonical geometry (inches from page edge)', () => {
    const edge = (i: number) => PAGE.marginLeftIn + i / CPI;
    expect(edge(ELEMENT_BOX.character.indent)).toBeCloseTo(3.7);
    expect(edge(ELEMENT_BOX.parenthetical.indent)).toBeCloseTo(3.1);
    expect(edge(ELEMENT_BOX.dialogue.indent)).toBeCloseTo(2.5);
    expect(ELEMENT_BOX.character.width / CPI).toBeCloseTo(2.2);
    expect(ELEMENT_BOX.parenthetical.width / CPI).toBeCloseTo(2.0);
    expect(ELEMENT_BOX.dialogue.width / CPI).toBeCloseTo(3.5);
  });
});
