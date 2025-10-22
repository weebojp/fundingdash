import type { FundingHistoryPoint, FundingSnapshot } from '@evplus/contracts';
import type { ConnectorFactory, ConnectorOptions, FundingConnector } from './index.js';
import { fetchJson, HttpError } from './httpClient.js';
import { createHistoryPoint, createSnapshot } from './normalization.js';

type AsterPremiumIndexRecord = {
  symbol: string;
  markPrice: string;
  indexPrice: string;
  lastFundingRate: string;
  nextFundingTime: string;
  time: string;
};

type AsterFundingInfoRecord = {
  symbol: string;
  fundingIntervalHours: number;
};

type AsterFundingRateRecord = {
  symbol: string;
  fundingRate: string;
  fundingTime: number;
};

const DEFAULT_BASE_URL = 'https://fapi.asterdex.com';
const ASTER_SYMBOL_MAP: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT'
};

const PREFIX = '/fapi/v1';

async function getPremiumIndex(
  baseUrl: string,
  apiKey?: string,
  symbol?: string
): Promise<AsterPremiumIndexRecord[]> {
  const url = new URL(`${PREFIX}/premiumIndex`, baseUrl);
  if (symbol) {
    url.searchParams.set('symbol', symbol);
  }

  try {
    return await fetchJson<AsterPremiumIndexRecord[]>(url.toString(), {
      headers: buildHeaders(apiKey)
    });
  } catch (error) {
    handleAsterError('premiumIndex', error);
  }
}

async function getFundingHistory(
  baseUrl: string,
  apiKey: string | undefined,
  symbol: string,
  params: { from: Date; to: Date; granularityHours: number }
): Promise<AsterFundingRateRecord[]> {
  const resolvedSymbol = resolveAsterSymbol(symbol);
  const url = new URL(`${PREFIX}/fundingRate`, baseUrl);
  url.searchParams.set('symbol', resolvedSymbol);
  url.searchParams.set('startTime', params.from.getTime().toString());
  url.searchParams.set('endTime', params.to.getTime().toString());
  url.searchParams.set('limit', '1000');

  try {
    return await fetchJson<AsterFundingRateRecord[]>(url.toString(), {
      headers: buildHeaders(apiKey)
    });
  } catch (error) {
    handleAsterError('fundingRate', error);
  }
}

function buildHeaders(apiKey?: string) {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['X-MBX-APIKEY'] = apiKey;
  }
  return headers;
}

function handleAsterError(endpoint: string, error: unknown): never {
  if (error instanceof HttpError) {
    console.warn(`Aster ${endpoint} HTTP error: ${error.url} → ${error.message}`);
  } else {
    console.warn(`Aster ${endpoint} error: ${(error as Error).message}`);
  }
  throw error instanceof Error ? error : new Error(String(error));
}

const asterConnector: ConnectorFactory = (options?: ConnectorOptions): FundingConnector => {
  const baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
  const apiKey = options?.apiKey;

  return {
    name: 'Aster',
    async fetchLatest() {
      const premiumIndex = await getPremiumIndex(baseUrl, apiKey);

      if (!premiumIndex.length) {
        throw new Error('Aster premium index response empty');
      }

      return premiumIndex.map((record) => {
        const intervalHours = inferIntervalHours(record);
        const fundingRate = parseNumber(record.lastFundingRate);
        return createSnapshot({
          symbol: record.symbol,
          exchange: 'Aster',
          fundingRatePct: (fundingRate ?? 0) * 100,
          periodHours: intervalHours,
          markPrice: parseNumber(record.markPrice),
          collectedAt: Number(record.time),
          nextFundingAt: Number(record.nextFundingTime)
        });
      });
    },
    async fetchHistory(symbol, params) {
      const resolvedSymbol = resolveAsterSymbol(symbol);
      const records = await getFundingHistory(baseUrl, apiKey, symbol, params);

      if (!records.length) {
        throw new Error(`Aster funding history empty for ${symbol}`);
      }

      return records.map((record) =>
        createHistoryPoint({
          symbol: record.symbol ?? resolvedSymbol,
          exchange: 'Aster',
          bucketStart: record.fundingTime,
          bucketDurationHours: params.granularityHours,
          avgFundingRatePct: (parseNumber(record.fundingRate) ?? 0) * 100,
          sourceCount: 1
        })
      );
    }
  };
};

function parseNumber(value: string | number | null | undefined): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function inferIntervalHours(record: AsterPremiumIndexRecord): number {
  if (record.nextFundingTime && record.time) {
    const diffMs = Number(record.nextFundingTime) - Number(record.time);
    if (Number.isFinite(diffMs) && diffMs > 0) {
      const hours = diffMs / (1000 * 60 * 60);
      if (hours >= 0.5) {
        return Math.round(hours * 100) / 100;
      }
    }
  }
  return 8; // fallback
}

function resolveAsterSymbol(symbol: string): string {
  const key = symbol.replace(/[^A-Z]/gi, '').toUpperCase();
  return ASTER_SYMBOL_MAP[key] ?? symbol;
}

export default asterConnector;
