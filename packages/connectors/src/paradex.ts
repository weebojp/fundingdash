import type { FundingHistoryPoint, FundingSnapshot } from '@evplus/contracts';
import type { ConnectorFactory, ConnectorOptions, FundingConnector } from './index.js';
import { fetchJson, HttpError } from './httpClient.js';
import { createHistoryPoint, createSnapshot, roundToPrecision } from './normalization.js';

const DEFAULT_BASE_URL = 'https://api.prod.paradex.trade';
const DEFAULT_MARKETS = ['BTC-USD-PERP', 'ETH-USD-PERP', 'SOL-USD-PERP'];
const DEFAULT_MAX_MARKETS = 300;

function normalizeBaseSymbol(symbol: string) {
  return symbol.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

interface MarketResponse {
  results: Array<{
    symbol: string;
    asset_kind: string;
  }>;
}

interface FundingDataResponse {
  next?: string | null;
  results: ParadexFundingRecord[];
}

interface ParadexFundingRecord {
  market: string;
  funding_rate: string;
  funding_period_hours?: number;
  funding_rate_8h?: string;
  funding_premium?: string;
  funding_index?: string;
  created_at: number;
}

function buildUrl(baseUrl: string, path: string) {
  const base = new URL(baseUrl);
  const cleanedPath = path.startsWith('/') ? path.slice(1) : path;
  const basePath = base.pathname.replace(/\/$/, '');
  base.pathname = `${basePath}/v1/${cleanedPath}`.replace(/\/+/g, '/');
  base.search = '';
  return base;
}

async function getMarkets(baseUrl: string): Promise<string[]> {
  const url = buildUrl(baseUrl, 'markets');
  try {
    const response = await fetchJson<MarketResponse>(url.toString(), {
      headers: { Accept: 'application/json' }
    });
    if (!response?.results?.length) {
      throw new Error('Paradex markets response empty');
    }
    return response.results
      .filter(
        (item) =>
          item.asset_kind === 'PERP' &&
          typeof item.symbol === 'string' &&
          /-USD-PERP$/i.test(item.symbol)
      )
      .map((item) => item.symbol);
  } catch (error) {
    handleError('markets', error);
  }
}

async function getFundingData(
  baseUrl: string,
  market: string,
  params?: { start_at?: number; end_at?: number; page_size?: number },
  attempt = 0
): Promise<FundingDataResponse> {
  const url = buildUrl(baseUrl, 'funding/data');
  url.searchParams.set('market', market);
  if (params?.start_at) url.searchParams.set('start_at', params.start_at.toString());
  if (params?.end_at) url.searchParams.set('end_at', params.end_at.toString());
  url.searchParams.set('page_size', String(params?.page_size ?? 100));

  try {
    return await fetchJson<FundingDataResponse>(url.toString(), {
      headers: { Accept: 'application/json' }
    });
  } catch (error) {
    if (error instanceof HttpError && error.status === 429 && attempt < 3) {
      await delay(500 * (attempt + 1));
      return getFundingData(baseUrl, market, params, attempt + 1);
    }
    handleError('funding/data', error);
  }
}

function handleError(endpoint: string, error: unknown): never {
  if (error instanceof HttpError) {
    console.warn(`Paradex ${endpoint} HTTP error: ${error.url} → ${error.message}`);
  } else {
    console.warn(`Paradex ${endpoint} error: ${(error as Error).message}`);
  }
  throw error instanceof Error ? error : new Error(String(error));
}

const paradexConnector: ConnectorFactory = (options?: ConnectorOptions): FundingConnector => {
  const baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
  const explicitMarkets = options?.markets;
  const maxMarkets = Math.max(1, options?.maxMarkets ?? DEFAULT_MAX_MARKETS);

  return {
    name: 'Paradex',
    async fetchLatest() {
      const marketsSource = explicitMarkets?.length
        ? explicitMarkets
        : await getMarkets(baseUrl).catch(() => DEFAULT_MARKETS);

      const markets = marketsSource.filter((symbol) => symbol.endsWith('-USD-PERP'));
      const limited = markets.slice(0, maxMarkets);

      const snapshots: FundingSnapshot[] = [];

      for (const market of limited) {
        try {
          const response = await getFundingData(baseUrl, market, { page_size: 1 });
          const record = response.results?.[0];
          if (!record) continue;

          const rate = parseNumber(record.funding_rate);
          const periodHours = record.funding_period_hours && record.funding_period_hours > 0
            ? record.funding_period_hours
            : 8;

          snapshots.push(
            createSnapshot({
              symbol: market,
              exchange: 'Paradex',
              fundingRatePct: (rate ?? 0) * 100,
              periodHours,
              markPrice: null,
              collectedAt: record.created_at
            })
          );
        } catch (error) {
          if (error instanceof HttpError && error.status === 404) {
            console.warn(`Paradex market ${market} not found`);
            continue;
          }
          throw error;
        }
      }

      if (!snapshots.length) {
        throw new Error('Paradex latest funding response empty');
      }
      return snapshots;
    },
    async fetchHistory(symbol, params) {
      const marketsSource = explicitMarkets?.length
        ? explicitMarkets
        : await getMarkets(baseUrl).catch(() => DEFAULT_MARKETS);

      const targetMarket = await resolveMarketSymbol(marketsSource, baseUrl, symbol);
      const start_at = params.from.getTime();
      const end_at = params.to.getTime();

      let cursor: string | undefined;
      const points: FundingHistoryPoint[] = [];

      while (true) {
        let response: FundingDataResponse;
        try {
          response = await getFundingData(baseUrl, targetMarket, {
            start_at,
            end_at,
            page_size: 500
          });
        } catch (error) {
          if (error instanceof HttpError && error.status === 404) {
            console.warn(`Paradex market ${targetMarket} not found for history`);
            break;
          }
          if (error instanceof HttpError && error.status === 429) {
            console.warn(`Paradex rate limit encountered for ${targetMarket} history`);
            break;
          }
          throw error;
        }

        response.results?.forEach((record) => {
          const rate = parseNumber(record.funding_rate);
          points.push(
            createHistoryPoint({
              symbol: record.market ?? targetMarket,
              exchange: 'Paradex',
              bucketStart: record.created_at,
              bucketDurationHours: record.funding_period_hours && record.funding_period_hours > 0
                ? record.funding_period_hours
                : params.granularityHours,
              avgFundingRatePct: (rate ?? 0) * 100,
              maxFundingRatePct: record.funding_rate_8h
                ? roundToPrecision(Number(record.funding_rate_8h) * 100)
                : undefined,
              minFundingRatePct: undefined,
              sourceCount: 1
            })
          );
        });

        cursor = response.next ?? undefined;
        if (!cursor) break;

        await delay(200);
      }

      if (!points.length) {
        console.warn(`Paradex funding history empty for ${targetMarket}`);
        return [];
      }

      return points;
    }
  };
};

async function resolveMarketSymbol(
  marketsSource: string[],
  baseUrl: string,
  requested: string
): Promise<string> {
  if (/-USD-PERP$/i.test(requested)) {
    return requested;
  }

  const normalizedRequested = normalizeBaseSymbol(requested);
  const candidates = marketsSource.length
    ? marketsSource
    : await getMarkets(baseUrl).catch(() => DEFAULT_MARKETS);

  const match = candidates.find((market) => {
    const normalizedMarket = normalizeBaseSymbol(market.split('-')[0] ?? market);
    return normalizedMarket === normalizedRequested;
  });

  if (match) {
    return match;
  }

  return requested;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseNumber(value?: string | number | null): number | null {
  if (value === undefined || value === null) return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export default paradexConnector;
