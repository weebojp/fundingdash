import type { FundingHistoryPoint, FundingSnapshot } from '@evplus/contracts';

export function toIsoTimestamp(value: number | string | Date | undefined | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    return new Date(value).toISOString();
  }

  if (Number.isFinite(value)) {
    const milliseconds = value > 1e12 ? value : value * 1000;
    return new Date(milliseconds).toISOString();
  }

  return null;
}

export function createSnapshot(params: {
  symbol: string;
  exchange: string;
  fundingRatePct: number;
  periodHours: number;
  markPrice?: number | null;
  collectedAt: number | string | Date;
  nextFundingAt?: number | string | Date | null;
}): FundingSnapshot {
  return {
    symbol: params.symbol,
    exchange: params.exchange,
    fundingRatePct: params.fundingRatePct,
    periodHours: params.periodHours,
    markPrice: params.markPrice ?? null,
    collectedAt: toIsoTimestamp(params.collectedAt) ?? new Date().toISOString(),
    nextFundingAt: toIsoTimestamp(params.nextFundingAt)
  };
}

export function createHistoryPoint(params: {
  symbol: string;
  exchange: string;
  bucketStart: number | string | Date;
  bucketDurationHours: number;
  avgFundingRatePct: number;
  maxFundingRatePct?: number;
  minFundingRatePct?: number;
  sourceCount?: number;
}): FundingHistoryPoint {
  return {
    symbol: params.symbol,
    exchange: params.exchange,
    bucketStart: toIsoTimestamp(params.bucketStart) ?? new Date().toISOString(),
    bucketDurationHours: params.bucketDurationHours,
    avgFundingRatePct: roundToPrecision(params.avgFundingRatePct),
    maxFundingRatePct: roundToPrecision(params.maxFundingRatePct ?? params.avgFundingRatePct),
    minFundingRatePct: roundToPrecision(params.minFundingRatePct ?? params.avgFundingRatePct),
    sourceCount: params.sourceCount ?? 0
  };
}

export function roundToPrecision(value: number, precision = 6): number {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}
