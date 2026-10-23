import { createHash, randomBytes } from 'node:crypto';
import { SHARE_TOKEN_PATTERN } from '@freex/contracts';

/** 256 bits of randomness: the token is the whole secret of a shared script. */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export function isToken(value: unknown): value is string {
  return typeof value === 'string' && SHARE_TOKEN_PATTERN.test(value);
}

/**
 * The name of the room is the hash of the token, so the token itself is never a file name, a
 * log line or a room name, and the server only keeps what cannot be turned back into a link.
 */
export function docIdOf(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const DOC_ID_PATTERN = /^[0-9a-f]{64}$/;
