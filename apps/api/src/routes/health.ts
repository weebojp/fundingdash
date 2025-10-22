import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

export async function healthRoute(server: FastifyInstance, _opts: FastifyPluginOptions) {
  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
}
