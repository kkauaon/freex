import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import type { Line, Page } from '@freex/layout';
import { CPI, LPI, PAGE, PROFILE_VERSION } from '@freex/screenplay';

const FONT_FILES = {
  'normal normal': 'CourierPrime-Regular.ttf',
  'bold normal': 'CourierPrime-Bold.ttf',
  'normal italic': 'CourierPrime-Italic.ttf',
  'bold italic': 'CourierPrime-BoldItalic.ttf',
} as const;

function fontFace(key: keyof typeof FONT_FILES): string {
  const [weight, style] = key.split(' ');
  const file = fileURLToPath(new URL(`../fonts/${FONT_FILES[key]}`, import.meta.url));
  const b64 = readFileSync(file).toString('base64');
  return `@font-face{font-family:'Courier Prime';font-weight:${weight};font-style:${style};src:url(data:font/ttf;base64,${b64}) format('truetype');}`;
}

/** Splits a line into runs of uniform emphasis; marks never change the width. */
function renderRuns(text: string, marks: Line['marks']): string {
  if (!marks || marks.length === 0) return esc(text);
  const cuts = new Set([0, text.length]);
  for (const m of marks) {
    cuts.add(Math.max(0, m.from));
    cuts.add(Math.min(text.length, m.to));
  }
  const points = [...cuts].sort((a, b) => a - b);
  let out = '';
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i] ?? 0;
    const to = points[i + 1] ?? from;
    if (to <= from) continue;
    const on = (t: string) => marks.some((m) => m.type === t && m.from <= from && to <= m.to);
    let run = esc(text.slice(from, to));
    if (on('underline')) run = `<u>${run}</u>`;
    if (on('italic')) run = `<i>${run}</i>`;
    if (on('bold')) run = `<b>${run}</b>`;
    out += run;
  }
  return out;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Renders pre-paginated pages to HTML. Every line is absolutely positioned on the
 * canonical grid, so the browser never decides line or page breaks.
 * Pages show their `printedNumber` ("N.") at the top right, 0.5 in from the top; the title
 * page and script page 1 have none.
 */
export function renderHtml(pages: readonly Page[]): string {
  const rowIn = 1 / LPI;
  const colIn = 1 / CPI;
  const body = pages
    .map((p) => {
      const lines = p.lines
        .map((l) =>
          l.text === ''
            ? ''
            : `<div class="l" style="top:${(PAGE.marginTopIn + l.row * rowIn).toFixed(4)}in;left:${(PAGE.marginLeftIn + l.col * colIn).toFixed(4)}in">${renderRuns(l.text, l.marks)}</div>`,
        )
        .join('');
      const num =
        p.printedNumber !== null
          ? `<div class="n" style="top:0.5in;right:${PAGE.marginRightIn}in">${p.printedNumber}.</div>`
          : '';
      return `<section class="p">${num}${lines}</section>`;
    })
    .join('');

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>FREEX</title><meta name="freex-profile-version" content="${PROFILE_VERSION}"><style>
${fontFace('normal normal')}
${fontFace('bold normal')}
${fontFace('normal italic')}
${fontFace('bold italic')}
@page{size:${PAGE.widthIn}in ${PAGE.heightIn}in;margin:0}
html,body{margin:0;padding:0}
.p{position:relative;width:${PAGE.widthIn}in;height:${PAGE.heightIn}in;overflow:hidden;break-after:page;page-break-after:always}
.l,.n{position:absolute;font-family:'Courier Prime',monospace;font-size:12pt;line-height:${rowIn}in;height:${rowIn}in;white-space:pre;margin:0;padding:0;letter-spacing:0;font-kerning:none;hyphens:none;text-align:left}
.n{text-align:right}
b{font-weight:bold}i{font-style:italic}u{text-decoration:underline}
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
