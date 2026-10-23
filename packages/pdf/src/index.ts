import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import type { Page } from '@freex/layout';
import { CPI, LPI, PAGE, PROFILE_VERSION } from '@freex/screenplay';

const FONT_FILES = {
  normal: 'CourierPrime-Regular.ttf',
  bold: 'CourierPrime-Bold.ttf',
} as const;

function fontFace(weight: 'normal' | 'bold'): string {
  const file = fileURLToPath(new URL(`../fonts/${FONT_FILES[weight]}`, import.meta.url));
  const b64 = readFileSync(file).toString('base64');
  return `@font-face{font-family:'Courier Prime';font-weight:${weight};src:url(data:font/ttf;base64,${b64}) format('truetype');}`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Renders pre-paginated pages to HTML. Every line is absolutely positioned on the
 * canonical grid, so the browser never decides line or page breaks.
 * Page 1 has no number; later pages show "N." at the top right, 0.5 in from the top.
 */
export function renderHtml(pages: readonly Page[]): string {
  const rowIn = 1 / LPI;
  const colIn = 1 / CPI;
  const body = pages
    .map((p) => {
      const lines = p.lines
        .map((l, row) =>
          l.text === ''
            ? ''
            : `<div class="l" style="top:${(PAGE.marginTopIn + row * rowIn).toFixed(4)}in;left:${(PAGE.marginLeftIn + l.col * colIn).toFixed(4)}in">${esc(l.text)}</div>`,
        )
        .join('');
      const num =
        p.number > 1 ? `<div class="n" style="top:0.5in;right:${PAGE.marginRightIn}in">${p.number}.</div>` : '';
      return `<section class="p">${num}${lines}</section>`;
    })
    .join('');

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>FREEX</title><meta name="freex-profile-version" content="${PROFILE_VERSION}"><style>
${fontFace('normal')}
${fontFace('bold')}
@page{size:${PAGE.widthIn}in ${PAGE.heightIn}in;margin:0}
html,body{margin:0;padding:0}
.p{position:relative;width:${PAGE.widthIn}in;height:${PAGE.heightIn}in;overflow:hidden;break-after:page;page-break-after:always}
.l,.n{position:absolute;font-family:'Courier Prime',monospace;font-size:12pt;line-height:${rowIn}in;height:${rowIn}in;white-space:pre;margin:0;padding:0;letter-spacing:0;font-kerning:none;hyphens:none;text-align:left}
.n{text-align:right}
</style></head><body>${body}</body></html>`;
}

/** Renders pages to a PDF with Chromium. The PDF does not recompute breaks. */
export async function renderPdf(pages: readonly Page[]): Promise<Buffer> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(renderHtml(pages), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    return await page.pdf({
      width: `${PAGE.widthIn}in`,
      height: `${PAGE.heightIn}in`,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
  } finally {
    await browser.close();
  }
}
