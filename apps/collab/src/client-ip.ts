import type { IncomingMessage } from 'node:http';
import { isIP } from 'node:net';

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/**
 * The address the per-IP limits count. Behind a reverse proxy on the same machine every
 * connection comes from loopback, so with `trustProxy` the address the proxy appended to
 * `X-Forwarded-For` (the last one) is used instead. Anything else, or a header that is not an
 * address, falls back to the socket: the header is only believed when it comes from loopback.
 */
export function clientIp(req: IncomingMessage, trustProxy: boolean): string {
  const socket = req.socket.remoteAddress ?? 'unknown';
  if (!trustProxy || !LOOPBACK.has(socket)) return socket;
  const header = req.headers['x-forwarded-for'];
  const last = (Array.isArray(header) ? header.join(',') : (header ?? '')).split(',').pop()?.trim() ?? '';
  return isIP(last) !== 0 ? last : socket;
}
