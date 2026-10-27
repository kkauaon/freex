import { z } from 'zod';

export const HealthResponse = z.object({
  status: z.literal('ok'),
  profileVersion: z.number().int(),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

export const TitlePageInput = z.object({
  title: z.string().max(500),
  authors: z.array(z.string().max(200)).max(10),
  credit: z.string().max(200).optional(),
  source: z.string().max(200).optional(),
  contact: z.string().max(1_000).optional(),
  date: z.string().max(100).optional(),
});
export type TitlePageInput = z.infer<typeof TitlePageInput>;

/** One element of the script as it travels between the editor, the API and the collaboration service. */
export const BlockInput = z.object({
  type: z.enum([
    'scene-heading',
    'action',
    'character',
    'parenthetical',
    'dialogue',
    'transition',
    'shot',
  ]),
  text: z.string().max(10_000),
  marks: z
    .array(
      z.object({
        type: z.enum(['bold', 'italic', 'underline']),
        from: z.number().int().min(0),
        to: z.number().int().min(0),
      }),
    )
    .max(1_000)
    .optional(),
  column: z.enum(['left', 'right']).optional(),
});
export type BlockInput = z.infer<typeof BlockInput>;

export const PaginateRequest = z.object({
  blocks: z.array(BlockInput)
    .max(20_000),
  titlePage: TitlePageInput.optional(),
  /** Include the title page when one is sent. Default true. */
  includeTitle: z.boolean().optional(),
  /** Script pages to keep, by logical number; pages are never renumbered. */
  range: z
    .object({ from: z.number().int().min(1), to: z.number().int().min(1) })
    .refine((r) => r.from <= r.to, { message: 'from must not exceed to' })
    .optional(),
});
export type PaginateRequest = z.infer<typeof PaginateRequest>;

export const PaginateResponse = z.object({
  profileVersion: z.number().int(),
  layoutVersion: z.number().int(),
  /** `sha256:` hash of the canonical layout (FR-FMT-014). */
  hash: z.string(),
  pageCount: z.number().int(),
  pages: z.array(
    z.object({
      number: z.number().int(),
      kind: z.enum(['title', 'script']),
      printedNumber: z.number().int().nullable(),
      rows: z.number().int(),
      lines: z.array(
        z.object({
          type: z.string(),
          // the title page uses half rows
          row: z.number(),
          // dual dialogue cues sit on half columns
          col: z.number(),
          text: z.string(),
          marks: z
            .array(z.object({ type: z.string(), from: z.number().int(), to: z.number().int() }))
            .optional(),
        }),
      ),
    }),
  ),
});
export type PaginateResponse = z.infer<typeof PaginateResponse>;

// ---------------------------------------------------------------- sharing (no accounts)

/** The cover as the editor edits it: plain strings, one author or contact datum per line. */
export const CoverFields = z.object({
  title: z.string().max(500),
  credit: z.string().max(200),
  authors: z.string().max(1_000),
  source: z.string().max(200),
  contact: z.string().max(1_000),
  date: z.string().max(100),
});
export type CoverFields = z.infer<typeof CoverFields>;

/** `spec` discourages camera directions; `production` allows them. It is a property of the script. */
export const ScriptProfile = z.enum(['spec', 'production']);
export type ScriptProfile = z.infer<typeof ScriptProfile>;

export const CreateShareRequest = z.object({
  blocks: z.array(BlockInput).max(20_000),
  cover: CoverFields.optional(),
  profile: ScriptProfile.optional(),
});
export type CreateShareRequest = z.infer<typeof CreateShareRequest>;

/** The token is the whole secret of a shared script: whoever has it can read and edit. */
export const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export const CreateShareResponse = z.object({
  token: z.string().regex(SHARE_TOKEN_PATTERN),
});
export type CreateShareResponse = z.infer<typeof CreateShareResponse>;

/** Names of the shared types inside the Y.Doc of a shared script (docs/03-arquitetura/colaboracao-tempo-real.md 3.1). */
export const COLLAB_TYPES = {
  /** The script: a Y.XmlFragment kept by y-prosemirror. */
  content: 'content',
  /** The cover: a Y.Map of the fields of `CoverFields`. */
  cover: 'cover',
  /** `schemaVersion` and `profile` (a `ScriptProfile`). */
  meta: 'meta',
  /** Who edited and when: a Y.Map from participant name to `{ at }`. */
  contributors: 'contributors',
} as const;

/** What the service tells the people in a room each time it saves (a "stateless" message). */
export const SavedNotice = z.object({
  type: z.literal('saved'),
  /** Epoch milliseconds of the last modification the server has saved. */
  at: z.number().int().positive(),
});
export type SavedNotice = z.infer<typeof SavedNotice>;

export function encodeSavedNotice(at: number): string {
  return JSON.stringify({ type: 'saved', at } satisfies SavedNotice);
}

/** The time of a "saved" notice, or null for anything else. The payload comes from the network, so it is checked. */
export function parseSavedNotice(payload: unknown): number | null {
  if (typeof payload !== 'string' || payload.length > 200) return null;
  try {
    const parsed = SavedNotice.safeParse(JSON.parse(payload));
    return parsed.success ? parsed.data.at : null;
  } catch {
    return null;
  }
}

export const PARTICIPANT_NAME_MAX = 30;

/**
 * Cleans the name a person gives to join a shared script: Unicode-normalised, without control,
 * format (bidi overrides, zero-width) or line-break characters, with single spaces, cut at 30
 * characters. Returns '' when nothing usable is left. Never throws, so it is safe on any input
 * that arrives from another participant.
 */
export function sanitizeParticipantName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const cleaned = raw
    .normalize('NFC')
    // line breaks and tabs are control characters too: they become spaces before the rest goes
    .replace(/\s+/gu, ' ')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
  return Array.from(cleaned).slice(0, PARTICIPANT_NAME_MAX).join('').trim();
}
