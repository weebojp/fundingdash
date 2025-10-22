import type { FundingHistoryPoint, FundingSnapshot } from '@evplus/contracts';
import type { ConnectorFactory, ConnectorOptions, FundingConnector } from './index.js';
import { fetchJson, HttpError } from './httpClient.js';
import { createHistoryPoint, createSnapshot } from './normalization.js';

const DEFAULT_BASE_URL = 'https://api.hyperliquid.xyz';

const HYPERLIQUID_SYMBOL_MAP: Record<string, string> = {
  BTC: 'BTC',
  ETH: 'ETH'
};

type PredictedFundingEntry = [
  string,
  Array<
    [
      string,
      {
        fundingRate: string | number;
        nextFundingTime?: number;
      }
    ]
  >
];

type PredictedFundingResponse = PredictedFundingEntry[];

type FundingHistoryRecord = {
  coin: string;
  fundingRate: number;
  fundingRate8h?: number;
  startTime: number;
  endTime?: number;
};

type FundingHistoryResponse = {
  fundingRates: FundingHistoryRecord[];
};

async function fetchPredictedFunding(baseUrl: string) {
  const url = new URL('/info', baseUrl).toString();
  try {
    return await fetchJson<PredictedFundingResponse>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'predictedFundings' })
    });
  } catch (error) {
    if (error instanceof HttpError) {
      console.warn(`Hyperliquid predicted funding HTTP error: ${error.url} → ${error.message}`);
    } else {
      console.warn(`Hyperliquid predicted funding error: ${(error as Error).message}`);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}

async function fetchFundingHistory(
  baseUrl: string,
  coin: string,
  params: { from: Date; to: Date; granularityHours: number }
) {
  const url = new URL('/fundingHistory', baseUrl).toString();
  try {
    return await fetchJson<FundingHistoryResponse>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'fundingHistory',
        coin,
        startTime: params.from.getTime(),
        endTime: params.to.getTime(),
        intervalHours: params.granularityHours
      })
    });
  } catch (error) {
    if (error instanceof HttpError) {
      console.warn(`Hyperliquid funding history HTTP error: ${error.url} → ${error.message}`);
    } else {
      console.warn(`Hyperliquid funding history error: ${(error as Error).message}`);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}

function resolveCoin(symbol: string): string {
  const key = symbol.replace(/[^A-Z]/gi, '').toUpperCase();
  return HYPERLIQUID_SYMBOL_MAP[key] ?? key;
}

const hyperliquidConnector: ConnectorFactory = (options?: ConnectorOptions): FundingConnector => {
  const baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;

  return {
    name: 'Hyperliquid',
    async fetchLatest() {
      const predicted = await fetchPredictedFunding(baseUrl);
      const snapshots: FundingSnapshot[] = [];

      predicted.forEach(([coin, venues]) => {
        const venueEntry = venues.find(([venue]) => venue === 'HlPerp');
        if (!venueEntry) return;
        const [, data] = venueEntry;
        const fundingRate = typeof data.fundingRate === 'string' ? Number(data.fundingRate) : data.fundingRate;
        const resolvedCoin = resolveCoin(coin);

        snapshots.push(
          createSnapshot({
            symbol: resolvedCoin,
            exchange: 'Hyperliquid',
            fundingRatePct: (fundingRate ?? 0) * 100,
            periodHours: 8,
            markPrice: null,
            collectedAt: Date.now(),
            nextFundingAt: data.nextFundingTime ?? null
          })
        );
      });

      if (!snapshots.length) {
        throw new Error('Hyperliquid predicted funding response empty');
      }

      return snapshots;
    },
    async fetchHistory(symbol, params) {
      const coin = resolveCoin(symbol);
      const response = await fetchFundingHistory(baseUrl, coin, params);
      if (!response.fundingRates?.length) {
        throw new Error(`Hyperliquid funding history empty for ${symbol}`);
      }

      return response.fundingRates.map((record) =>
        createHistoryPoint({
          symbol: resolveCoin(record.coin),
          exchange: 'Hyperliquid',
          bucketStart: record.startTime,
          bucketDurationHours: params.granularityHours,
          avgFundingRatePct: (record.fundingRate8h ?? record.fundingRate ?? 0) * 100,
          sourceCount: 1
        })
      );
    }
  };
};

export default hyperliquidConnector;
