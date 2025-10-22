import type { FundingSnapshot } from '@evplus/contracts';

export const mockSnapshots: FundingSnapshot[] = [
  {
    symbol: 'BTCUSDT',
    exchange: 'Hyperliquid',
    fundingRatePct: 0.0321,
    periodHours: 8,
    markPrice: 43210,
    collectedAt: new Date().toISOString(),
    nextFundingAt: null
  },
  {
    symbol: 'BTCUSDT',
    exchange: 'Aster',
    fundingRatePct: 0.021,
    periodHours: 4,
    markPrice: 43208,
    collectedAt: new Date().toISOString(),
    nextFundingAt: null
  },
  {
    symbol: 'ETHUSDT',
    exchange: 'Hyperliquid',
    fundingRatePct: -0.045,
    periodHours: 8,
    markPrice: 2345,
    collectedAt: new Date().toISOString(),
    nextFundingAt: null
  },
  {
    symbol: 'ETHUSDT',
    exchange: 'Aster',
    fundingRatePct: -0.025,
    periodHours: 1,
    markPrice: 2343,
    collectedAt: new Date().toISOString(),
    nextFundingAt: null
  },
  {
    symbol: 'ETHUSDT',
    exchange: 'Paradex',
    fundingRatePct: -0.005,
    periodHours: 1,
    markPrice: 2344,
    collectedAt: new Date().toISOString(),
    nextFundingAt: null
  }
];
