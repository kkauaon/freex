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
