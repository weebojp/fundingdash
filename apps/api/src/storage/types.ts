import type { FundingHistoryPoint, FundingSnapshot } from '@evplus/contracts';

export type SnapshotCache = {
  updatedAt: string | null;
  snapshots: FundingSnapshot[];
};

export interface FundingStore {
  getLatest(): SnapshotCache;
  setLatest(payload: SnapshotCache): void;
  getHistory(symbol: string, granularityKey: string): FundingHistoryPoint[];
  setHistory(symbol: string, granularityKey: string, points: FundingHistoryPoint[]): void;
}
