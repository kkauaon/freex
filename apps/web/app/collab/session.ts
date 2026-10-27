import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import {
  COLLAB_TYPES,
  CreateShareResponse,
  ScriptProfile,
  type BlockInput,
  type CoverFields,
} from '@freex/contracts';
import type { Block } from '@freex/screenplay';

/** Base address of the collaboration service (HTTP for creating a share, WebSocket for editing). */
export const COLLAB_URL = process.env.NEXT_PUBLIC_COLLAB_URL ?? 'http://localhost:3002';

export function toWebSocketUrl(httpUrl: string): string {
  return httpUrl.replace(/^http/, 'ws');
}

export type ShareFailure = 'network' | 'rate-limited' | 'too-large' | 'failed';

export class ShareError extends Error {
  constructor(readonly reason: ShareFailure) {
    super(reason);
    this.name = 'ShareError';
  }
}

/** Asks the service for a new shared script made from this one. Returns the token of the link. */
export async function createShare(
  blocks: readonly Block[],
  cover: CoverFields,
  baseUrl: string = COLLAB_URL,
  profile?: ScriptProfile,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/v1/shares`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ blocks: blocks as readonly BlockInput[], cover, ...(profile && { profile }) }),
    });
  } catch {
    throw new ShareError('network');
  }
  if (res.status === 429) throw new ShareError('rate-limited');
  if (res.status === 413) throw new ShareError('too-large');
  if (!res.ok) throw new ShareError('failed');
  const parsed = CreateShareResponse.safeParse(await res.json().catch(() => null));
  if (!parsed.success) throw new ShareError('failed');
  return parsed.data.token;
}

export interface CollabSession {
  readonly ydoc: Y.Doc;
  readonly provider: HocuspocusProvider;
  readonly cover: Y.Map<unknown>;
  readonly meta: Y.Map<unknown>;
  readonly contributors: Y.Map<unknown>;
  destroy(): void;
}

/** Connects to the room of a share. The room is named by `docId`; the token proves the right to enter. */
export function openSession(opts: { token: string; docId: string; baseUrl?: string }): CollabSession {
  const ydoc = new Y.Doc();
  const provider = new HocuspocusProvider({
    url: toWebSocketUrl(opts.baseUrl ?? COLLAB_URL),
    name: opts.docId,
    token: opts.token,
    document: ydoc,
  });
  return {
    ydoc,
    provider,
    cover: ydoc.getMap<unknown>(COLLAB_TYPES.cover),
    meta: ydoc.getMap<unknown>(COLLAB_TYPES.meta),
    contributors: ydoc.getMap<unknown>(COLLAB_TYPES.contributors),
    destroy() {
      provider.destroy();
      ydoc.destroy();
    },
  };
}

const COVER_KEYS = ['title', 'credit', 'authors', 'source', 'contact', 'date'] as const;

/** The shared cover as the form edits it. Anything missing or of the wrong type is empty. */
export function coverFromMap(map: Y.Map<unknown>): CoverFields {
  const read = (key: (typeof COVER_KEYS)[number]) => {
    const v = map.get(key);
    return typeof v === 'string' ? v : '';
  };
  return {
    title: read('title'),
    credit: read('credit'),
    authors: read('authors'),
    source: read('source'),
    contact: read('contact'),
    date: read('date'),
  };
}

/** Writes only the fields that changed, so two people editing different fields do not overwrite each other. */
export function writeCover(map: Y.Map<unknown>, next: CoverFields, previous: CoverFields): void {
  map.doc?.transact(() => {
    for (const key of COVER_KEYS) if (next[key] !== previous[key]) map.set(key, next[key]);
  });
}

/** The shared profile; a missing or unknown value is the default one. */
export function profileFromMap(map: Y.Map<unknown>): ScriptProfile {
  const parsed = ScriptProfile.safeParse(map.get('profile'));
  return parsed.success ? parsed.data : 'spec';
}

export function writeProfile(map: Y.Map<unknown>, profile: ScriptProfile): void {
  if (map.get('profile') !== profile) map.set('profile', profile);
}
