import { describe, expect, it } from 'vitest';
import { paginate } from '@freex/layout';
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

describe('renderPdf', () => {
  it('produces a PDF with the same page count as the layout', async () => {
    const pages = paginate(blocks);
    const pdf = await renderPdf(pages);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const count = pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)?.length;
    expect(count).toBe(pages.length);
  }, 60_000);
});
