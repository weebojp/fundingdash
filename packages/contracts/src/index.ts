export type FundingSnapshot = {
  symbol: string;
  exchange: string;
  fundingRatePct: number;
  periodHours: number;
  markPrice: number | null;
  collectedAt: string;
  nextFundingAt: string | null;
};

export type FundingHistoryPoint = {
  symbol: string;
  exchange: string;
  bucketStart: string;
  bucketDurationHours: number;
  avgFundingRatePct: number;
  maxFundingRatePct: number;
  minFundingRatePct: number;
  sourceCount: number;
};

export type ArbitrageOpportunity = {
  symbol: string;
  longExchange: string;
  shortExchange: string;
  spreadPct: number;
  estimatedDailyAprPct: number;
  lastUpdated: string;
  assumptions: string;
};

export type FundingLatestResponse = {
  updatedAt: string;
  snapshots: FundingSnapshot[];
};

export type FundingHistoryResponse = {
  symbol: string;
  range: string;
  granularity: string;
  points: FundingHistoryPoint[];
};

export type ArbitrageResponse = {
  generatedAt: string;
  opportunities: ArbitrageOpportunity[];
};
