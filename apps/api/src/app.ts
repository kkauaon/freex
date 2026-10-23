import Fastify from 'fastify';
import cors from '@fastify/cors';
import { renderPdf } from '@freex/pdf';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { HealthResponse, PaginateRequest, PaginateResponse } from '@freex/contracts';
import { LAYOUT_VERSION, layoutDocument, layoutHash } from '@freex/layout';
import { PROFILE_VERSION } from '@freex/screenplay';

export function buildApp() {
  // Pino logger is built into Fastify; request bodies (script text) are never logged.
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  // CORS: only the web app origin, no wildcard.
  void app.register(cors, { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' });

  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get('/v1/health', { schema: { response: { 200: HealthResponse } } }, async () => ({
    status: 'ok' as const,
    profileVersion: PROFILE_VERSION,
  }));

  // Foundation endpoint: exercises the shared layout engine. Auth is not implemented yet.
  r.post(
    '/v1/layout/paginate',
    { schema: { body: PaginateRequest, response: { 200: PaginateResponse } } },
    async (req) => {
      const pages = layoutDocument(req.body.blocks, req.body);
      return {
        profileVersion: PROFILE_VERSION,
        layoutVersion: LAYOUT_VERSION,
        hash: layoutHash(pages),
        pageCount: pages.length,
        pages: pages.map((p) => ({
          number: p.number,
          kind: p.kind,
          printedNumber: p.printedNumber,
          rows: p.rows,
          lines: p.lines.map((l) => ({
            type: l.type,
            row: l.row,
            col: l.col,
            text: l.text,
            ...(l.marks && { marks: [...l.marks] }),
          })),
        })),
      };
    },
  );

  // Foundation shortcut: PDF is rendered synchronously here until apps/worker exists.
  // Concurrency is limited to one render at a time to bound Chromium memory.
  let rendering: Promise<unknown> = Promise.resolve();
  r.post('/v1/export/pdf', { schema: { body: PaginateRequest } }, async (req, reply) => {
    const pages = layoutDocument(req.body.blocks, req.body);
    const job = rendering.then(() => renderPdf(pages));
    rendering = job.catch(() => undefined);
    const pdf = await job;
    return reply
      .header('content-type', 'application/pdf')
      .header('content-disposition', 'attachment; filename="roteiro.pdf"')
      .send(pdf);
  });

  return app;
}
