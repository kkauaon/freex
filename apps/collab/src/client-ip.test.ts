import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { clientIp } from './client-ip';

const req = (remote: string | undefined, xff?: string | string[]) =>
  ({ socket: { remoteAddress: remote }, headers: xff === undefined ? {} : { 'x-forwarded-for': xff } }) as unknown as IncomingMessage;

describe('clientIp', () => {
  it('uses the socket when no proxy is trusted, whatever the header says', () => {
    expect(clientIp(req('203.0.113.9', '198.51.100.1'), false)).toBe('203.0.113.9');
    expect(clientIp(req('127.0.0.1', '198.51.100.1'), false)).toBe('127.0.0.1');
  });

  it('uses the address the local proxy appended', () => {
    expect(clientIp(req('127.0.0.1', '198.51.100.1'), true)).toBe('198.51.100.1');
    expect(clientIp(req('::1', '2001:db8::7'), true)).toBe('2001:db8::7');
    expect(clientIp(req('::ffff:127.0.0.1', '198.51.100.1'), true)).toBe('198.51.100.1');
  });

  it('takes the last entry, which the proxy added, not one the client sent', () => {
    expect(clientIp(req('127.0.0.1', '10.0.0.1, 198.51.100.1'), true)).toBe('198.51.100.1');
    expect(clientIp(req('127.0.0.1', ['10.0.0.1', '198.51.100.1']), true)).toBe('198.51.100.1');
  });

  it('does not believe the header from a connection that is not from loopback', () => {
    expect(clientIp(req('203.0.113.9', '198.51.100.1'), true)).toBe('203.0.113.9');
  });

  it('falls back to the socket when the header is missing or is not an address', () => {
    expect(clientIp(req('127.0.0.1'), true)).toBe('127.0.0.1');
    expect(clientIp(req('127.0.0.1', 'not-an-ip'), true)).toBe('127.0.0.1');
    expect(clientIp(req('127.0.0.1', ''), true)).toBe('127.0.0.1');
    expect(clientIp(req(undefined), true)).toBe('unknown');
  });
});
