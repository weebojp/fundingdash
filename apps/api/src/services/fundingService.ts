import type { FundingHistoryPoint, FundingSnapshot } from '@evplus/contracts';
import {
  asterConnector,
  edgexConnector,
  lighterConnector,
  paradexConnector,
  hyperliquidConnector,
  type ConnectorFactory,
  type ConnectorOptions
} from '@evplus/connectors';
import type { FundingStore, SnapshotCache } from '../storage/types.js';

export type FundingServiceConfig = {
  connectors?: {
    aster?: ConnectorOptions;
    paradex?: ConnectorOptions;
    lighter?: ConnectorOptions;
    hyperliquid?: ConnectorOptions;
    edgex?: ConnectorOptions;
  };
};

export type FundingService = {
  refreshLatestFundingSnapshots(): Promise<SnapshotCache>;
  getCachedLatestFundingSnapshots(options?: { forceRefresh?: boolean }): Promise<SnapshotCache>;
  refreshHistoryForSymbol(
    symbol: string,
    params: { from: Date; to: Date; granularityHours: number },
    granularityKey: string
  ): Promise<FundingHistoryPoint[]>;
  getCachedHistoryForSymbol(
    symbol: string,
    params: { from: Date; to: Date; granularityHours: number },
    granularityKey: string,
    options?: { forceRefresh?: boolean }
  ): Promise<FundingHistoryPoint[]>;
};

export function createFundingService(
  store: FundingStore,
  config: FundingServiceConfig = {}
): FundingService {
  const connectorConfigs: Array<{
    name: string;
    factory: ConnectorFactory;
    options?: ConnectorOptions;
  }> = [
    {
      name: 'Aster',
      factory: asterConnector,
      options: config.connectors?.aster
    },
    {
      name: 'Paradex',
      factory: paradexConnector,
      options: config.connectors?.paradex
    },
    {
      name: 'Lighter',
      factory: lighterConnector,
      options: config.connectors?.lighter
    },
    {
      name: 'Hyperliquid',
      factory: hyperliquidConnector,
      options: config.connectors?.hyperliquid
    },
    {
      name: 'EdgeX',
      factory: edgexConnector,
      options: config.connectors?.edgex
    }
  ];

  const connectors = connectorConfigs.map(({ factory, options, name }) => ({
    name,
    instance: factory(options)
  }));

  async function collectLatestFundingSnapshots(): Promise<FundingSnapshot[]> {
    const settled = await Promise.allSettled(
      connectors.map(({ instance }) => instance.fetchLatest())
    );

    const snapshots: FundingSnapshot[] = [];

    settled.forEach((result, index) => {
      const connectorName = connectorConfigs[index]?.name ?? `connector-${index}`;

      if (result.status === 'fulfilled') {
        snapshots.push(...result.value);
      } else {
        const error = result.reason as Error;
        console.warn(`Connector ${connectorName} failed to fetch latest funding: ${error.message}`);
      }
    });

    return snapshots;
  }

  async function refreshLatestFundingSnapshots(): Promise<SnapshotCache> {
    const snapshots = await collectLatestFundingSnapshots();
    const updatedAt = snapshots.length
      ? snapshots.reduce(
          (latest, snapshot) => (snapshot.collectedAt > latest ? snapshot.collectedAt : latest),
          snapshots[0].collectedAt
        )
      : new Date().toISOString();

    const invalid = snapshots.filter((snapshot) => !snapshot.periodHours || snapshot.periodHours <= 0);
    if (invalid.length) {
      console.warn(`Invalid periodHours detected for ${invalid.length} snapshots`, invalid.slice(0, 5));
    }

    const payload: SnapshotCache = { updatedAt, snapshots };
    store.setLatest(payload);
    return payload;
  }

  async function collectHistoryForSymbol(
    symbol: string,
    params: { from: Date; to: Date; granularityHours: number }
  ): Promise<FundingHistoryPoint[]> {
    const settled = await Promise.allSettled(
      connectors.map(({ instance }) => instance.fetchHistory(symbol, params))
    );

    const history: FundingHistoryPoint[] = [];

    settled.forEach((result, index) => {
      const connectorName = connectorConfigs[index]?.name ?? `connector-${index}`;

      if (result.status === 'fulfilled') {
        history.push(...result.value);
      } else {
        const error = result.reason as Error;
        console.warn(`Connector ${connectorName} failed to fetch history: ${error.message}`);
      }
    });

    return history;
  }

  async function refreshHistoryForSymbol(
    symbol: string,
    params: { from: Date; to: Date; granularityHours: number },
    granularityKey: string
  ): Promise<FundingHistoryPoint[]> {
    const history = await collectHistoryForSymbol(symbol, params);
    store.setHistory(symbol, granularityKey, history);
    return history;
  }

  async function getCachedLatestFundingSnapshots(options: {
    forceRefresh?: boolean;
  } = {}): Promise<SnapshotCache> {
    const cached = store.getLatest();
    if (options.forceRefresh || !cached.updatedAt) {
      return refreshLatestFundingSnapshots();
    }

    return cached;
  }

  async function getCachedHistoryForSymbol(
    symbol: string,
    params: { from: Date; to: Date; granularityHours: number },
    granularityKey: string,
    options: { forceRefresh?: boolean } = {}
  ): Promise<FundingHistoryPoint[]> {
    const cached = store.getHistory(symbol, granularityKey);
    if (options.forceRefresh || cached.length === 0) {
      return refreshHistoryForSymbol(symbol, params, granularityKey);
    }

    return cached;
  }

  return {
    refreshLatestFundingSnapshots,
    getCachedLatestFundingSnapshots,
    refreshHistoryForSymbol,
    getCachedHistoryForSymbol
  };
}
