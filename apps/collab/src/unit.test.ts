import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { yXmlFragmentToProseMirrorRootNode } from 'y-prosemirror';
import { scriptSchema } from '@freex/screenplay';
import { loadConfig } from './config';
import { RateLimiter } from './rate-limit';
import { CONTENT_FRAGMENT, COVER_MAP, META_MAP, buildShareState } from './share';
import { cleanAwarenessState } from './server';
import { FileShareStore } from './store';
import { DOC_ID_PATTERN, docIdOf, isToken, newToken } from './tokens';

describe('tokens', () => {
  it('are 256 random bits, URL-safe and different every time', () => {
    const a = newToken();
    const b = newToken();
    expect(isToken(a)).toBe(true);
    expect(a).not.toBe(b);
    expect(a).toHaveLength(43);
  });

  it('only well-formed strings count as tokens', () => {
    for (const bad of ['', 'abc', 'A'.repeat(44), `${'A'.repeat(42)}!`, '../'.repeat(15), null, undefined, 7]) {
      expect(isToken(bad)).toBe(false);
    }
  });

  it('the room name is a hash that cannot be turned back into the token', () => {
    const token = newToken();
    const id = docIdOf(token);
    expect(id).toMatch(DOC_ID_PATTERN);
    expect(id).toBe(docIdOf(token));
    expect(id).not.toContain(token);
    expect(docIdOf(newToken())).not.toBe(id);
  });
});

describe('FileShareStore', () => {
  let dir = '';
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('saves, loads and reports what exists', async () => {
    dir = await mkdtemp(join(tmpdir(), 'freex-store-'));
    const store = new FileShareStore(join(dir, 'nested'));
    const id = docIdOf(newToken());
    expect(await store.exists(id)).toBe(false);
    expect(await store.load(id)).toBeNull();
    await store.save(id, new Uint8Array([1, 2, 3]));
    expect(await store.exists(id)).toBe(true);
    expect(Array.from((await store.load(id)) ?? [])).toEqual([1, 2, 3]);
    await store.save(id, new Uint8Array([9]));
    expect(Array.from((await store.load(id)) ?? [])).toEqual([9]);
  });

  it('knows when each document was last saved', async () => {
    dir = await mkdtemp(join(tmpdir(), 'freex-store-'));
    const store = new FileShareStore(dir);
    const id = docIdOf(newToken());
    expect(await store.modifiedAt(id)).toBeNull();
    const before = Date.now();
    await store.save(id, new Uint8Array([1]));
    const at = await store.modifiedAt(id);
    expect(at).not.toBeNull();
    expect(Math.abs((at ?? 0) - before)).toBeLessThan(5_000);
    await expect(store.modifiedAt('../x')).rejects.toThrow('invalid document id');
  });

  it('leaves no temporary file behind', async () => {
    dir = await mkdtemp(join(tmpdir(), 'freex-store-'));
    const store = new FileShareStore(dir);
    const id = docIdOf(newToken());
    await Promise.all([1, 2, 3, 4].map((n) => store.save(id, new Uint8Array([n]))));
    expect(await readdir(dir)).toEqual([`${id}.ydoc`]);
  });

  it('never lets an id reach the file system unless it is 64 hex characters', async () => {
    dir = await mkdtemp(join(tmpdir(), 'freex-store-'));
    const store = new FileShareStore(dir);
    for (const bad of ['../secret', '..\\secret', 'a'.repeat(63), 'A'.repeat(64), `${'a'.repeat(63)}/`, '']) {
      await expect(store.exists(bad)).rejects.toThrow('invalid document id');
      await expect(store.load(bad)).rejects.toThrow('invalid document id');
      await expect(store.save(bad, new Uint8Array())).rejects.toThrow('invalid document id');
    }
  });
});

describe('RateLimiter', () => {
  it('allows the limit per window and starts again after it', () => {
    let t = 0;
    const limiter = new RateLimiter(3, 1_000, () => t);
    expect([1, 2, 3, 4, 5].map(() => limiter.hit('ip'))).toEqual([true, true, true, false, false]);
    expect(limiter.hit('other')).toBe(true);
    t = 1_000;
    expect(limiter.hit('ip')).toBe(true);
  });
});

describe('buildShareState', () => {
  const read = (state: Uint8Array) => {
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, state);
    return ydoc;
  };

  it('starts the room with the script, the cover and the schema version', () => {
    const ydoc = read(
      buildShareState({
        blocks: [
          { type: 'scene-heading', text: 'INT. SALA - DIA' },
          { type: 'character', text: 'ANA' },
          { type: 'dialogue', text: 'Oi.' },
        ],
        cover: { title: 'Casa', credit: '', authors: 'Ana', source: '', contact: '', date: '' },
      }),
    );
    const root = yXmlFragmentToProseMirrorRootNode(ydoc.getXmlFragment(CONTENT_FRAGMENT), scriptSchema);
    expect(root.childCount).toBe(2);
    expect(root.child(1).type.name).toBe('speech');
    expect(ydoc.getMap(COVER_MAP).get('title')).toBe('Casa');
    expect(ydoc.getMap(COVER_MAP).get('authors')).toBe('Ana');
    expect(ydoc.getMap(META_MAP).get('schemaVersion')).toBe(1);
  });

  it('stores the profile of the script when there is one', () => {
    expect(read(buildShareState({ blocks: [], profile: 'production' })).getMap(META_MAP).get('profile')).toBe('production');
    expect(read(buildShareState({ blocks: [] })).getMap(META_MAP).get('profile')).toBeUndefined();
  });

  it('an empty script still has one block to write in', () => {
    const ydoc = read(buildShareState({ blocks: [] }));
    const root = yXmlFragmentToProseMirrorRootNode(ydoc.getXmlFragment(CONTENT_FRAGMENT), scriptSchema);
    expect(root.childCount).toBe(1);
    expect(root.child(0).type.name).toBe('action');
  });

  it('turns a sequence that breaks the speech grammar into a valid tree', () => {
    const ydoc = read(buildShareState({ blocks: [{ type: 'dialogue', text: 'solta' }] }));
    const root = yXmlFragmentToProseMirrorRootNode(ydoc.getXmlFragment(CONTENT_FRAGMENT), scriptSchema);
    expect(() => root.check()).not.toThrow();
  });
});

describe('cleanAwarenessState', () => {
  it('keeps a clean name, a colour and the cursor', () => {
    expect(
      cleanAwarenessState({ user: { name: '  Ana ', color: '#2563EB' }, cursor: { anchor: 1, head: 2 } }),
    ).toEqual({ user: { name: 'Ana', color: '#2563EB' }, cursor: { anchor: 1, head: 2 } });
  });

  it('drops anything else, a bad colour and a name that is empty after cleaning', () => {
    expect(cleanAwarenessState({ user: { name: 'Ana', color: 'red; background:url(x)' }, extra: 'x'.repeat(100_000) })).toEqual({
      user: { name: 'Ana', color: '#6b7280' },
    });
    expect(cleanAwarenessState({ user: { name: '‮​' } })).toEqual({});
    expect(cleanAwarenessState({ user: 'Ana', cursor: 3 })).toEqual({});
  });

  it('limits the name length', () => {
    const out = cleanAwarenessState({ user: { name: 'x'.repeat(500), color: '#000000' } }) as { user: { name: string } };
    expect(out.user.name).toHaveLength(30);
  });
});

describe('loadConfig', () => {
  it('has safe defaults and reads the allowed origins as a list', () => {
    const c = loadConfig({ WEB_ORIGIN: 'https://a.example, https://b.example' });
    expect(c.allowedOrigins).toEqual(['https://a.example', 'https://b.example']);
    expect(c.maxMessageBytes).toBe(1_048_576);
    expect(c.maxConnectionsPerDoc).toBe(50);
    expect(c.messagesPerSecond).toBe(100);
    expect(loadConfig({}).allowedOrigins).toEqual(['http://localhost:3000']);
    expect(loadConfig({}).trustProxy).toBe(false);
    expect(loadConfig({ TRUST_PROXY: 'true' }).trustProxy).toBe(true);
  });

  it('rejects a trust-proxy value that is not true or false', () => {
    expect(() => loadConfig({ TRUST_PROXY: 'yes' })).toThrow();
  });

  it('rejects a port that is not a port', () => {
    expect(() => loadConfig({ PORT: '99999' })).toThrow();
  });
});
