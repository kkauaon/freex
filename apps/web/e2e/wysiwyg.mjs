// End-to-end check that the editor is WYSIWYG: the sheets drawn by the editor have the same
// geometry the paginator computed, down to the 16 px row.
//
//   pnpm --filter @freex/web build && pnpm --filter @freex/web start   # in one terminal
//   pnpm --filter @freex/web e2e                                       # in another
//
// BASE_URL defaults to http://localhost:3000. Needs `pnpm exec playwright install chromium`.
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const ROW = 16; // 1/6 in at 96 px per inch
const SHEET_PLUS_GAP = 1056 + 32; // an 11 in sheet and the gap between sheets

const WORDS = ['casa', 'rua', 'noite', 'porta', 'chave', 'vento', 'ela', 'corre', 'olha', 'silêncio', 'mão'];
const sentence = (n, seed, every = 0) =>
  `${Array.from({ length: n }, (_, i) => {
    const w = WORDS[(seed * 7 + i * 3 + (i % 5)) % WORDS.length];
    return every && i % every === every - 1 ? `${w}.` : w;
  }).join(' ')}.`;

/** A script that exercises every way a page can end: between blocks, inside an action, inside a speech. */
function script() {
  const b = [];
  for (let s = 0; s < 6; s++) {
    b.push({ type: 'scene-heading', text: `INT. LUGAR ${s} - DIA` });
    b.push({ type: 'action', text: sentence(18 + s * 7, s) });
    for (let k = 0; k < 4; k++) {
      b.push({ type: 'character', text: k % 2 ? 'ANA' : 'JOÃO (V.O.)' });
      if (k === 1) b.push({ type: 'parenthetical', text: '(baixo)' });
      b.push({ type: 'dialogue', text: sentence(6 + ((s + k) % 4) * 14, s + k) });
      if (k === 2) b.push({ type: 'action', text: sentence(40, s + k) });
    }
    if (s === 2) {
      b.push({ type: 'character', text: 'ANA', column: 'left' });
      b.push({ type: 'dialogue', text: sentence(14, 3) });
      b.push({ type: 'character', text: 'JOÃO', column: 'right' });
      b.push({ type: 'dialogue', text: sentence(9, 4) });
    }
    if (s === 3) {
      b.push({ type: 'character', text: 'ANA (V.O.)' });
      b.push({ type: 'dialogue', text: sentence(700, 5, 13) });
    }
    b.push({ type: 'transition', text: 'CUT TO:' });
  }
  return b;
}

const COVER = { title: 'Casa Vazia', credit: '', authors: 'Ana Souza', source: '', contact: 'ana@exemplo.com', date: '2026-10-23' };

/** Runs in the page: measures the sheets in unzoomed px. */
function measure() {
  const pm = document.querySelector('.ProseMirror');
  const zoom = parseFloat(getComputedStyle(document.querySelector('.script-zoom')).zoom) || 1;
  const u = (v) => v / zoom;
  const tops = [...pm.querySelectorAll('.pb-top')].map((e) => u(e.getBoundingClientRect().bottom));
  const bottoms = [...pm.querySelectorAll('.pb-bottom:not(.pb-end)')].map((e) => u(e.getBoundingClientRect().top));
  const endEl = pm.querySelector('.pb-end');
  const end = endEl ? u(endEl.getBoundingClientRect().top) : Infinity;
  const zones = tops.map((top, i) => ({ top, limit: i < bottoms.length ? bottoms[i] : end }));

  const residuals = zones.map(() => []);
  let outside = 0;
  const walker = document.createTreeWalker(pm, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent || n.parentElement.closest('.pb')) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      if (r.width === 0) continue;
      const top = u(r.top);
      const zi = zones.findIndex((z) => top >= z.top - 3 && top < z.limit);
      if (zi < 0) outside++;
      else residuals[zi].push((((top - zones[zi].top) % 16) + 16) % 16);
    }
  }
  const spread = (a) => (a.length ? Math.max(...a.map((x) => Math.min(Math.abs(x - a[0]), 16 - Math.abs(x - a[0])))) : 0);
  const gaps = [...pm.querySelectorAll('.pb-gap')].map((e) => u(e.getBoundingClientRect().top));
  return {
    zoom,
    pages: zones.length,
    gapDiffs: gaps.slice(1).map((g, i) => Math.round(g - gaps[i])),
    outside,
    offGrid: Math.max(...residuals.map(spread)),
    numbers: [...pm.querySelectorAll('.pb-number')].map((e) => e.textContent),
    more: [...pm.querySelectorAll('.pb-row')].filter((e) => e.textContent === '(MORE)').length,
    contd: [...pm.querySelectorAll('.pb-row')].filter((e) => /CONT'D/.test(e.textContent)).length,
    cover: pm.querySelectorAll('.pb-cover .pb-line').length,
    paper: u(pm.getBoundingClientRect().width),
    pageScroll: document.documentElement.scrollWidth > innerWidth,
  };
}

const results = [];
const check = (name, ok, detail) => results.push({ name, ok: !!ok, detail: ok ? undefined : detail });

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto(`${BASE_URL}/draft`);
  await page.evaluate(
    ([blocks, cover]) => localStorage.setItem('freex:draft:v2', JSON.stringify({ version: 2, blocks, cover })),
    [script(), COVER],
  );
  await page.reload();
  await page.waitForSelector('.ProseMirror .pb-gap');
  await page.waitForTimeout(500);

  const verify = (label) =>
    page.evaluate(measure).then((m) => {
      check(`${label}: paper is 8.5 in wide`, Math.abs(m.paper - 816) < 1, m.paper);
      check(`${label}: several pages, cover drawn`, m.pages >= 6 && m.cover >= 4, { pages: m.pages, cover: m.cover });
      check(`${label}: every page is one sheet tall`, m.gapDiffs.length > 0 && m.gapDiffs.every((d) => d === SHEET_PLUS_GAP), m.gapDiffs);
      check(`${label}: no text in the page margins`, m.outside === 0, m.outside);
      check(`${label}: every row sits on the ${ROW} px grid`, m.offGrid <= 1.5, m.offGrid);
      check(`${label}: page numbers run 2..n`, m.numbers.every((n, i) => n === `${i + 2}.`) && m.numbers.length === m.pages - 1, m.numbers);
      check(`${label}: (MORE) is answered by (CONT'D)`, m.more > 0 && m.more === m.contd, { more: m.more, contd: m.contd });
      check(`${label}: no horizontal scroll`, !m.pageScroll, m);
      return m;
    });

  const before = await verify('loaded');

  // editing reflows: add text before everything, then check again
  await page.click('.ProseMirror [data-element="action"]');
  await page.waitForTimeout(150);
  await page.keyboard.press('Control+Home');
  await page.waitForTimeout(150);
  await page.keyboard.press('Enter');
  await page.keyboard.type('Texto novo para empurrar o roteiro para baixo. '.repeat(8));
  await page.waitForTimeout(700);
  const after = await verify('after typing');
  check('typing added pages or moved breaks', after.pages >= before.pages, { before: before.pages, after: after.pages });

  // a narrower window scales the sheet (below 11 in plus margins); a phone writes in one column
  await page.setViewportSize({ width: 760, height: 900 });
  await page.waitForTimeout(400);
  const narrow = await page.evaluate(measure);
  check('760 px: the sheet is scaled, not cut', narrow.zoom < 1 && !narrow.pageScroll, { zoom: narrow.zoom, scroll: narrow.pageScroll });
  // a fractional zoom rounds each measurement to a whole pixel
  check('760 px: pages are still one sheet tall', narrow.gapDiffs.every((d) => Math.abs(d - SHEET_PLUS_GAP) <= 1), narrow.gapDiffs);

  await page.setViewportSize({ width: 360, height: 740 });
  await page.waitForTimeout(400);
  const phone = await page.evaluate(() => ({
    linear: document.querySelector('.script-zoom')?.getAttribute('data-linear'),
    breaksHidden: [...document.querySelectorAll('.pb')].every((e) => getComputedStyle(e).display === 'none'),
    scroll: document.documentElement.scrollWidth > innerWidth,
  }));
  check('360 px: linear mode without page furniture', phone.linear === 'true' && phone.breaksHidden && !phone.scroll, phone);

  check('no console errors', errors.length === 0, errors);
  await ctx.close();
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.ok ? '' : ` ${JSON.stringify(r.detail)}`}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
