import type {
  FundingHistoryPoint,
  FundingSnapshot
} from '@evplus/contracts';

export type ConnectorEndpoints = {
  latest?: string;
  history?: string;
};

export type ConnectorOptions = {
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  endpoints?: ConnectorEndpoints;
  markets?: string[];
  maxMarkets?: number;
  contractIds?: string[];
  maxContracts?: number;
};

export interface FundingConnector {
  name: string;
  fetchLatest(options?: ConnectorOptions): Promise<FundingSnapshot[]>;
  fetchHistory(
    symbol: string,
    params: { from: Date; to: Date; granularityHours: number },
    options?: ConnectorOptions
  ): Promise<FundingHistoryPoint[]>;
}

export type ConnectorFactory = (options?: ConnectorOptions) => FundingConnector;

export const unsupportedConnector: FundingConnector = {
  name: 'unsupported',
  async fetchLatest() {
    return [];
  },
  async fetchHistory() {
    return [];
  }
};

export { default as hyperliquidConnector } from './hyperliquid.js';
export { default as asterConnector } from './aster.js';
export { default as paradexConnector } from './paradex.js';
export { default as lighterConnector } from './lighter.js';
export { default as edgexConnector } from './edgex.js';
