// End-to-end check of real-time collaboration: two browsers, one shared script.
//
//   pnpm --filter @freex/collab start    # WEB_ORIGIN must include the web app
//   pnpm --filter @freex/web build && pnpm --filter @freex/web start
//   pnpm --filter @freex/web e2e:collab
//
// BASE_URL defaults to http://localhost:3000. Needs `pnpm exec playwright install chromium`.
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const results = [];
const check = (name, ok, detail) => results.push({ name, ok: !!ok, detail: ok ? undefined : detail });

const waitFor = async (fn, ms = 6000, label = 'condition') => {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) {
    try {
      last = await fn();
      if (last) return last;
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`timeout: ${label} (${JSON.stringify(last)?.slice(0, 200)})`);
};

// the text of each block, without the other people's cursor labels and the page furniture
const texts = (page) =>
  page.$$eval('.ProseMirror [data-element]:not([data-element="speech"]):not([data-element="dual-dialogue"])', (els) =>
    els.map((e) => {
      const copy = e.cloneNode(true);
      copy.querySelectorAll('.remote-cursor, .pb').forEach((n) => n.remove());
      return [e.getAttribute('data-element'), copy.textContent];
    }),
  );
const editable = (page) => page.$eval('.ProseMirror', (e) => e.getAttribute('contenteditable'));

async function joinWithName(page, name) {
  await page.waitForSelector('[role=dialog] #name-input');
  await page.fill('#name-input', name);
  await page.click('[role=dialog] button[type=submit]');
  await page.waitForSelector('[role=dialog]', { state: 'detached' }).catch(() => undefined);
}

const browser = await chromium.launch();
const errors = [];
const watch = (page, who) => {
  page.on('pageerror', (e) => errors.push(`${who}: ${e}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${who}: ${m.text()}`));
};

try {
  // ---------------------------------------------------------------- Ana shares her script
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ana = await ctxA.newPage();
  watch(ana, 'ana');
  await ana.goto(`${BASE_URL}/draft`);
  await ana.evaluate(() => localStorage.clear());
  await ana.reload();
  await ana.waitForSelector('.ProseMirror p');
  const sampleBefore = await texts(ana);

  await ana.click('button:has-text("Compartilhar")');
  await ana.waitForURL(/\/s#[A-Za-z0-9_-]{43}$/, { timeout: 8000 });
  const url = ana.url();
  const token = url.split('#')[1];
  check('sharing opens the shared script with the token only in the fragment', new URL(url).search === '' && new URL(url).pathname === '/s', url);

  // nobody edits before giving a name
  await ana.waitForSelector('[role=dialog] #name-input');
  await ana.waitForSelector('.ProseMirror p');
  check('the name is asked first and the dialog cannot be dismissed', (await ana.$$('[role=dialog] button:has-text("Cancelar")')).length === 0);
  await ana.keyboard.press('Escape');
  check('Escape does not skip the name', (await ana.$$('[role=dialog] #name-input')).length === 1);
  check('the script is read-only until there is a name', (await editable(ana)) === 'false', await editable(ana));
  check('the page behind the dialog is inert', await ana.$eval('.shell', (e) => e.hasAttribute('inert')));
  check('an empty name cannot be sent', await ana.$eval('[role=dialog] button[type=submit]', (b) => b.disabled));
  await ana.fill('#name-input', '  ​  ');
  check('a name of only invisible characters cannot be sent', await ana.$eval('[role=dialog] button[type=submit]', (b) => b.disabled));

  await ana.fill('#name-input', '  Ana ');
  await ana.click('[role=dialog] button[type=submit]');
  // right after sharing, the link dialog opens
  await ana.waitForSelector('#share-link');
  const link = await ana.$eval('#share-link', (i) => i.value);
  check('the link dialog shows the same link as the address bar', link === url, [link, url]);
  check('the dialog says that anyone with the link can edit', /pode ver e editar/.test(await ana.textContent('[role=dialog]')));
  await ana.click('[role=dialog] button:has-text("Fechar")');
  await waitFor(async () => (await editable(ana)) === 'true', 8000, 'Ana can edit after the room loads');
  check('Ana can edit after giving a name', true);

  const sampleShared = await texts(ana);
  check('the shared script starts with what Ana had', JSON.stringify(sampleShared) === JSON.stringify(sampleBefore), [sampleBefore.length, sampleShared.length]);

  // ---------------------------------------------------------------- Bia opens the link
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const bia = await ctxB.newPage();
  watch(bia, 'bia');
  await bia.goto(url);
  await bia.waitForSelector('[role=dialog] #name-input');
  await bia.waitForSelector('.ProseMirror [data-element]');
  const biaSees = await texts(bia);
  check('Bia sees the script before giving a name', biaSees.length >= 5, biaSees.length);
  check('Bia cannot edit before giving a name', (await editable(bia)) === 'false');
  const before = (await bia.textContent('.ProseMirror')) ?? '';
  await bia.click('.ProseMirror p', { force: true }).catch(() => undefined);
  await bia.keyboard.type('ZZZ');
  check('typing does nothing before the name', !((await bia.textContent('.ProseMirror')) ?? '').includes('ZZZ') && before.length > 0);
  await joinWithName(bia, 'Bia');
  await waitFor(async () => (await editable(bia)) === 'true', 8000, 'Bia can edit');

  // ---------------------------------------------------------------- presence
  await waitFor(async () => (await ana.$$('.people .avatar')).length === 2, 8000, 'two avatars on Ana');
  await waitFor(async () => (await bia.$$('.people .avatar')).length === 2, 8000, 'two avatars on Bia');
  const titles = async (p) => (await p.$$eval('.people .avatar', (a) => a.map((x) => x.getAttribute('title')))).sort();
  check('both see Ana and Bia online', JSON.stringify(await titles(ana)) === '["Ana","Bia"]' && JSON.stringify(await titles(bia)) === '["Ana","Bia"]', [await titles(ana), await titles(bia)]);
  await ana.click('.people');
  await ana.waitForSelector('#panel-people:not([hidden]) .people-list');
  const peopleList = await ana.$$eval('#panel-people .people-list:first-of-type li .person-name', (l) => l.map((x) => x.textContent));
  check('the people panel marks who you are', peopleList.some((t) => /Ana.*\(você\)/.test(t ?? '')) && peopleList.some((t) => t === 'Bia'), peopleList);
  await ana.keyboard.press('Escape');

  // ---------------------------------------------------------------- editing at the same time
  const lastAction = (p) => p.locator('.ProseMirror [data-element="action"]').last();
  const firstAction = (p) => p.locator('.ProseMirror [data-element="action"]').first();
  await firstAction(ana).click();
  await ana.waitForTimeout(150);
  await ana.keyboard.press('End');
  await bia.locator('.ProseMirror [data-element="dialogue"]').last().click();
  await bia.waitForTimeout(150);
  await bia.keyboard.press('End');
  // both type at once, in different places
  await Promise.all([ana.keyboard.type(' [Ana escreveu aqui]', { delay: 15 }), bia.keyboard.type(' [Bia escreveu ali]', { delay: 15 })]);
  const both = async (p) => (await p.textContent('.ProseMirror')) ?? '';
  await waitFor(async () => (await both(ana)).includes('[Bia escreveu ali]') && (await both(bia)).includes('[Ana escreveu aqui]'), 8000, 'both edits arrive');
  check('both edits made at the same time are in both screens', true);
  check('the two screens show the same script', JSON.stringify(await texts(ana)) === JSON.stringify(await texts(bia)), 'differ');

  // two people typing in the same paragraph merge instead of one overwriting the other
  await firstAction(ana).click();
  await firstAction(bia).click();
  await ana.keyboard.press('Home');
  await bia.keyboard.press('End');
  await Promise.all([ana.keyboard.type('AAA', { delay: 20 }), bia.keyboard.type('BBB', { delay: 20 })]);
  await waitFor(async () => /AAA/.test(await both(bia)) && /BBB/.test(await both(ana)), 8000, 'same paragraph merge');
  check('typing in the same paragraph keeps what both wrote', true);

  // a structural edit by one person does not discard what the other is typing
  await lastAction(ana).click().catch(() => undefined);
  await ana.keyboard.press('End');
  await ana.keyboard.press('Enter');
  await ana.keyboard.type('Nova linha da Ana', { delay: 10 });
  await waitFor(async () => (await both(bia)).includes('Nova linha da Ana'), 8000, 'structural edit arrives');
  check('a new block made by Ana appears for Bia with its text', true);
  check('the two screens still show the same script', JSON.stringify(await texts(ana)) === JSON.stringify(await texts(bia)));

  // ---------------------------------------------------------------- the pages are the same for both
  const pagesOf = (p) => p.$$eval('.pb-gap', (g) => g.length);
  check('both draw the same number of pages', (await pagesOf(ana)) === (await pagesOf(bia)), [await pagesOf(ana), await pagesOf(bia)]);

  // ---------------------------------------------------------------- remote cursor with a name
  await bia.keyboard.press('ArrowLeft');
  await waitFor(async () => (await ana.$$eval('.remote-cursor-label', (l) => l.map((x) => x.textContent))).includes('Bia'), 8000, "Bia's cursor on Ana");
  check("Ana sees Bia's cursor with her name", true);
  const sel = await ana.$$eval('.remote-cursor', (c) => c.map((x) => getComputedStyle(x).getPropertyValue('--cursor')));
  check('the cursor colour comes from the fixed palette', sel.every((c) => /^#[0-9a-f]{6}$/i.test(c.trim())), sel);

  // ---------------------------------------------------------------- who edited
  await bia.click('.people');
  await bia.waitForSelector('#panel-people:not([hidden])');
  await waitFor(async () => {
    const names = await bia.$$eval('#panel-people ul[aria-label="Quem editou o roteiro"] .person-name', (l) => l.map((x) => (x.textContent ?? '').replace(/\s*\(você\)/, '')));
    return names.includes('Ana') && names.includes('Bia');
  }, 10000, 'both on the who-edited list');
  check('the panel lists who edited, with when', /editou/.test((await bia.textContent('#panel-people ul[aria-label="Quem editou o roteiro"]')) ?? ''));
  await bia.keyboard.press('Escape');

  // ---------------------------------------------------------------- the cover is shared
  await ana.click('.top-panels button:has-text("Capa")');
  await ana.fill('#cover-title', 'Casa Compartilhada');
  await waitFor(async () => /Casa Compartilhada/.test((await bia.textContent('.doc-title')) ?? ''), 8000, 'cover on Bia');
  check('the cover title edited by Ana appears for Bia', true);
  await bia.click('.top-panels button:has-text("Capa")');
  await bia.fill('#cover-contact', 'bia@exemplo.com');
  await waitFor(async () => (await ana.inputValue('#cover-contact')) === 'bia@exemplo.com', 8000, 'contact on Ana');
  check('a different field edited by Bia appears for Ana, and the title is kept', (await ana.inputValue('#cover-title')) === 'Casa Compartilhada');
  await ana.keyboard.press('Escape');
  await bia.keyboard.press('Escape');

  // ---------------------------------------------------------------- the time of the last save
  const savedText = (page) => page.textContent('.statusbar .saved-at').catch(() => '');
  await waitFor(async () => /^Última modificação salva (às|ontem|em) /.test((await savedText(ana)) ?? ''), 15000, 'saved text on Ana');
  check('the status bar says when the last modification was saved', true);
  await waitFor(async () => /^Última modificação salva /.test((await savedText(bia)) ?? ''), 15000, 'saved text on Bia');
  check('the other person sees it too', true);

  // ---------------------------------------------------------------- offline, then back
  await lastAction(bia).click({ force: true }).catch(() => undefined);
  await bia.keyboard.press('End');
  await ctxB.setOffline(true);
  await bia.keyboard.type(' (escrito offline)', { delay: 10 });
  await waitFor(
    async () => /Sincronizando|Sem conexão|Conectando/.test((await bia.textContent('.statusbar')) ?? ''),
    15000,
    'Bia is told her text is not synced',
  );
  check('Bia is told her text has not reached the others', true);
  check('the offline text is not on Ana yet', !(await both(ana)).includes('(escrito offline)'));
  await ctxB.setOffline(false);
  await waitFor(async () => (await both(ana)).includes('(escrito offline)'), 40000, 'offline text reaches Ana');
  check('what Bia wrote offline reaches Ana after the network is back', true);
  await waitFor(async () => /Sincronizado/.test((await bia.textContent('.statusbar')) ?? ''), 15000, 'Bia is synced again');
  check('Bia sees "Sincronizado" again', true);

  // ---------------------------------------------------------------- invalid links
  const ctxC = await browser.newContext();
  const eve = await ctxC.newPage();
  watch(eve, 'eve');
  await eve.goto(`${BASE_URL}/s#${'A'.repeat(43)}`);
  await eve.waitForSelector('.denied', { timeout: 10000 });
  check('a well-formed token that opens nothing says the link is invalid', /não abre nenhum roteiro/.test((await eve.textContent('.denied')) ?? ''));
  const noScript = ((await eve.textContent('body')) ?? '').includes('Ana escreveu');
  check('and shows nothing of any script', !noScript);
  await eve.goto(`${BASE_URL}/s#not-a-token`);
  await eve.waitForSelector('main.denied');
  check('a malformed token is refused without trying to connect', /Link inválido/.test((await eve.textContent('main.denied')) ?? ''));
  await eve.goto(`${BASE_URL}/s`);
  await eve.waitForSelector('main.denied');
  check('/s with no token says the link is invalid', true);

  // a new visitor with the right link needs a name too, and a second tab of Ana is one person
  const ana2 = await ctxA.newPage();
  watch(ana2, 'ana2');
  await ana2.goto(url);
  await ana2.waitForSelector('.ProseMirror [data-element]');
  check('a returning visitor on the same device is not asked again', (await ana2.$$('[role=dialog] #name-input')).length === 0);
  await waitFor(async () => (await ana.$$('.people .avatar')).length === 2, 8000, 'still two people');
  check('two tabs of the same person count as one person', true);
  await ana.click('.people');
  const tabs = await ana.$$eval('#panel-people .people-list:first-of-type li .person-tabs', (l) => l.map((x) => x.textContent));
  check('the panel says she has 2 tabs', tabs.some((t) => /2 abas/.test(t ?? '')), tabs);

  // ---------------------------------------------------------------- the home screen
  const home = await ctxA.newPage();
  watch(home, 'home');
  await home.goto(BASE_URL);
  await home.waitForSelector('.home-item');
  const rows = await home.$$eval('.home-item', (l) =>
    l.map((e) => ({ title: e.querySelector('strong')?.textContent, shared: !!e.querySelector('.home-icon.shared'), href: e.querySelector('a')?.getAttribute('href') })),
  );
  check('home lists the shared script and the draft', rows.length === 2, rows);
  const sharedRow = rows.find((r) => r.shared);
  check('the shared one has the shared icon, the cover title and its link', sharedRow?.title === 'Casa Compartilhada' && sharedRow.href === new URL(url).hash.replace(/^/, '/s'), rows);
  check('the draft is listed without the shared icon and opens /draft', rows.some((r) => !r.shared && r.href === '/draft'), rows);
  await home.click('.home-link[href^="/s#"]');
  await home.waitForSelector('.ProseMirror [data-element]');
  check('opening a shared one from home goes to the room', /\/s#/.test(home.url()));
  await home.goto(BASE_URL);
  await home.waitForSelector('.home-item');
  await home.click('.home-item:has(.home-icon.shared) button');
  await waitFor(async () => (await home.$$('.home-item')).length === 1, 4000, 'forgotten');
  check('"Tirar da lista" removes only the shared one', (await home.$$('.home-item .home-icon.shared')).length === 0);
  void token;
} catch (error) {
  check('the scenario ran to the end', false, String(error));
} finally {
  check('no console errors', errors.filter((e) => !/Failed to load resource|status of 4|WebSocket/.test(e)).length === 0, errors.slice(0, 6));
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.ok ? '' : ` ${JSON.stringify(r.detail)}`}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
