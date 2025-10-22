import type { FundingHistoryPoint, FundingSnapshot } from '@evplus/contracts';
import type { ConnectorFactory, ConnectorOptions, FundingConnector } from './index.js';
import { fetchJson, HttpError } from './httpClient.js';
import { createHistoryPoint, createSnapshot } from './normalization.js';

const DEFAULT_BASE_URL = 'https://pro.edgex.exchange';
const DEFAULT_CONTRACT_IDS = ['10000001', '10000002'];
const DEFAULT_MAX_CONTRACTS = 200;
const SYMBOL_PREFIXES = ['1000', '1'];
const SYMBOL_SUFFIXES = ['USDTPERP', 'USDPERP', 'USDCPERP', 'USDT', 'USDC', 'USD', 'PERP'];
const REQUEST_INTERVAL_MS = 250;
const RATE_LIMIT_COOLDOWN_MS = 60_000;
const METADATA_CACHE_TTL_MS = 10 * 60_000;

let cachedContracts: { data: EdgeXContract[]; fetchedAt: number } | null = null;
let latestCache: FundingSnapshot[] = [];
let latestCacheTimestamp = 0;
const historyCache = new Map<string, FundingHistoryPoint[]>();
let rateLimitedUntil = 0;

interface MetaDataResponse {
  code?: string;
  data?: {
    contractList?: EdgeXContract[];
  };
}

interface EdgeXContract {
  contractId: string;
  contractName: string;
  enableDisplay?: boolean;
  enableTrade?: boolean;
  fundingRateIntervalMin?: string | number | null;
}

interface LatestFundingResponse {
  code?: string;
  data?: EdgeXFundingRecord[];
}

interface EdgeXFundingRecord {
  contractId: string;
  contractName?: string;
  fundingRate?: string | number | null;
  forecastFundingRate?: string | number | null;
  previousFundingRate?: string | number | null;
  fundingTime?: string | number | null;
  fundingTimestamp?: string | number | null;
  fundingRateIntervalMin?: string | number | null;
  oraclePrice?: string | number | null;
  indexPrice?: string | number | null;
}

interface FundingHistoryResponse {
  code?: string;
  data?: {
    dataList?: EdgeXFundingRecord[];
    nextPageOffsetData?: string | null;
  };
}

async function fetchContracts(baseUrl: string): Promise<EdgeXContract[]> {
  if (cachedContracts && Date.now() - cachedContracts.fetchedAt < METADATA_CACHE_TTL_MS) {
    return cachedContracts.data;
  }
  const url = buildUrl(baseUrl, '/api/v1/public/meta/getMetaData');
  try {
    const response = await fetchJson<MetaDataResponse>(url.toString(), {
      headers: { Accept: 'application/json' }
    });
    if (response.code !== 'SUCCESS') {
      throw new Error(`EdgeX meta response code ${response.code ?? 'UNKNOWN'}`);
    }
    const contracts = (response.data?.contractList ?? []).filter(
      (contract) => contract.enableDisplay !== false && contract.enableTrade !== false
    );
    cachedContracts = { data: contracts, fetchedAt: Date.now() };
    return contracts;
  } catch (error) {
    handleError('meta/getMetaData', error);
  }
}

async function fetchLatestFunding(
  baseUrl: string,
  contractId?: string,
  attempt = 0
) {
  const url = buildUrl(baseUrl, '/api/v1/public/funding/getLatestFundingRate');
  if (contractId) {
    url.searchParams.set('contractId', contractId);
  }
  try {
    const response = await fetchJson<LatestFundingResponse>(url.toString(), {
      headers: { Accept: 'application/json' }
    });
    if (response.code !== 'SUCCESS') {
      throw new Error(`EdgeX latest response code ${response.code ?? 'UNKNOWN'}`);
    }
    return response.data ?? [];
  } catch (error) {
    if (error instanceof HttpError && error.status === 429 && attempt < 3) {
      await delay(500 * (attempt + 1));
      return fetchLatestFunding(baseUrl, contractId, attempt + 1);
    }
    handleError('funding/getLatestFundingRate', error);
  }
}

async function fetchFundingHistoryPage(
  baseUrl: string,
  contractId: string,
  params: { cursor?: string; begin?: number; end?: number; size?: number },
  attempt = 0
): Promise<FundingHistoryResponse['data']> {
  const url = buildUrl(baseUrl, '/api/v1/public/funding/getFundingRatePage');
  url.searchParams.set('contractId', contractId);
  url.searchParams.set('size', String(Math.min(Math.max(params.size ?? 100, 1), 100)));
  if (params.cursor) {
    url.searchParams.set('offsetData', params.cursor);
  }
  if (params.begin) {
    url.searchParams.set('filterBeginTimeInclusive', params.begin.toString());
  }
  if (params.end) {
    url.searchParams.set('filterEndTimeExclusive', params.end.toString());
  }

  try {
    const response = await fetchJson<FundingHistoryResponse>(url.toString(), {
      headers: { Accept: 'application/json' }
    });
    if (response.code !== 'SUCCESS') {
      throw new Error(`EdgeX history response code ${response.code ?? 'UNKNOWN'}`);
    }
    return response.data ?? { dataList: [], nextPageOffsetData: null };
  } catch (error) {
    if (error instanceof HttpError && error.status === 429 && attempt < 3) {
      await delay(750 * (attempt + 1));
      return fetchFundingHistoryPage(baseUrl, contractId, params, attempt + 1);
    }
    handleError('funding/getFundingRatePage', error);
  }
}

const edgexConnector: ConnectorFactory = (options?: ConnectorOptions): FundingConnector => {
  const baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
  const explicitContractIds = options?.contractIds;
  const maxContracts = Math.max(1, options?.maxContracts ?? DEFAULT_MAX_CONTRACTS);

  return {
    name: 'EdgeX',
    async fetchLatest() {
      if (Date.now() < rateLimitedUntil && latestCache.length) {
        return latestCache.map((snapshot) => ({ ...snapshot }));
      }

      const contracts = await resolveContractsList(baseUrl, explicitContractIds);
      if (!contracts.length) {
        throw new Error('EdgeX contracts unavailable');
      }

      const contractMap = new Map(contracts.map((contract) => [contract.contractId, contract]));
      const limitedContracts = Array.from(contractMap.values()).slice(0, maxContracts);
      const snapshots: FundingSnapshot[] = [];

      for (const contract of limitedContracts) {
        if (Date.now() < rateLimitedUntil) {
          break;
        }
        try {
          const records = await fetchLatestFunding(baseUrl, contract.contractId);
          for (const record of records) {
            if (!record.contractId) continue;
            if (record.contractId !== contract.contractId) continue;
            const fundingRate = parseNumber(record.fundingRate);
            const collectedAt =
              parseNumber(record.fundingTimestamp ?? record.fundingTime) ?? Date.now();
            const nextFunding = parseNumber(record.fundingTime);
            const periodHours = resolvePeriodHours(record, contract);
            const markPrice = parseNumber(record.indexPrice ?? record.oraclePrice);

            snapshots.push(
              createSnapshot({
                symbol: contract.contractName ?? record.contractName ?? contract.contractId,
                exchange: 'EdgeX',
                fundingRatePct: (fundingRate ?? 0) * 100,
                periodHours,
                markPrice: markPrice ?? null,
                collectedAt,
                nextFundingAt: nextFunding ?? null
              })
            );
          }
          await delay(REQUEST_INTERVAL_MS);
        } catch (error) {
          if (error instanceof Error) {
            console.warn(
              `EdgeX failed to fetch latest funding for ${contract.contractId}: ${error.message}`
            );
            if (error instanceof HttpError && error.status === 429) {
              rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
              break;
            }
          }
        }
      }

      if (!snapshots.length) {
        if (latestCache.length) {
          return latestCache.map((snapshot) => ({ ...snapshot }));
        }
        throw new Error('EdgeX latest funding response empty');
      }

      latestCache = snapshots.map((snapshot) => ({ ...snapshot }));
      latestCacheTimestamp = Date.now();
      return snapshots;
    },

    async fetchHistory(symbol, params) {
      const cacheKey = `${symbol}::${params.from.getTime()}::${params.to.getTime()}::${params.granularityHours}`;
      if (Date.now() < rateLimitedUntil && historyCache.has(cacheKey)) {
        return historyCache.get(cacheKey) ?? [];
      }

      const contracts = await resolveContractsList(baseUrl, explicitContractIds);
      if (!contracts.length) {
        throw new Error('EdgeX contracts unavailable');
      }

      const targetBase = normalizeContractName(symbol);
      const contract = contracts.find((item) => {
        const primary = normalizeContractName(item.contractName);
        if (primary === targetBase) return true;
        const base = deriveBaseSymbol(item.contractName);
        return base === deriveBaseSymbol(symbol);
      });

      if (!contract) {
        throw new Error(`EdgeX contract not found for symbol ${symbol}`);
      }

      const begin = params.from.getTime();
      const end = params.to.getTime();

      const points: FundingHistoryPoint[] = [];
      let cursor: string | undefined;

      while (true) {
        let page: FundingHistoryResponse['data'] | undefined;
        try {
          page = await fetchFundingHistoryPage(
            baseUrl,
            contract.contractId,
            {
              cursor,
              begin,
              end,
              size: 100
            }
          );
        } catch (error) {
          if (error instanceof HttpError && error.status === 429) {
            console.warn(`EdgeX rate limit encountered for ${contract.contractId} history`);
            rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
            break;
          }
          if (error instanceof HttpError && error.status === 404) {
            console.warn(`EdgeX contract ${contract.contractId} history not found`);
            break;
          }
          throw error;
        }

        if (!page) {
          break;
        }

        const { dataList = [], nextPageOffsetData } = page ?? {
          dataList: [],
          nextPageOffsetData: null
        };

        for (const record of dataList) {
          const fundingRate = parseNumber(record.fundingRate);
          const bucketStart =
            parseNumber(record.fundingTimestamp ?? record.fundingTime) ?? begin;
          const duration = resolvePeriodHours(record, contract) || params.granularityHours;

          points.push(
            createHistoryPoint({
              symbol: contract.contractName ?? record.contractName ?? contract.contractId,
              exchange: 'EdgeX',
              bucketStart,
              bucketDurationHours: duration,
              avgFundingRatePct: (fundingRate ?? 0) * 100,
              sourceCount: 1
            })
          );
        }

        cursor = nextPageOffsetData ?? undefined;
        if (!cursor) {
          break;
        }

        await delay(REQUEST_INTERVAL_MS);
      }

      if (!points.length) {
        if (historyCache.has(cacheKey)) {
          return historyCache.get(cacheKey) ?? [];
        }
        console.warn(`EdgeX funding history empty for ${symbol}`);
        return [];
      }

      historyCache.set(cacheKey, points.map((point) => ({ ...point })));
      return points;
    }
  };
};

function buildUrl(base: string, path: string) {
  return new URL(path, base.endsWith('/') ? base : `${base}/`);
}

function handleError(endpoint: string, error: unknown): never {
  if (error instanceof HttpError) {
    console.warn(`EdgeX ${endpoint} HTTP error: ${error.url} → ${error.message}`);
  } else {
    console.warn(`EdgeX ${endpoint} error: ${(error as Error).message}`);
  }
  throw error instanceof Error ? error : new Error(String(error));
}

function parseNumber(value: string | number | null | undefined): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function resolvePeriodHours(record: EdgeXFundingRecord, contract?: EdgeXContract): number {
  const fromRecord = parseNumber(record.fundingRateIntervalMin);
  if (fromRecord && fromRecord > 0) {
    return fromRecord / 60;
  }
  const fromContract = contract ? parseNumber(contract.fundingRateIntervalMin) : null;
  if (fromContract && fromContract > 0) {
    return fromContract / 60;
  }
  return 8;
}

function normalizeContractName(value?: string | null) {
  if (!value) return '';
  return value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveContractsList(baseUrl: string, explicit?: string[] | undefined) {
  const fallbackContracts = DEFAULT_CONTRACT_IDS.map((id) => ({ contractId: id, contractName: id }));

  try {
    const contracts = await fetchContracts(baseUrl);
    if (!contracts.length) {
      return explicit?.length ? filterContractsByList(explicit, fallbackContracts) : fallbackContracts;
    }

    if (!explicit?.length) {
      return contracts;
    }

    const explicitNormalized = explicit.map((id) => id.toUpperCase());
    const filtered = contracts.filter((contract) =>
      explicitNormalized.includes(contract.contractId.toUpperCase()) ||
      explicitNormalized.includes((contract.contractName ?? '').toUpperCase())
    );
    return filtered.length ? filtered : filterContractsByList(explicit, fallbackContracts);
  } catch (error) {
    console.warn(`EdgeX contract resolution fallback due to error: ${(error as Error).message}`);
    return explicit?.length ? filterContractsByList(explicit, fallbackContracts) : fallbackContracts;
  }
}

function filterContractsByList(list: string[], fallbackContracts: EdgeXContract[]): EdgeXContract[] {
  const normalized = list.map((value) => value.toUpperCase());
  return fallbackContracts.filter((contract) => normalized.includes(contract.contractId.toUpperCase()));
}

function deriveBaseSymbol(value?: string | null): string {
  if (!value) return '';
  let clean = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();

  for (const prefix of SYMBOL_PREFIXES) {
    if (clean.startsWith(prefix) && clean.length > prefix.length) {
      clean = clean.slice(prefix.length);
      break;
    }
  }

  let removed = true;
  while (removed) {
    removed = false;
    for (const suffix of SYMBOL_SUFFIXES) {
      if (clean.endsWith(suffix) && clean.length > suffix.length) {
        clean = clean.slice(0, -suffix.length);
        removed = true;
        break;
      }
    }
  }

  clean = clean.replace(/[0-9]+$/, '');
  return clean;
}

export default edgexConnector;

export function __resetEdgeXCacheForTests() {
  cachedContracts = null;
  latestCache = [];
  latestCacheTimestamp = 0;
  historyCache.clear();
  rateLimitedUntil = 0;
}
