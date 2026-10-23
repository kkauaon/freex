import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import {
  ShareError,
  coverFromMap,
  createShare,
  toWebSocketUrl,
  writeCover,
} from './session';

const COVER = { title: 'Casa', credit: '', authors: 'Ana', source: '', contact: '', date: '' };
const TOKEN = 'A'.repeat(43);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('toWebSocketUrl', () => {
  it('switches the scheme only', () => {
    expect(toWebSocketUrl('http://localhost:3002')).toBe('ws://localhost:3002');
    expect(toWebSocketUrl('https://collab.freex.app')).toBe('wss://collab.freex.app');
  });
});

describe('createShare', () => {
  const answer = (status: number, body: unknown = { token: TOKEN }) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

  it('posts the script and the cover and returns the token', async () => {
    const fetchMock = answer(201);
    vi.stubGlobal('fetch', fetchMock);
    const token = await createShare([{ type: 'action', text: 'Ana entra.' }], COVER, 'http://x.test');
    expect(token).toBe(TOKEN);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://x.test/v1/shares');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ blocks: [{ type: 'action', text: 'Ana entra.' }], cover: COVER });
  });

  it('names the reason when it fails', async () => {
    const reason = async (status: number) => {
      vi.stubGlobal('fetch', answer(status, { error: 'x' }));
      return createShare([], COVER, 'http://x.test').catch((e: unknown) => (e as ShareError).reason);
    };
    expect(await reason(429)).toBe('rate-limited');
    expect(await reason(413)).toBe('too-large');
    expect(await reason(500)).toBe('failed');
    expect(await reason(400)).toBe('failed');
  });

  it('does not trust a token that is not well formed', async () => {
    vi.stubGlobal('fetch', answer(201, { token: '../../etc' }));
    await expect(createShare([], COVER, 'http://x.test')).rejects.toMatchObject({ reason: 'failed' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not json', { status: 201 })));
    await expect(createShare([], COVER, 'http://x.test')).rejects.toMatchObject({ reason: 'failed' });
  });

  it('reports a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))));
    await expect(createShare([], COVER, 'http://x.test')).rejects.toMatchObject({ reason: 'network' });
  });
});

describe('shared cover', () => {
  it('reads empty strings for what is missing or not text', () => {
    const map = new Y.Doc().getMap<unknown>('cover');
    map.set('title', 'Casa');
    map.set('authors', 42);
    expect(coverFromMap(map)).toEqual({ title: 'Casa', credit: '', authors: '', source: '', contact: '', date: '' });
  });

  it('writes only the fields that changed, so different fields from two people both survive', () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    const sync = () => {
      Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
      Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
    };
    writeCover(a.getMap('cover'), COVER, { ...COVER, title: '', authors: '' });
    sync();
    const before = coverFromMap(a.getMap('cover'));
    // each person edits a different field before seeing the other's change
    writeCover(a.getMap('cover'), { ...before, title: 'Casa Nova' }, before);
    writeCover(b.getMap('cover'), { ...before, contact: 'ana@exemplo.com' }, before);
    sync();
    for (const doc of [a, b]) {
      expect(coverFromMap(doc.getMap('cover'))).toMatchObject({ title: 'Casa Nova', contact: 'ana@exemplo.com', authors: 'Ana' });
    }
  });

  it('writes nothing when nothing changed', () => {
    const doc = new Y.Doc();
    let updates = 0;
    doc.on('update', () => updates++);
    writeCover(doc.getMap('cover'), COVER, COVER);
    expect(updates).toBe(0);
  });
});
