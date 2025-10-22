import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { fundingLatestResponseSchema } from '@evplus/contracts/schemas';
import type { FundingService } from '../services/fundingService.js';

type LatestRouteOptions = FastifyPluginOptions & {
  fundingService: FundingService;
};

export async function latestFundingRoute(server: FastifyInstance, opts: LatestRouteOptions) {
  const { fundingService } = opts;

  server.get('/funding/latest', async (request) => {
    const { refresh } = request.query as { refresh?: string };
    const cache = await fundingService.getCachedLatestFundingSnapshots({
      forceRefresh: refresh === 'true'
    });

    return fundingLatestResponseSchema.parse(cache);
  });
}
