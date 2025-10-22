import type { FundingHistoryPoint, FundingSnapshot } from '@evplus/contracts';
import type { FundingStore, SnapshotCache } from './types.js';

export class InMemoryFundingStore implements FundingStore {
  private latest: SnapshotCache = { updatedAt: null, snapshots: [] };
  private history = new Map<string, FundingHistoryPoint[]>();

  getLatest(): SnapshotCache {
    return this.latest;
  }

  setLatest(payload: SnapshotCache): void {
    this.latest = {
      updatedAt: payload.updatedAt,
      snapshots: [...payload.snapshots]
    };
  }

  getHistory(symbol: string, granularityKey: string): FundingHistoryPoint[] {
    const key = this.keyFor(symbol, granularityKey);
    return this.history.get(key) ?? [];
  }

  setHistory(symbol: string, granularityKey: string, points: FundingHistoryPoint[]): void {
    const key = this.keyFor(symbol, granularityKey);
    this.history.set(key, [...points]);
  }

  private keyFor(symbol: string, granularityKey: string): string {
    return `${symbol.toUpperCase()}::${granularityKey}`;
  }
}

export function createInMemoryFundingStore(initial?: {
  latest?: SnapshotCache;
  history?: Array<{ symbol: string; granularityKey: string; points: FundingHistoryPoint[] }>;
}): FundingStore {
  const store = new InMemoryFundingStore();

  if (initial?.latest) {
    store.setLatest(initial.latest);
  }

  initial?.history?.forEach(({ symbol, granularityKey, points }) => {
    store.setHistory(symbol, granularityKey, points);
  });

  return store;
}
