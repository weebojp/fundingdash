import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { arbitrageResponseSchema } from '@evplus/contracts/schemas';
import type { ArbitrageResponse } from '@evplus/contracts';

export async function arbitrageRoute(server: FastifyInstance, _opts: FastifyPluginOptions) {
  server.get('/funding/arbitrage', async () => {
    const payload: ArbitrageResponse = {
      generatedAt: new Date().toISOString(),
      opportunities: []
    };

    return arbitrageResponseSchema.parse(payload);
  });
}
