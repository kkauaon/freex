import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { sha256 } from './sha256';
import { docIdOf, shareLink, tokenFromHash } from './token';
import {
  MAX_CONTRIBUTORS,
  PALETTE,
  colorFor,
  initials,
  peopleFrom,
  readContributors,
  recordEdit,
  timeAgo,
} from './people';

const TOKEN = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ-_'.slice(0, 43);

describe('share token', () => {
  it('reads it from the fragment and nothing else', () => {
    expect(tokenFromHash(`#${TOKEN}`)).toBe(TOKEN);
    expect(tokenFromHash(TOKEN)).toBe(TOKEN);
    for (const bad of ['', '#', '#abc', `#${TOKEN}x`, `#${TOKEN.slice(1)}`, `#../${TOKEN.slice(3)}`, '#<script>']) {
      expect(tokenFromHash(bad)).toBeNull();
    }
  });

  it('the room name is the SHA-256 of the token (same value as the server)', async () => {
    // known vector: sha256("abc")
    expect(await docIdOf('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    const id = await docIdOf(TOKEN);
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(id).not.toContain(TOKEN);
  });

  it('the plain-JS SHA-256 fallback (used over HTTP) matches node:crypto', async () => {
    const { createHash } = await import('node:crypto');
    for (const len of [0, 1, 43, 55, 56, 63, 64, 65, 200]) {
      const bytes = new Uint8Array(len).map((_, i) => (i * 7 + 3) % 256);
      const expected = createHash('sha256').update(bytes).digest('hex');
      const got = Array.from(sha256(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
      expect(got).toBe(expected);
    }
  });

  it('builds a link that keeps the secret in the fragment', () => {
    const link = shareLink('https://freex.app', TOKEN);
    expect(link).toBe(`https://freex.app/s#${TOKEN}`);
    expect(new URL(link).search).toBe('');
    expect(new URL(link).pathname).toBe('/s');
  });
});

describe('colours and initials', () => {
  it('the same name always has the same colour, from the fixed palette', () => {
    expect(colorFor('Ana')).toBe(colorFor('Ana'));
    expect(PALETTE).toContain(colorFor('Ana') as (typeof PALETTE)[number]);
    const used = new Set(['Ana', 'Bia', 'Caio', 'Duda', 'Edu', 'Fabi', 'Gus', 'Helena'].map(colorFor));
    expect(used.size).toBeGreaterThan(3);
  });

  it('every palette colour keeps white text readable (4.5:1)', () => {
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
        c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
      ) as [number, number, number];
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    for (const color of PALETTE) expect(1.05 / (lum(color) + 0.05)).toBeGreaterThanOrEqual(4.5);
  });

  it('initials come from the first and the last word', () => {
    expect(initials('Ana')).toBe('A');
    expect(initials('ana maria souza')).toBe('AS');
    expect(initials('  ')).toBe('?');
    expect(initials('😀 Zé')).toBe('😀Z');
  });
});

describe('peopleFrom', () => {
  const state = (name: unknown, color: unknown = '#1d4ed8') => ({ user: { name, color } });

  it('lists each person once, with the number of tabs, and puts you first', () => {
    const people = peopleFrom(
      new Map<number, Record<string, unknown>>([
        [1, state('Bia')],
        [2, state('Ana')],
        [3, state('Ana')],
        [4, state('Caio')],
      ]),
      4,
    );
    expect(people.map((p) => [p.name, p.tabs, p.self])).toEqual([
      ['Caio', 1, true],
      ['Ana', 2, false],
      ['Bia', 1, false],
    ]);
  });

  it('ignores states without a usable name and checks the colour', () => {
    const people = peopleFrom(
      new Map<number, Record<string, unknown>>([
        [1, {}],
        [2, state('')],
        [3, state('​')],
        [4, state(42)],
        [5, { user: 'Ana' }],
        [6, state('Ana', 'red; background:url(x)')],
      ]),
      1,
    );
    expect(people).toHaveLength(1);
    expect(people[0]?.name).toBe('Ana');
    expect(people[0]?.color).toBe(colorFor('Ana'));
  });

  it('cleans names that another participant sent', () => {
    const [p] = peopleFrom(new Map([[1, state('‮  Ana\nBia')]]), 99);
    expect(p?.name).toBe('Ana Bia');
  });
});

describe('who edited', () => {
  it('records the last edit of each person and lists the most recent first', () => {
    const map = new Y.Doc().getMap('contributors');
    recordEdit(map, 'Ana', 1_000);
    recordEdit(map, 'Bia', 5_000);
    recordEdit(map, 'Ana', 9_000);
    expect(readContributors(map)).toEqual([
      { name: 'Ana', at: 9_000 },
      { name: 'Bia', at: 5_000 },
    ]);
  });

  it('ignores an empty name and reads only well-formed entries', () => {
    const map = new Y.Doc().getMap<unknown>('contributors');
    recordEdit(map, '  ', 1);
    recordEdit(map, '​', 1);
    map.set('Caio', { at: 'ontem' });
    map.set('Duda', 'x');
    map.set('‮Edu', { at: 3 });
    expect(readContributors(map)).toEqual([{ name: 'Edu', at: 3 }]);
  });

  it('does not let strangers grow the list without limit', () => {
    const map = new Y.Doc().getMap<unknown>('contributors');
    for (let i = 0; i < MAX_CONTRIBUTORS + 50; i++) recordEdit(map, `Pessoa ${i}`, i);
    expect(map.size).toBe(MAX_CONTRIBUTORS);
    // a person already on the list can still update
    recordEdit(map, 'Pessoa 0', 99_999);
    expect(readContributors(map)[0]).toEqual({ name: 'Pessoa 0', at: 99_999 });
  });

  it('two people editing at once both end up on the list', () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    recordEdit(a.getMap('contributors'), 'Ana', 1);
    recordEdit(b.getMap('contributors'), 'Bia', 2);
    Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
    expect(readContributors(a.getMap('contributors')).map((c) => c.name).sort()).toEqual(['Ana', 'Bia']);
    expect(readContributors(b.getMap('contributors'))).toEqual(readContributors(a.getMap('contributors')));
  });
});

describe('timeAgo', () => {
  it('speaks in Portuguese, by scale', () => {
    const now = 1_000_000_000;
    expect(timeAgo(now - 5_000, now)).toBe('agora');
    expect(timeAgo(now - 60_000, now)).toBe('há 1 min');
    expect(timeAgo(now - 5 * 60_000, now)).toBe('há 5 min');
    expect(timeAgo(now - 3_600_000, now)).toBe('há 1 h');
    expect(timeAgo(now - 5 * 3_600_000, now)).toBe('há 5 h');
    expect(timeAgo(now - 24 * 3_600_000, now)).toBe('há 1 dia');
    expect(timeAgo(now - 3 * 86_400_000, now)).toBe('há 3 dias');
    // a clock that is a little behind never says something in the future
    expect(timeAgo(now + 10_000, now)).toBe('agora');
  });
});
