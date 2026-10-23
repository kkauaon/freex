import type { IncomingMessage, ServerResponse } from 'node:http';
import { Server } from '@hocuspocus/server';
import * as Y from 'yjs';
import { CreateShareRequest, encodeSavedNotice, sanitizeParticipantName } from '@freex/contracts';
import type { CollabConfig } from './config';
import { RateLimiter } from './rate-limit';
import { buildShareState } from './share';
import { FileShareStore, type ShareStore } from './store';
import { docIdOf, isToken, newToken } from './tokens';

export type LogFn = (event: string, fields?: Record<string, string | number>) => void;

export interface CollabServerOptions {
  readonly store?: ShareStore;
  /** Structured log. Never receives script text, names or tokens. */
  readonly log?: LogFn;
}

const COLOR = /^#[0-9a-f]{6}$/i;

/**
 * Cleans what a client says about itself. Awareness is typed by the client, so another
 * participant may send anything: only a clean name, a colour and the cursor survive.
 */
export function cleanAwarenessState(state: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const user = state.user;
  if (typeof user === 'object' && user !== null) {
    const u = user as Record<string, unknown>;
    const name = sanitizeParticipantName(u.name);
    // a person without a name is not shown: names are what tell the others who is editing
    if (name !== '') out.user = { name, color: typeof u.color === 'string' && COLOR.test(u.color) ? u.color : '#6b7280' };
  }
  const cursor = state.cursor;
  if (typeof cursor === 'object' && cursor !== null && 'anchor' in cursor && 'head' in cursor) {
    out.cursor = { anchor: (cursor as Record<string, unknown>).anchor, head: (cursor as Record<string, unknown>).head };
  }
  return out;
}

function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage, max: number): Promise<Buffer | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > max) return null;
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

export function createCollabServer(config: CollabConfig, options: CollabServerOptions = {}) {
  const store = options.store ?? new FileShareStore(config.dataDir);
  const log: LogFn = options.log ?? (() => undefined);
  const createLimit = new RateLimiter(config.createPerMinute, 60_000);
  const connectionsPerIp = new Map<string, number>();
  const messageWindows = new WeakMap<object, { start: number; count: number }>();
  const allowed = new Set(config.allowedOrigins);

  const originAllowed = (origin: string | undefined) => origin === undefined || allowed.has(origin);

  const cors = (req: IncomingMessage): Record<string, string> => {
    const origin = req.headers.origin;
    return origin && allowed.has(origin)
      ? {
          'access-control-allow-origin': origin,
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
          'access-control-max-age': '600',
          vary: 'Origin',
        }
      : { vary: 'Origin' };
  };

  async function createShare(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const headers = cors(req);
    if (!originAllowed(req.headers.origin)) return sendJson(res, 403, { error: 'origin not allowed' }, headers);
    const ip = req.socket.remoteAddress ?? 'unknown';
    if (!createLimit.hit(ip)) return sendJson(res, 429, { error: 'too many requests' }, { ...headers, 'retry-after': '60' });
    if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) {
      return sendJson(res, 415, { error: 'expected application/json' }, headers);
    }
    const body = await readBody(req, config.maxBodyBytes);
    if (body === null) {
      sendJson(res, 413, { error: 'body too large' }, { ...headers, connection: 'close' });
      req.destroy();
      return;
    }
    let parsed: ReturnType<typeof CreateShareRequest.safeParse>;
    try {
      parsed = CreateShareRequest.safeParse(JSON.parse(body.toString('utf8')));
    } catch {
      return sendJson(res, 400, { error: 'invalid json' }, headers);
    }
    if (!parsed.success) return sendJson(res, 400, { error: 'invalid request' }, headers);

    const token = newToken();
    await store.save(docIdOf(token), buildShareState(parsed.data));
    log('share.created', { blocks: parsed.data.blocks.length });
    return sendJson(res, 201, { token }, headers);
  }

  const server = new Server({
    name: 'freex-collab',
    quiet: true,
    port: config.port,
    address: config.host,
    stopOnSignals: false,
    debounce: config.storeDebounceMs,
    maxDebounce: config.storeMaxDebounceMs,
    timeout: 30_000,
    websocketOptions: { maxPayload: config.maxMessageBytes },

    async onRequest({ request, response }) {
      const url = new URL(request.url ?? '/', 'http://localhost');
      const handled = (() => {
        if (request.method === 'OPTIONS') {
          response.writeHead(204, cors(request));
          response.end();
        } else if (request.method === 'GET' && url.pathname === '/health') {
          sendJson(response, 200, { status: 'ok' });
        } else if (request.method === 'POST' && url.pathname === '/v1/shares') {
          return createShare(request, response).catch((error: unknown) => {
            log('share.error', { message: error instanceof Error ? error.name : 'unknown' });
            if (!response.headersSent) sendJson(response, 500, { error: 'internal error' }, cors(request));
          });
        } else {
          sendJson(response, 404, { error: 'not found' });
        }
        return undefined;
      })();
      await handled;
      // the response is already sent: stop the default "Welcome" page
      return Promise.reject();
    },

    async onUpgrade({ request, socket }) {
      const reject = (status: string) => {
        socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
        socket.destroy();
        return Promise.reject();
      };
      if (!originAllowed(request.headers.origin)) return reject('403 Forbidden');
      const ip = request.socket.remoteAddress ?? 'unknown';
      const open = connectionsPerIp.get(ip) ?? 0;
      if (open >= config.maxConnectionsPerIp) return reject('429 Too Many Requests');
      connectionsPerIp.set(ip, open + 1);
      socket.once('close', () => {
        const left = (connectionsPerIp.get(ip) ?? 1) - 1;
        if (left <= 0) connectionsPerIp.delete(ip);
        else connectionsPerIp.set(ip, left);
      });
      return undefined;
    },

    async onConnect({ documentName, instance }) {
      const room = instance.documents.get(documentName);
      if (room && room.getConnectionsCount() >= config.maxConnectionsPerDoc) throw new Error('room full');
    },

    async onAuthenticate({ token, documentName }) {
      // the same answer for every failure: a wrong token says nothing about what exists
      if (!isToken(token) || documentName !== docIdOf(token) || !(await store.exists(documentName))) {
        throw new Error('forbidden');
      }
      return { docId: documentName };
    },

    async onLoadDocument({ document, documentName }) {
      const state = await store.load(documentName);
      if (state) Y.applyUpdate(document, state);
      log('room.loaded');
    },

    async onStoreDocument({ document, documentName }) {
      await store.save(documentName, Y.encodeStateAsUpdate(document));
    },

    // everyone in the room learns when the server last saved, not when their own browser sent
    async afterStoreDocument({ document, documentName }) {
      const at = (await store.modifiedAt(documentName)) ?? Date.now();
      document.broadcastStateless(encodeSavedNotice(at));
    },

    // a person who arrives is told the time of the last save already on disk
    async connected({ connection, documentName }) {
      const at = await store.modifiedAt(documentName);
      if (at !== null) connection.sendStateless(encodeSavedNotice(at));
    },

    async beforeHandleMessage({ connection }) {
      const now = Date.now();
      const w = messageWindows.get(connection);
      if (!w || now - w.start >= 1_000) {
        messageWindows.set(connection, { start: now, count: 1 });
        return;
      }
      w.count++;
      if (w.count > config.messagesPerSecond) {
        connection.close({ code: 4429, reason: 'rate limited' });
        throw new Error('rate limited');
      }
    },

    async beforeHandleAwareness({ states }) {
      for (const [clientId, state] of states) {
        const clean = cleanAwarenessState(state);
        for (const key of Object.keys(state)) delete state[key];
        Object.assign(state, clean);
        if (Object.keys(clean).length === 0) states.set(clientId, {});
      }
    },
  });

  return {
    server,
    async start(): Promise<number> {
      await server.listen();
      return server.address.port;
    },
    async stop(): Promise<void> {
      await server.destroy();
    },
  };
}
