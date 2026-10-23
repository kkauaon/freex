import { SHARE_TOKEN_PATTERN } from '@freex/contracts';

/**
 * Scripts this browser opened lately, for the home screen. A per-device convenience: the link
 * of a shared script is kept here so it can be opened again, and nothing leaves the browser.
 */
export const RECENT_KEY = 'freex:recent:v1';
export const MAX_RECENT = 20;
const MAX_TITLE = 200;
const DOC_ID = /^[0-9a-f]{64}$/;

export interface RecentShared {
  readonly docId: string;
  readonly token: string;
  readonly title: string;
  readonly openedAt: number;
  /** The service's time of the last save, as last seen. */
  readonly savedAt?: number;
}

export interface Recents {
  /** When the local draft was last opened; null if it never was. */
  readonly draftOpenedAt: number | null;
  /** Most recently opened first. */
  readonly shared: readonly RecentShared[];
}

export const EMPTY_RECENTS: Recents = { draftOpenedAt: null, shared: [] };

const time = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined;

const cleanTitle = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE) : '');

function parseShared(x: unknown): RecentShared | null {
  if (typeof x !== 'object' || x === null) return null;
  const r = x as Record<string, unknown>;
  const openedAt = time(r.openedAt);
  if (typeof r.docId !== 'string' || !DOC_ID.test(r.docId)) return null;
  if (typeof r.token !== 'string' || !SHARE_TOKEN_PATTERN.test(r.token) || openedAt === undefined) return null;
  const savedAt = time(r.savedAt);
  return {
    docId: r.docId,
    token: r.token,
    title: cleanTitle(r.title),
    openedAt,
    ...(savedAt !== undefined && { savedAt }),
  };
}

/** Reads the stored list; anything unexpected yields an empty one, and bad entries are dropped. */
export function parseRecents(raw: string | null): Recents {
  if (raw === null) return EMPTY_RECENTS;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return EMPTY_RECENTS;
  }
  if (typeof json !== 'object' || json === null) return EMPTY_RECENTS;
  const x = json as Record<string, unknown>;
  if (x.version !== 1) return EMPTY_RECENTS;
  const seen = new Set<string>();
  const shared: RecentShared[] = [];
  for (const entry of Array.isArray(x.shared) ? x.shared : []) {
    const ok = parseShared(entry);
    if (ok && !seen.has(ok.docId)) {
      seen.add(ok.docId);
      shared.push(ok);
    }
  }
  shared.sort((a, b) => b.openedAt - a.openedAt);
  return { draftOpenedAt: time(x.draftOpenedAt) ?? null, shared: shared.slice(0, MAX_RECENT) };
}

export function serializeRecents(r: Recents): string {
  return JSON.stringify({ version: 1, draftOpenedAt: r.draftOpenedAt, shared: r.shared });
}

export function noteDraftOpened(r: Recents, now: number): Recents {
  return { ...r, draftOpenedAt: now };
}

/** Opening a shared script moves it to the top; what is known about it (title, save time) is kept. */
export function noteSharedOpened(r: Recents, target: { docId: string; token: string }, now: number): Recents {
  const before = r.shared.find((s) => s.docId === target.docId);
  const entry: RecentShared = { ...before, docId: target.docId, token: target.token, title: before?.title ?? '', openedAt: now };
  return { ...r, shared: [entry, ...r.shared.filter((s) => s.docId !== target.docId)].slice(0, MAX_RECENT) };
}

/** Updates what is known about a script without changing its place in the list. */
export function updateShared(r: Recents, docId: string, patch: { title?: string; savedAt?: number }): Recents {
  let changed = false;
  const shared = r.shared.map((s) => {
    if (s.docId !== docId) return s;
    const title = patch.title === undefined ? s.title : cleanTitle(patch.title);
    const savedAt = time(patch.savedAt) ?? s.savedAt;
    if (title === s.title && savedAt === s.savedAt) return s;
    changed = true;
    return { ...s, title, ...(savedAt !== undefined && { savedAt }) };
  });
  return changed ? { ...r, shared } : r;
}

export function forgetShared(r: Recents, docId: string): Recents {
  return { ...r, shared: r.shared.filter((s) => s.docId !== docId) };
}

export function readRecents(): Recents {
  try {
    return parseRecents(window.localStorage.getItem(RECENT_KEY));
  } catch {
    return EMPTY_RECENTS;
  }
}

/** Reads, changes and writes in one step, so two tabs do not overwrite each other for long. */
export function changeRecents(change: (r: Recents) => Recents): void {
  try {
    const next = change(readRecents());
    window.localStorage.setItem(RECENT_KEY, serializeRecents(next));
  } catch {
    // storage blocked or full: the home screen just has less to show
  }
}

export type HomeItem =
  | { readonly kind: 'draft'; readonly title: string; readonly at: number; readonly saved: boolean }
  | { readonly kind: 'shared'; readonly docId: string; readonly token: string; readonly title: string; readonly at: number };

/**
 * The home list, most recent first. The local draft is always there: it is where a new script
 * starts. `draft` is what the browser holds for it, if anything.
 */
export function homeItems(r: Recents, draft: { title: string; savedAt?: number } | null): HomeItem[] {
  const draftItem: HomeItem = {
    kind: 'draft',
    title: draft?.title ?? '',
    at: r.draftOpenedAt ?? draft?.savedAt ?? 0,
    saved: draft !== null,
  };
  const shared: HomeItem[] = r.shared.map((s) => ({
    kind: 'shared',
    docId: s.docId,
    token: s.token,
    title: s.title,
    at: s.openedAt,
  }));
  return [draftItem, ...shared].sort((a, b) => b.at - a.at);
}
