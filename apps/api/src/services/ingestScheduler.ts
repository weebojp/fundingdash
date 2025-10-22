import type { FundingService } from './fundingService.js';

export type IngestSchedulerOptions = {
  intervalMs?: number;
  historySymbols?: string[];
  historyGranularityHours?: number;
  historyLookbackHours?: number;
};

const DEFAULT_INTERVAL_MS = 120_000;
const DEFAULT_HISTORY_SYMBOLS = ['BTC', 'ETH'];
const DEFAULT_HISTORY_LOOKBACK_HOURS = 24;
const DEFAULT_HISTORY_GRANULARITY_HOURS = 1;

export function startIngestScheduler(
  fundingService: FundingService,
  options: IngestSchedulerOptions = {}
) {
  const interval = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  let timer: NodeJS.Timeout | null = null;

  const historySymbols = options.historySymbols ?? DEFAULT_HISTORY_SYMBOLS;
  const historyGranularityHours = options.historyGranularityHours ?? DEFAULT_HISTORY_GRANULARITY_HOURS;
  const historyLookbackHours = options.historyLookbackHours ?? DEFAULT_HISTORY_LOOKBACK_HOURS;

  async function runIngestCycle() {
    try {
      await fundingService.refreshLatestFundingSnapshots();
    } catch (error) {
      console.warn(`Failed to refresh latest funding snapshots: ${(error as Error).message}`);
    }

    const now = new Date();
    const from = new Date(now);
    from.setHours(from.getHours() - historyLookbackHours);

    await Promise.all(
      historySymbols.map(async (symbol) => {
        try {
          await fundingService.refreshHistoryForSymbol(
            symbol,
            { from, to: now, granularityHours: historyGranularityHours },
            historyKey(historyGranularityHours, historyLookbackHours)
          );
        } catch (error) {
          console.warn(
            `Failed to refresh history for ${symbol}: ${(error as Error).message}`
          );
        }
      })
    );
  }

  void runIngestCycle();

  timer = setInterval(() => {
    void runIngestCycle();
  }, interval);

  return {
    stop() {
      if (timer) {
        clearInterval(timer);
      }
    }
  };
}

function historyKey(granularityHours: number, lookbackHours: number) {
  return `${granularityHours}h-${lookbackHours}h`;
}

export async function getOrRefreshHistory(
  fundingService: FundingService,
  symbol: string,
  granularityHours: number,
  lookbackHours: number,
  options: { forceRefresh?: boolean } = {}
) {
  const now = new Date();
  const from = new Date(now);
  from.setHours(from.getHours() - lookbackHours);

  return fundingService.getCachedHistoryForSymbol(
    symbol,
    { from, to: now, granularityHours },
    historyKey(granularityHours, lookbackHours),
    options
  );
}
