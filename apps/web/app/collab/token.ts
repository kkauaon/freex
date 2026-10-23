import { SHARE_TOKEN_PATTERN } from '@freex/contracts';
import { sha256 } from './sha256';

/** The share token as it appears in a link: `/s#<token>`. The fragment never reaches a server. */
export function tokenFromHash(hash: string): string | null {
  const token = hash.startsWith('#') ? hash.slice(1) : hash;
  return SHARE_TOKEN_PATTERN.test(token) ? token : null;
}

/**
 * Name of the room: the SHA-256 of the token, in hex. The collaboration service computes the
 * same value, so the token itself is never used as a room name or sent in a URL.
 */
export async function docIdOf(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  // crypto.subtle only exists in secure contexts (HTTPS, localhost)
  const digest = globalThis.crypto?.subtle
    ? new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
    : sha256(bytes);
  return Array.from(digest,(b) => b.toString(16).padStart(2, '0')).join('');
}

export function shareLink(origin: string, token: string): string {
  return `${origin}/s#${token}`;
}
