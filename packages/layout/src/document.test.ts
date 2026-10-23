import { describe, expect, it } from 'vitest';
import type { Block } from '@freex/screenplay';
import { layoutDocument, layoutHash, layoutTitlePage, pageRows, paginate } from './index';

const action = (n: number): Block => ({
  type: 'action',
  text: Array(n).fill('x'.repeat(60)).join(' '),
});
const CUT: Block = { type: 'transition', text: 'CUT TO:' };

describe('transition stays with the previous action (normas 3.2)', () => {
  it('takes the last two lines of the action to the next page when it does not fit', () => {
    // 53 rows used: the transition (blank + line) needs 2 and only 1 is left
    const pages = paginate([action(53), CUT]);
    expect(pages).toHaveLength(2);
    expect(pages[0]?.rows).toBe(51);
    const second = pages[1]!;
    expect(second.lines.map((l) => [l.row, l.text.slice(0, 4)])).toEqual([
      [0, 'xxxx'],
      [1, 'xxxx'],
      [3, 'CUT '],
    ]);
  });

  it('keeps every line of the action in order', () => {
    const pages = paginate([action(53), CUT]);
    const texts = pages.flatMap((p) => p.lines).map((l) => l.text);
    expect(texts.filter((t) => t.startsWith('x'))).toHaveLength(53);
    expect(texts.at(-1)).toBe('CUT TO:');
  });

  it('moves only the transition when the previous block cannot give up lines', () => {
    const pages = paginate([action(3), { type: 'scene-heading', text: 'INT. A - DIA' }, action(46), CUT]);
    const lastPage = pages.at(-1)!;
    expect(lastPage.lines.at(-1)?.text).toBe('CUT TO:');
    expect(pages.flatMap((p) => p.lines).filter((l) => l.text === 'CUT TO:')).toHaveLength(1);
  });

  it('does nothing when the transition fits', () => {
    expect(paginate([action(52), CUT])).toHaveLength(1);
  });
});

describe('printed page numbers', () => {
  it('script page 1 is not numbered; later pages print their logical number', () => {
    const pages = paginate([action(54), action(54), action(10)]);
    expect(pages.map((p) => p.printedNumber)).toEqual([null, 2, 3]);
    expect(pages.every((p) => p.kind === 'script')).toBe(true);
  });
});

describe('title page (normas-de-formatacao.md 6.2)', () => {
  const title = {
    title: 'O último andar',
    authors: ['Ana Silva'],
    contact: 'Ana Silva\nana@exemplo.com\n+55 11 99999-9999',
    date: '2026-10-23',
  };

  it('is centred on 4.5 in with the block top at 3.25 in', () => {
    const page = layoutTitlePage(title);
    expect(page.kind).toBe('title');
    expect(page.number).toBe(0);
    expect(page.printedNumber).toBeNull();
    const first = page.lines[0]!;
    expect(first.text).toBe('O ÚLTIMO ANDAR');
    // 3.25 in from the top = 1 in margin + 13.5 rows
    expect(first.row).toBe(13.5);
    // centre column 30 (4.5 in - 1.5 in margin)
    expect(first.col).toBe(30 - 7);
    expect(page.lines.find((l) => l.text === 'Written by')?.row).toBe(15.5);
    // the author is centred two rows below "Written by"; the contact line has the same text
    const author = page.lines.find((l) => l.text === 'Ana Silva' && l.col > 0);
    expect(author?.row).toBe(17.5);
  });

  it('puts the contact at the bottom left and the date at the bottom right on one baseline', () => {
    const page = layoutTitlePage(title);
    const date = page.lines.find((l) => l.text === 'Draft: 2026-10-23')!;
    const phone = page.lines.find((l) => l.text === '+55 11 99999-9999')!;
    expect(date.row).toBe(51);
    expect(phone.row).toBe(51);
    expect(phone.col).toBe(0);
    expect(date.col + date.text.length).toBe(60);
    expect(page.lines.find((l) => l.text === 'ana@exemplo.com')?.row).toBe(50);
  });

  it('is the first page of the document and does not shift script numbering', () => {
    const pages = layoutDocument([action(54), action(10)], { titlePage: title });
    expect(pages.map((p) => [p.kind, p.number, p.printedNumber])).toEqual([
      ['title', 0, null],
      ['script', 1, null],
      ['script', 2, 2],
    ]);
  });

  it('can be omitted', () => {
    const pages = layoutDocument([action(5)], { titlePage: title, includeTitle: false });
    expect(pages.map((p) => p.kind)).toEqual(['script']);
  });

  it('an empty title page does not crash', () => {
    expect(layoutTitlePage({ title: '', authors: [] }).lines).toEqual([]);
  });

  it('renders as text', () => {
    const rows = pageRows(layoutTitlePage(title));
    expect(rows.some((r) => r.trim() === 'O ÚLTIMO ANDAR')).toBe(true);
  });
});

describe('page range (FR-EXP-004)', () => {
  const blocks = [action(54), action(54), action(54), action(54), action(10)];

  it('keeps the selected pages with their original numbers', () => {
    const pages = layoutDocument(blocks, { range: { from: 2, to: 4 } });
    expect(pages.map((p) => [p.number, p.printedNumber])).toEqual([
      [2, 2],
      [3, 3],
      [4, 4],
    ]);
  });

  it('page content does not depend on the range', () => {
    const all = paginate(blocks);
    const some = layoutDocument(blocks, { range: { from: 3, to: 3 } });
    expect(layoutHash(some)).toBe(layoutHash([all[2]!]));
  });

  it('an empty selection yields no script pages', () => {
    expect(layoutDocument(blocks, { range: { from: 90, to: 99 } })).toEqual([]);
  });
});
