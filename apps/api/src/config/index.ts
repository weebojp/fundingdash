import { z } from 'zod';

const csvToArray = (value: unknown): string[] | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  return undefined;
};

const envSchema = z.object({
  PORT: z.string().optional(),
  FUNDING_REFRESH_INTERVAL_MS: z.string().optional(),
  FUNDING_HISTORY_SYMBOLS: z.string().optional(),
  FUNDING_HISTORY_GRANULARITY_HOURS: z.string().optional(),
  FUNDING_HISTORY_LOOKBACK_HOURS: z.string().optional(),
  ASTER_BASE_URL: z.string().optional(),
  ASTER_API_KEY: z.string().optional(),
  PARADEX_BASE_URL: z.string().optional(),
  PARADEX_MAX_MARKETS: z.string().optional(),
  PARADEX_MARKETS: z.string().optional(),
  LIGHTER_BASE_URL: z.string().optional(),
  HYPERLIQUID_BASE_URL: z.string().optional(),
  EDGEX_BASE_URL: z.string().optional(),
  EDGEX_MAX_CONTRACTS: z.string().optional(),
  EDGEX_CONTRACT_IDS: z.string().optional()
});

export type AppConfig = {
  server: {
    port: number;
  };
  scheduler: {
    intervalMs?: number;
    historySymbols?: string[];
    historyGranularityHours?: number;
    historyLookbackHours?: number;
  };
  connectors: {
    aster: {
      baseUrl?: string;
      apiKey?: string;
    };
    paradex: {
      baseUrl?: string;
      maxMarkets?: number;
      markets?: string[];
    };
    lighter: {
      baseUrl?: string;
    };
    hyperliquid: {
      baseUrl?: string;
    };
    edgex: {
      baseUrl?: string;
      maxContracts?: number;
      contractIds?: string[];
    };
  };
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);

  const intervalMs = parseNumber(parsed.FUNDING_REFRESH_INTERVAL_MS);
  const granularity = parseNumber(parsed.FUNDING_HISTORY_GRANULARITY_HOURS);
  const lookback = parseNumber(parsed.FUNDING_HISTORY_LOOKBACK_HOURS);
  const maxMarkets = parseNumber(parsed.PARADEX_MAX_MARKETS);
  const maxContracts = parseNumber(parsed.EDGEX_MAX_CONTRACTS);

  return {
    server: {
      port: parseNumber(parsed.PORT) ?? 4000
    },
    scheduler: {
      intervalMs,
      historySymbols: csvToArray(parsed.FUNDING_HISTORY_SYMBOLS),
      historyGranularityHours: granularity,
      historyLookbackHours: lookback
    },
    connectors: {
      aster: {
        baseUrl: parsed.ASTER_BASE_URL,
        apiKey: parsed.ASTER_API_KEY
      },
      paradex: {
        baseUrl: parsed.PARADEX_BASE_URL,
        maxMarkets,
        markets: csvToArray(parsed.PARADEX_MARKETS)
      },
      lighter: {
        baseUrl: parsed.LIGHTER_BASE_URL
      },
      hyperliquid: {
        baseUrl: parsed.HYPERLIQUID_BASE_URL
      },
      edgex: {
        baseUrl: parsed.EDGEX_BASE_URL,
        maxContracts,
        contractIds: csvToArray(parsed.EDGEX_CONTRACT_IDS)
      }
    }
  };
}
