import { describe, expect, it } from 'vitest';
import { buildApp } from './app';

describe('api', () => {
  it('GET /v1/health', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: '/v1/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', profileVersion: 1 });
  });

  it('POST /v1/layout/paginate paginates blocks', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/layout/paginate',
      payload: { blocks: [{ type: 'scene-heading', text: 'int. sala - dia' }] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().pageCount).toBe(1);
  });

  it('POST /v1/layout/paginate returns layout version, hash, rows, marks and dual columns', async () => {
    const app = buildApp();
    const payload = {
      blocks: [
        { type: 'action', text: 'Ana entra.', marks: [{ type: 'bold', from: 0, to: 3 }] },
        { type: 'character', text: 'ANA', column: 'left' },
        { type: 'dialogue', text: 'Oi.' },
        { type: 'character', text: 'JOÃO', column: 'right' },
        { type: 'dialogue', text: 'Olá.' },
      ],
    };
    const res = await app.inject({ method: 'POST', url: '/v1/layout/paginate', payload });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.layoutVersion).toBe(2);
    expect(body.hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    const lines = body.pages[0].lines;
    expect(lines[0].marks).toEqual([{ type: 'bold', from: 0, to: 3 }]);
    const ana = lines.find((l: { text: string }) => l.text === 'ANA');
    const joao = lines.find((l: { text: string }) => l.text === 'JOÃO');
    expect([ana.col, joao.col, ana.row === joao.row]).toEqual([12.5, 42.5, true]);
    const again = await app.inject({ method: 'POST', url: '/v1/layout/paginate', payload });
    expect(again.json().hash).toBe(body.hash);
  });

  it('POST /v1/layout/paginate adds the title page and honours the page range', async () => {
    const app = buildApp();
    const long = Array(54).fill('x'.repeat(60)).join(' ');
    const blocks = [
      { type: 'action', text: long },
      { type: 'action', text: long },
      { type: 'action', text: long },
    ];
    const res = await app.inject({
      method: 'POST',
      url: '/v1/layout/paginate',
      payload: { blocks, titlePage: { title: 'Casa', authors: ['Ana'] }, range: { from: 2, to: 3 } },
    });
    expect(res.statusCode).toBe(200);
    const pages = res.json().pages;
    expect(pages.map((p: { kind: string; number: number; printedNumber: number | null }) => [p.kind, p.number, p.printedNumber])).toEqual([
      ['title', 0, null],
      ['script', 2, 2],
      ['script', 3, 3],
    ]);
    const bad = await app.inject({
      method: 'POST',
      url: '/v1/layout/paginate',
      payload: { blocks, range: { from: 5, to: 2 } },
    });
    expect(bad.statusCode).toBe(400);
  });

  it('POST /v1/export/pdf returns a PDF', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/export/pdf',
      payload: { blocks: [{ type: 'action', text: 'Maria entra.' }] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');
  }, 60_000);

  it('rejects invalid bodies', async () => {
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/layout/paginate',
      payload: { blocks: [{ type: 'nope', text: 'x' }] },
    });
    expect(res.statusCode).toBe(400);
  });
});
