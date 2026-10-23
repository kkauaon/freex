import { z } from 'zod';

export const HealthResponse = z.object({
  status: z.literal('ok'),
  profileVersion: z.number().int(),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

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
        ]),
        text: z.string().max(10_000),
      }),
    )
    .max(20_000),
});
export type PaginateRequest = z.infer<typeof PaginateRequest>;

export const PaginateResponse = z.object({
  profileVersion: z.number().int(),
  pageCount: z.number().int(),
  pages: z.array(
    z.object({
      number: z.number().int(),
      lines: z.array(z.object({ type: z.string(), col: z.number().int(), text: z.string() })),
    }),
  ),
});
export type PaginateResponse = z.infer<typeof PaginateResponse>;
