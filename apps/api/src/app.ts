import Fastify from 'fastify';
import cors from '@fastify/cors';
import { renderPdf } from '@freex/pdf';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { HealthResponse, PaginateRequest, PaginateResponse } from '@freex/contracts';
import { paginate } from '@freex/layout';
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
      const pages = paginate(req.body.blocks).map((p) => ({ number: p.number, lines: [...p.lines] }));
      return { profileVersion: PROFILE_VERSION, pageCount: pages.length, pages };
    },
  );

  // Foundation shortcut: PDF is rendered synchronously here until apps/worker exists.
  // Concurrency is limited to one render at a time to bound Chromium memory.
  let rendering: Promise<unknown> = Promise.resolve();
  r.post('/v1/export/pdf', { schema: { body: PaginateRequest } }, async (req, reply) => {
    const pages = paginate(req.body.blocks);
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
