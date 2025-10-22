import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { fundingHistoryResponseSchema } from '@evplus/contracts/schemas';
import type { FundingService } from '../services/fundingService.js';

type HistoryRouteOptions = FastifyPluginOptions & {
  fundingService: FundingService;
};

export async function historyFundingRoute(server: FastifyInstance, opts: HistoryRouteOptions) {
  const { fundingService } = opts;

  server.get('/funding/history', async (request) => {
    const { symbol = 'BTC', range = '24h', granularity = '1h', refresh } = request.query as {
      symbol?: string;
      range?: string;
      granularity?: string;
      refresh?: string;
    };

    const now = new Date();
    const lowerBound = new Date(now);

    const rangeMatch = range.match(/(\d+)([hd])/);
    const rangeHours = (() => {
      if (!rangeMatch) return 24;
      const amount = Number(rangeMatch[1]);
      const unit = rangeMatch[2];
      return unit === 'd' ? amount * 24 : amount;
    })();

    if (rangeMatch) {
      const [, value, unit] = rangeMatch;
      const amount = Number(value);
      if (unit === 'h') {
        lowerBound.setHours(lowerBound.getHours() - amount);
      } else if (unit === 'd') {
        lowerBound.setDate(lowerBound.getDate() - amount);
      }
    }

    const granularityMatch = granularity.match(/(\d+)([hd])/);
    const granularityHours = (() => {
      if (!granularityMatch) return 1;
      const amount = Number(granularityMatch[1]);
      const unit = granularityMatch[2];
      return unit === 'd' ? amount * 24 : amount;
    })();

    const points = await fundingService.getCachedHistoryForSymbol(
      symbol,
      {
        from: lowerBound,
        to: now,
        granularityHours
      },
      `${granularityHours}h-${rangeHours}h`,
      { forceRefresh: refresh === 'true' }
    );

    return fundingHistoryResponseSchema.parse({
      symbol,
      range,
      granularity,
      points
    });
  });
}
