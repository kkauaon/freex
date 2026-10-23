import { resolve } from 'node:path';
import { z } from 'zod';

const Env = z.object({
  PORT: z.coerce.number().int().min(0).max(65535).default(3002),
  HOST: z.string().default('0.0.0.0'),
  COLLAB_DATA_DIR: z.string().default('.data/collab'),
  /** Comma separated origins of the web app allowed to open sockets and create shares. */
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  MAX_CONNECTIONS_PER_DOC: z.coerce.number().int().positive().default(50),
  MAX_CONNECTIONS_PER_IP: z.coerce.number().int().positive().default(60),
  MESSAGES_PER_SECOND: z.coerce.number().int().positive().default(100),
  CREATE_PER_MINUTE: z.coerce.number().int().positive().default(10),
});

export interface CollabConfig {
  readonly port: number;
  readonly host: string;
  readonly dataDir: string;
  readonly allowedOrigins: readonly string[];
  readonly maxConnectionsPerDoc: number;
  readonly maxConnectionsPerIp: number;
  readonly messagesPerSecond: number;
  readonly createPerMinute: number;
  /** Largest WebSocket message (docs/03-arquitetura/colaboracao-tempo-real.md 4.3). */
  readonly maxMessageBytes: number;
  /** Largest body of `POST /v1/shares`. */
  readonly maxBodyBytes: number;
  readonly storeDebounceMs: number;
  readonly storeMaxDebounceMs: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): CollabConfig {
  const e = Env.parse(env);
  return {
    port: e.PORT,
    host: e.HOST,
    dataDir: resolve(e.COLLAB_DATA_DIR),
    allowedOrigins: e.WEB_ORIGIN.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    maxConnectionsPerDoc: e.MAX_CONNECTIONS_PER_DOC,
    maxConnectionsPerIp: e.MAX_CONNECTIONS_PER_IP,
    messagesPerSecond: e.MESSAGES_PER_SECOND,
    createPerMinute: e.CREATE_PER_MINUTE,
    maxMessageBytes: 1_048_576,
    maxBodyBytes: 3 * 1_048_576,
    storeDebounceMs: 2_000,
    storeMaxDebounceMs: 10_000,
  };
}
