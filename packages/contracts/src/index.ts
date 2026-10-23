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

export const PaginateRequest = z.object({
  blocks: z
    .array(
      z.object({
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
      }),
    )
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
