import { describe, expect, it } from 'vitest';
import {
  EMPTY_RECENTS,
  MAX_RECENT,
  forgetShared,
  homeItems,
  noteDraftOpened,
  noteSharedOpened,
  parseRecents,
  serializeRecents,
  updateShared,
} from './recents';

const id = (n: number) => n.toString(16).padStart(64, '0');
const token = (n: number) => String(n).padStart(43, 'A');
const target = (n: number) => ({ docId: id(n), token: token(n) });

describe('recents', () => {
  it('opening a script puts it first and keeps what is known about it', () => {
    let r = noteSharedOpened(EMPTY_RECENTS, target(1), 100);
    r = updateShared(r, id(1), { title: 'Casa', savedAt: 90 });
    r = noteSharedOpened(r, target(2), 200);
    r = noteSharedOpened(r, target(1), 300);
    expect(r.shared.map((s) => s.docId)).toEqual([id(1), id(2)]);
    expect(r.shared[0]).toMatchObject({ title: 'Casa', savedAt: 90, openedAt: 300 });
  });

  it('keeps at most MAX_RECENT, dropping the oldest', () => {
    let r = EMPTY_RECENTS;
    for (let n = 1; n <= MAX_RECENT + 5; n++) r = noteSharedOpened(r, target(n), n);
    expect(r.shared).toHaveLength(MAX_RECENT);
    expect(r.shared[0]?.docId).toBe(id(MAX_RECENT + 5));
    expect(r.shared.some((s) => s.docId === id(1))).toBe(false);
  });

  it('updating does not move the entry, and returns the same object when nothing changed', () => {
    let r = noteSharedOpened(noteSharedOpened(EMPTY_RECENTS, target(1), 1), target(2), 2);
    r = updateShared(r, id(1), { title: '  Casa   velha ' });
    expect(r.shared.map((s) => s.docId)).toEqual([id(2), id(1)]);
    expect(r.shared[1]?.title).toBe('Casa velha');
    expect(updateShared(r, id(1), { title: 'Casa velha' })).toBe(r);
    expect(updateShared(r, id(9), { title: 'x' })).toBe(r);
  });

  it('forgets one script without touching the draft', () => {
    const r = forgetShared(noteDraftOpened(noteSharedOpened(EMPTY_RECENTS, target(1), 1), 5), id(1));
    expect(r.shared).toEqual([]);
    expect(r.draftOpenedAt).toBe(5);
  });

  it('round-trips through storage', () => {
    const r = updateShared(noteDraftOpened(noteSharedOpened(EMPTY_RECENTS, target(1), 10), 20), id(1), { title: 'Casa', savedAt: 7 });
    expect(parseRecents(serializeRecents(r))).toEqual(r);
  });

  it('reads nothing from missing, broken or foreign data, and drops bad entries', () => {
    for (const raw of [null, '', 'nope', '[]', 'null', '{"version":2,"shared":[]}']) {
      expect(parseRecents(raw)).toEqual(EMPTY_RECENTS);
    }
    const good = { docId: id(1), token: token(1), title: 'Ok', openedAt: 5 };
    const raw = JSON.stringify({
      version: 1,
      draftOpenedAt: 'ontem',
      shared: [
        good,
        good,
        { ...good, docId: 'x' },
        { ...good, docId: id(2), token: '../etc' },
        { ...good, docId: id(3), openedAt: -1 },
        { ...good, docId: id(4), title: 7 },
        'x',
        null,
      ],
    });
    const r = parseRecents(raw);
    expect(r.draftOpenedAt).toBeNull();
    expect(r.shared.map((s) => s.docId)).toEqual([id(1), id(4)]);
    expect(r.shared[1]?.title).toBe('');
  });
});

describe('homeItems', () => {
  it('lists the draft and the shared scripts, most recent first', () => {
    let r = noteSharedOpened(EMPTY_RECENTS, target(1), 100);
    r = noteDraftOpened(r, 200);
    r = noteSharedOpened(r, target(2), 300);
    const items = homeItems(r, { title: 'Rascunho' });
    expect(items.map((i) => (i.kind === 'draft' ? 'draft' : i.docId))).toEqual([id(2), 'draft', id(1)]);
  });

  it('always has the draft, even with nothing stored', () => {
    expect(homeItems(EMPTY_RECENTS, null)).toEqual([{ kind: 'draft', title: '', at: 0, saved: false }]);
  });

  it('a draft never opened since the recents list existed is placed by its save time', () => {
    const r = noteSharedOpened(EMPTY_RECENTS, target(1), 100);
    const items = homeItems(r, { title: 'A', savedAt: 500 });
    expect(items[0]).toMatchObject({ kind: 'draft', at: 500, saved: true });
  });
});
