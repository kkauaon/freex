import { describe, expect, it } from 'vitest';
import { layoutDocument, paginate } from '@freex/layout';
import type { Block } from '@freex/screenplay';
import { renderHtml, renderPdf } from './index';

const blocks: Block[] = Array.from({ length: 30 }, (_, i) => ({
  type: 'action' as const,
  text: `Cena de teste numero ${i} com texto suficiente para ocupar linhas. `.repeat(3),
}));

describe('renderHtml', () => {
  it('numbers pages from 2 and leaves page 1 unnumbered', () => {
    const pages = paginate(blocks);
    expect(pages.length).toBeGreaterThan(1);
    const html = renderHtml(pages);
    expect(html.match(/class="p"/g)?.length).toBe(pages.length);
    expect(html).toContain('>2.<');
    expect(html).not.toContain('>1.<');
  });

  it('escapes script text', () => {
    const html = renderHtml(paginate([{ type: 'action', text: '<b>&' }]));
    expect(html).toContain('&lt;b&gt;&amp;');
  });
});

describe('renderHtml: rows, emphasis and dual dialogue', () => {
  it('places a line by its row and renders marks as b, i and u', () => {
    const html = renderHtml(
      paginate([
        {
          type: 'action',
          text: 'ab cd ef',
          marks: [
            { type: 'bold', from: 0, to: 2 },
            { type: 'italic', from: 3, to: 5 },
            { type: 'underline', from: 6, to: 8 },
          ],
        },
      ]),
    );
    expect(html).toContain('<b>ab</b> <i>cd</i> <u>ef</u>');
    expect(html).toContain('top:1.0000in;left:1.5000in');
  });

  it('puts both dual dialogue columns on the same row, on half columns', () => {
    const html = renderHtml(
      paginate([
        { type: 'character', text: 'ANA', column: 'left' },
        { type: 'dialogue', text: 'Oi.' },
        { type: 'character', text: 'JOÃO', column: 'right' },
        { type: 'dialogue', text: 'Olá.' },
      ]),
    );
    const top = (name: string) => new RegExp(`top:([0-9.]+)in;left:([0-9.]+)in">${name}<`).exec(html);
    expect(top('ANA')?.[1]).toBe(top('JOÃO')?.[1]);
    expect(top('ANA')?.[2]).toBe((1.5 + 12.5 / 10).toFixed(4));
    expect(top('JOÃO')?.[2]).toBe((1.5 + 42.5 / 10).toFixed(4));
  });

  it("prints (MORE) and the CONT'D cue of a split speech", () => {
    const long: Block = { type: 'dialogue', text: Array(80).fill('y'.repeat(35)).join(' ') };
    const html = renderHtml(paginate([{ type: 'character', text: 'ANA' }, long]));
    expect(html).toContain('(MORE)');
    expect(html).toContain("ANA (CONT'D)");
  });
});

describe('renderHtml: title page and page range', () => {
  const page = (n: number): Block => ({ type: 'action', text: Array(n).fill('x'.repeat(60)).join(' ') });

  it('prints no number on the title page and keeps the script numbering', () => {
    const html = renderHtml(
      layoutDocument([page(54), page(10)], { titlePage: { title: 'Casa', authors: ['Ana'] } }),
    );
    expect(html.match(/class="p"/g)).toHaveLength(3);
    expect(html).toContain('>CASA<');
    expect(html.match(/class="n"/g)).toHaveLength(1);
    expect(html).toContain('>2.<');
  });

  it('does not renumber an exported range', () => {
    const html = renderHtml(layoutDocument([page(54), page(54), page(54)], { range: { from: 2, to: 3 } }));
    expect(html.match(/class="p"/g)).toHaveLength(2);
    expect(html).toContain('>2.<');
    expect(html).toContain('>3.<');
  });
});

describe('renderPdf', () => {
  it('produces a PDF with the same page count as the layout', async () => {
    const pages = paginate(blocks);
    const pdf = await renderPdf(pages);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const count = pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)?.length;
    expect(count).toBe(pages.length);
  }, 60_000);
});
