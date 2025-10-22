import { z } from 'zod';

export const fundingSnapshotSchema = z.object({
  symbol: z.string(),
  exchange: z.string(),
  fundingRatePct: z.number(),
  periodHours: z.number().positive(),
  markPrice: z.number().nullable(),
  collectedAt: z.string(),
  nextFundingAt: z.string().nullable()
});

export const fundingHistoryPointSchema = z.object({
  symbol: z.string(),
  exchange: z.string(),
  bucketStart: z.string(),
  bucketDurationHours: z.number().positive(),
  avgFundingRatePct: z.number(),
  maxFundingRatePct: z.number(),
  minFundingRatePct: z.number(),
  sourceCount: z.number().int().nonnegative()
});

export const arbitrageOpportunitySchema = z.object({
  symbol: z.string(),
  longExchange: z.string(),
  shortExchange: z.string(),
  spreadPct: z.number(),
  estimatedDailyAprPct: z.number(),
  lastUpdated: z.string(),
  assumptions: z.string()
});

export const fundingLatestResponseSchema = z.object({
  updatedAt: z.string(),
  snapshots: z.array(fundingSnapshotSchema)
});

export const fundingHistoryResponseSchema = z.object({
  symbol: z.string(),
  range: z.string(),
  granularity: z.string(),
  points: z.array(fundingHistoryPointSchema)
});

export const arbitrageResponseSchema = z.object({
  generatedAt: z.string(),
  opportunities: z.array(arbitrageOpportunitySchema)
});
