import type { FundingHistoryPoint, FundingSnapshot } from '@evplus/contracts';
import type { ConnectorFactory, ConnectorOptions, FundingConnector } from './index.js';
import { fetchJson, HttpError } from './httpClient.js';
import { createHistoryPoint, createSnapshot } from './normalization.js';

const DEFAULT_BASE_URL = 'https://mainnet.zklighter.elliot.ai';

type LighterFundingRecord = {
  market_id?: number;
  exchange?: string;
  market?: string;
  symbol?: string;
  rate?: number;
  fundingRate?: number | string;
  funding_rate?: number | string;
  fundingIntervalHours?: number;
  funding_interval_hours?: number;
  timestamp?: number;
  collected_at?: number;
};

type LighterFundingResponse =
  | {
      code?: number;
      funding_rates?: LighterFundingRecord[];
    }
  | LighterFundingRecord[];

async function fetchFundingRates(baseUrl: string) {
  const url = new URL('/api/v1/funding-rates', baseUrl);
  try {
    return await fetchJson<LighterFundingResponse>(url.toString());
  } catch (error) {
    if (error instanceof HttpError) {
      console.warn(`Lighter funding-rates HTTP error: ${error.url} → ${error.message}`);
    } else {
      console.warn(`Lighter funding-rates error: ${(error as Error).message}`);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}

const lighterConnector: ConnectorFactory = (options?: ConnectorOptions): FundingConnector => {
  const baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;

  return {
    name: 'Lighter',
    async fetchLatest() {
      const response = await fetchFundingRates(baseUrl);
      const records = extractRecords(response);

      if (!records || !records.length) {
        throw new Error('Lighter funding rates response empty');
      }

      return records.map((record) => {
        const symbol = record.market ?? record.symbol;
        if (!symbol) {
          throw new Error('Lighter record missing market or symbol field');
        }

        const fundingRate = parseNumber(record.rate ?? record.fundingRate ?? record.funding_rate) ?? 0;
        const intervalHours = 8;
        const collectedAt = record.timestamp ?? record.collected_at ?? Date.now();

        return createSnapshot({
          symbol,
          exchange: normalizeExchange(record.exchange ?? 'lighter'),
          fundingRatePct: fundingRate * 100,
          periodHours: intervalHours,
          markPrice: null,
          collectedAt
        });
      });
    },
    async fetchHistory(symbol, params) {
      const target = normalizeTicker(symbol);
      const snapshots = await this.fetchLatest();
      const filtered = snapshots.filter((snap) => normalizeTicker(snap.symbol) === target);
      if (!filtered.length) {
        throw new Error(`Lighter history unavailable for ${symbol}`);
      }

      return filtered.map((snapshot) =>
        createHistoryPoint({
          symbol: snapshot.symbol,
          exchange: snapshot.exchange,
          bucketStart: snapshot.collectedAt,
          bucketDurationHours: params.granularityHours,
          avgFundingRatePct: snapshot.fundingRatePct,
          sourceCount: 1
        })
      );
    }
  };
};

function parseNumber(value: string | number | null | undefined): number | null {
  if (value === undefined || value === null) return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export default lighterConnector;

function extractRecords(response: LighterFundingResponse): LighterFundingRecord[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (response?.funding_rates) {
    return response.funding_rates;
  }

  return [];
}

function normalizeExchange(exchange: string): string {
  return exchange.toLowerCase();
}

function normalizeTicker(symbol: string): string {
  return symbol.replace(/[^A-Z]/gi, '').replace(/PERP$/i, '').replace(/USD(?:T|C)?$/i, '').toUpperCase();
}
