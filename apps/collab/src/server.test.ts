import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import * as Y from 'yjs';
import { yXmlFragmentToProseMirrorRootNode } from 'y-prosemirror';
import { CreateShareResponse, parseSavedNotice } from '@freex/contracts';
import { scriptSchema } from '@freex/screenplay';
import { loadConfig, type CollabConfig } from './config';
import { createCollabServer } from './server';
import { CONTENT_FRAGMENT } from './share';
import { docIdOf, newToken } from './tokens';

const WEB = 'http://localhost:3000';

const BODY = {
  blocks: [
    { type: 'scene-heading', text: 'INT. SALA - DIA' },
    { type: 'action', text: 'Ana entra.' },
  ],
  cover: { title: 'Casa', credit: '', authors: 'Ana', source: '', contact: '', date: '' },
};

interface Running {
  collab: ReturnType<typeof createCollabServer>;
  port: number;
  dir: string;
}

const cleanup: (() => Promise<void> | void)[] = [];
afterEach(async () => {
  while (cleanup.length) await cleanup.pop()?.();
});

async function start(overrides: Partial<CollabConfig> = {}, dir?: string): Promise<Running> {
  const dataDir = dir ?? (await mkdtemp(join(tmpdir(), 'freex-collab-')));
  const config: CollabConfig = {
    ...loadConfig({}),
    port: 0,
    host: '127.0.0.1',
    dataDir,
    allowedOrigins: [WEB],
    storeDebounceMs: 30,
    storeMaxDebounceMs: 100,
    ...overrides,
  };
  const collab = createCollabServer(config);
  const port = await collab.start();
  let stopped = false;
  cleanup.push(async () => {
    if (!stopped) await collab.stop();
    if (!dir) await rm(dataDir, { recursive: true, force: true });
  });
  return {
    collab: {
      ...collab,
      stop: async () => {
        stopped = true;
        await collab.stop();
      },
    },
    port,
    dir: dataDir,
  };
}

async function post(port: number, body: unknown, headers: Record<string, string> = {}) {
  return fetch(`http://127.0.0.1:${port}/v1/shares`, {
    method: 'POST',
    headers: { origin: WEB, 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function share(port: number, body: unknown = BODY): Promise<string> {
  const res = await post(port, body);
  expect(res.status).toBe(201);
  return CreateShareResponse.parse(await res.json()).token;
}

interface Client {
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  synced: () => Promise<void>;
  failed: () => boolean;
}

function connect(port: number, token: string, docName = docIdOf(token)): Client {
  const ydoc = new Y.Doc();
  let isSynced = false;
  let isFailed = false;
  const provider = new HocuspocusProvider({
    url: `ws://127.0.0.1:${port}`,
    name: docName,
    token,
    document: ydoc,
    onSynced: () => {
      isSynced = true;
    },
    onAuthenticationFailed: () => {
      isFailed = true;
    },
  });
  cleanup.push(() => {
    provider.destroy();
    ydoc.destroy();
  });
  return {
    ydoc,
    provider,
    failed: () => isFailed,
    synced: () => waitFor(() => isSynced, 5_000, 'sync'),
  };
}

async function waitFor(cond: () => boolean, ms = 3_000, label = 'condition'): Promise<void> {
  const end = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > end) throw new Error(`timeout waiting for ${label}`);
    await new Promise((r) => setTimeout(r, 15));
  }
}

const scriptOf = (ydoc: Y.Doc) =>
  yXmlFragmentToProseMirrorRootNode(ydoc.getXmlFragment(CONTENT_FRAGMENT), scriptSchema);

describe('creating a share', () => {
  it('returns a token and nothing else', async () => {
    const { port } = await start();
    const res = await post(port, BODY);
    expect(res.status).toBe(201);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const json = (await res.json()) as Record<string, unknown>;
    expect(Object.keys(json)).toEqual(['token']);
    expect(CreateShareResponse.safeParse(json).success).toBe(true);
  });

  it('every share has its own token', async () => {
    const { port } = await start();
    expect(await share(port)).not.toBe(await share(port));
  });

  it('rejects bad requests with generic errors', async () => {
    const { port } = await start();
    expect((await post(port, '{nope')).status).toBe(400);
    expect((await post(port, { blocks: [{ type: 'script', text: 'x' }] })).status).toBe(400);
    expect((await post(port, {})).status).toBe(400);
    expect((await post(port, JSON.stringify(BODY), { 'content-type': 'text/plain' })).status).toBe(415);
    const bad = await post(port, { blocks: 5 });
    expect(await bad.json()).toEqual({ error: 'invalid request' });
  });

  it('refuses a body over the limit', async () => {
    const { port } = await start({ maxBodyBytes: 500 });
    const big = { blocks: Array(50).fill({ type: 'action', text: 'texto '.repeat(20) }) };
    const res = await post(port, big).catch(() => null);
    // the server answers 413 and closes the socket; some clients only see the closed socket
    expect(res === null || res.status === 413).toBe(true);
  });

  it('limits how many shares one address can create', async () => {
    const { port } = await start({ createPerMinute: 3 });
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) statuses.push((await post(port, BODY)).status);
    expect(statuses).toEqual([201, 201, 201, 429, 429]);
  });

  it('only the web app may call it from a browser', async () => {
    const { port } = await start();
    const evil = await post(port, BODY, { origin: 'https://evil.example' });
    expect(evil.status).toBe(403);
    expect(evil.headers.get('access-control-allow-origin')).toBeNull();

    const ok = await fetch(`http://127.0.0.1:${port}/v1/shares`, { method: 'OPTIONS', headers: { origin: WEB } });
    expect(ok.status).toBe(204);
    expect(ok.headers.get('access-control-allow-origin')).toBe(WEB);
    const no = await fetch(`http://127.0.0.1:${port}/v1/shares`, {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example' },
    });
    expect(no.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('answers health and 404 for anything else', async () => {
    const { port } = await start();
    expect((await fetch(`http://127.0.0.1:${port}/health`)).status).toBe(200);
    expect((await fetch(`http://127.0.0.1:${port}/`)).status).toBe(404);
    expect((await fetch(`http://127.0.0.1:${port}/v1/shares`)).status).toBe(404);
  });
});

describe('joining a share', () => {
  it('the room starts with the script and the cover that were shared', async () => {
    const { port } = await start();
    const token = await share(port);
    const a = connect(port, token);
    await a.synced();
    const root = scriptOf(a.ydoc);
    expect(root.childCount).toBe(2);
    expect(root.textContent).toContain('Ana entra.');
    expect(a.ydoc.getMap('cover').get('title')).toBe('Casa');
  });

  it('two people converge on the same document', async () => {
    const { port } = await start();
    const token = await share(port);
    const a = connect(port, token);
    const b = connect(port, token);
    await Promise.all([a.synced(), b.synced()]);

    a.ydoc.getMap('cover').set('title', 'Da Ana');
    b.ydoc.getMap('cover').set('authors', 'Bia');
    await waitFor(() => b.ydoc.getMap('cover').get('title') === 'Da Ana' && a.ydoc.getMap('cover').get('authors') === 'Bia');

    // concurrent edits of the same text merge instead of one overwriting the other
    const textA = a.ydoc.getText('notes');
    const textB = b.ydoc.getText('notes');
    textA.insert(0, 'AAA');
    textB.insert(0, 'BBB');
    await waitFor(() => textA.toString().length === 6 && textB.toString().length === 6);
    expect(textA.toString()).toBe(textB.toString());
  });

  it('a wrong, unknown or mismatched token is refused', async () => {
    const { port } = await start();
    const token = await share(port);
    const other = await share(port);

    const wrong = connect(port, newToken(), docIdOf(token));
    const unknown = connect(port, newToken());
    const mismatched = connect(port, other, docIdOf(token));
    const malformed = connect(port, 'not-a-token', docIdOf(token));
    await waitFor(() => wrong.failed() && unknown.failed() && mismatched.failed() && malformed.failed(), 5_000, 'refusals');
    for (const c of [wrong, unknown, mismatched, malformed]) {
      expect(scriptOf(c.ydoc).childCount).toBe(0); // nothing of the script reached them
      expect(scriptOf(c.ydoc).textContent).toBe('');
    }
  });

  it('what two people wrote is still there after the server restarts', async () => {
    const first = await start();
    const token = await share(first.port);
    const a = connect(first.port, token);
    await a.synced();
    a.ydoc.getMap('cover').set('title', 'Mudou');
    await waitFor(() => a.provider.unsyncedChanges === 0, 3_000, 'server ack');
    await first.collab.stop();

    const second = await start({}, first.dir);
    const b = connect(second.port, token);
    await b.synced();
    expect(b.ydoc.getMap('cover').get('title')).toBe('Mudou');
    expect(scriptOf(b.ydoc).textContent).toContain('Ana entra.');
    await rm(first.dir, { recursive: true, force: true });
  });

  it('a room has a limit of people', async () => {
    const { port } = await start({ maxConnectionsPerDoc: 2 });
    const token = await share(port);
    const a = connect(port, token);
    const b = connect(port, token);
    await Promise.all([a.synced(), b.synced()]);
    const c = connect(port, token);
    await new Promise((r) => setTimeout(r, 1_200));
    expect(c.provider.isSynced).toBe(false);
    expect(a.provider.isSynced && b.provider.isSynced).toBe(true);
  });
});

describe('saving', () => {
  const listen = (client: Client) => {
    const times: number[] = [];
    client.provider.on('stateless', ({ payload }: { payload: string }) => {
      const at = parseSavedNotice(payload);
      if (at !== null) times.push(at);
    });
    return times;
  };

  it('tells a person who arrives when the script was last saved', async () => {
    const { port } = await start();
    const token = await share(port);
    const a = connect(port, token);
    const times = listen(a);
    await a.synced();
    await waitFor(() => times.length >= 1, 4_000, 'the time on disk');
    expect(Math.abs((times[0] ?? 0) - Date.now())).toBeLessThan(15_000);
  });

  it('tells everyone in the room each time the server saves', async () => {
    const { port } = await start();
    const token = await share(port);
    const a = connect(port, token);
    const b = connect(port, token);
    const seenByB = listen(b);
    await Promise.all([a.synced(), b.synced()]);
    await waitFor(() => seenByB.length >= 1, 4_000, 'arrival notice');
    const arrival = seenByB.length;
    await new Promise((r) => setTimeout(r, 1_100)); // file times have a coarse resolution
    a.ydoc.getMap('cover').set('title', 'Mudou');
    await waitFor(() => seenByB.length > arrival, 5_000, 'a save after the edit');
    expect(seenByB.at(-1) ?? 0).toBeGreaterThan(seenByB[0] ?? Infinity);
  });
});

describe('presence', () => {
  it('shows the others a clean name and colour, whatever the client sent', async () => {
    const { port } = await start();
    const token = await share(port);
    const a = connect(port, token);
    const b = connect(port, token);
    await Promise.all([a.synced(), b.synced()]);

    a.provider.setAwarenessField('user', { name: `‮  An\n${'x'.repeat(200)}`, color: 'red; background:url(//evil)' });
    a.provider.setAwarenessField('anything', 'x'.repeat(50_000));
    await waitFor(() => [...b.provider.awareness!.getStates().values()].some((s) => s.user), 3_000, 'awareness');
    const seen = [...b.provider.awareness!.getStates().values()].find((s) => s.user) as {
      user: { name: string; color: string };
      anything?: string;
    };
    // the name is cut at 30 characters: "An " and 27 more
    expect(seen.user.name).toBe(`An ${'x'.repeat(27)}`);
    expect(seen.user.color).toBe('#6b7280');
    expect(seen.anything).toBeUndefined();
  });

  it('a person without a name is not shown', async () => {
    const { port } = await start();
    const token = await share(port);
    const a = connect(port, token);
    const b = connect(port, token);
    await Promise.all([a.synced(), b.synced()]);
    a.provider.setAwarenessField('user', { name: '​​', color: '#000000' });
    await new Promise((r) => setTimeout(r, 300));
    expect([...b.provider.awareness!.getStates().values()].some((s) => s.user)).toBe(false);
  });
});

describe('abuse limits', () => {
  it('closes a socket that sends a message over the size limit', async () => {
    const { port } = await start();
    const token = await share(port);
    const ws = new WebSocket(`ws://127.0.0.1:${port}`, { headers: { origin: WEB } });
    const code = await new Promise<number>((resolve, reject) => {
      ws.on('open', () => ws.send(Buffer.alloc(1_048_576 + 1024, 1)));
      ws.on('close', (c) => resolve(c));
      ws.on('error', reject);
      setTimeout(() => reject(new Error('no close')), 4_000);
    });
    expect(code).toBe(1009);
    void token;
  });

  it('refuses a socket from another origin', async () => {
    const { port } = await start();
    const ws = new WebSocket(`ws://127.0.0.1:${port}`, { headers: { origin: 'https://evil.example' } });
    const status = await new Promise<number>((resolve) => {
      ws.on('unexpected-response', (_req, res) => resolve(res.statusCode ?? 0));
      ws.on('error', () => undefined);
      ws.on('open', () => resolve(101));
      setTimeout(() => resolve(-1), 3_000);
    });
    expect(status).toBe(403);
  });

  it('limits the open sockets of one address', async () => {
    const { port } = await start({ maxConnectionsPerIp: 3 });
    const results = await Promise.all(
      Array.from(
        { length: 6 },
        () =>
          new Promise<number>((resolve) => {
            const ws = new WebSocket(`ws://127.0.0.1:${port}`, { headers: { origin: WEB } });
            ws.on('open', () => resolve(101));
            ws.on('unexpected-response', (_req, res) => resolve(res.statusCode ?? 0));
            ws.on('error', () => undefined);
            cleanup.push(() => ws.terminate());
          }),
      ),
    );
    expect(results.filter((s) => s === 101)).toHaveLength(3);
    expect(results.filter((s) => s === 429)).toHaveLength(3);
  });

  it('closes a connection that sends too many messages per second', async () => {
    const { port } = await start({ messagesPerSecond: 20 });
    const token = await share(port);
    const a = connect(port, token);
    await a.synced();
    let closed = false;
    a.provider.on('close', () => {
      closed = true;
    });
    for (let i = 0; i < 400; i++) a.ydoc.getMap('spam').set(`k${i}`, i);
    // each change is a message: the flood is cut, and the room is still usable by others
    await waitFor(() => closed, 4_000, 'rate limit close');
    const b = connect(port, token);
    await b.synced();
    expect(scriptOf(b.ydoc).textContent).toContain('Ana entra.');
  });
});
