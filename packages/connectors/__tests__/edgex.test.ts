import { afterEach, describe, expect, it, vi } from 'vitest';

import metaFixture from './__fixtures__/edgex/meta.json';
import latestFixture from './__fixtures__/edgex/latest.json';
import historyFixture from './__fixtures__/edgex/history.json';

vi.mock('../src/httpClient.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/httpClient.js')>();
  return {
    ...actual,
    fetchJson: vi.fn()
  };
});

const httpClient = await import('../src/httpClient.js');
const fetchJsonMock = vi.mocked(httpClient.fetchJson);
const edgexModule = await import('../src/edgex.js');
const edgexConnector = edgexModule.default;
const resetEdgeXCache = edgexModule.__resetEdgeXCacheForTests;

afterEach(() => {
  vi.clearAllMocks();
  resetEdgeXCache();
});

describe('edgexConnector', () => {
  it('fetches latest funding snapshots', async () => {
    fetchJsonMock
      .mockResolvedValueOnce(metaFixture as any)
      .mockResolvedValueOnce(latestFixture as any)
      .mockResolvedValueOnce(latestFixture as any);

    const connector = edgexConnector({ baseUrl: 'https://pro.example.com' });
    const snapshots = await connector.fetchLatest();

    expect(fetchJsonMock).toHaveBeenNthCalledWith(
      1,
      'https://pro.example.com/api/v1/public/meta/getMetaData',
      expect.objectContaining({ headers: { Accept: 'application/json' } })
    );
    expect(fetchJsonMock).toHaveBeenNthCalledWith(
      2,
      'https://pro.example.com/api/v1/public/funding/getLatestFundingRate?contractId=10000001',
      expect.objectContaining({ headers: { Accept: 'application/json' } })
    );
    expect(fetchJsonMock).toHaveBeenNthCalledWith(
      3,
      'https://pro.example.com/api/v1/public/funding/getLatestFundingRate?contractId=10000002',
      expect.objectContaining({ headers: { Accept: 'application/json' } })
    );
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]).toMatchObject({
      symbol: 'BTCUSDT',
      exchange: 'EdgeX',
      periodHours: 4,
      fundingRatePct: 0.01
    });
  });

  it('fetches funding history for a contract', async () => {
    fetchJsonMock.mockResolvedValueOnce(metaFixture as any).mockResolvedValueOnce(historyFixture as any);

    const connector = edgexConnector({ baseUrl: 'https://pro.example.com' });
    const history = await connector.fetchHistory('BTC', {
      from: new Date(1700000000000),
      to: new Date(1700003600000),
      granularityHours: 1
    });

    expect(fetchJsonMock).toHaveBeenNthCalledWith(
      2,
      'https://pro.example.com/api/v1/public/funding/getFundingRatePage?contractId=10000001&size=100&filterBeginTimeInclusive=1700000000000&filterEndTimeExclusive=1700003600000',
      expect.objectContaining({ headers: { Accept: 'application/json' } })
    );
    expect(history[0]).toMatchObject({
      symbol: 'BTCUSDT',
      exchange: 'EdgeX',
      avgFundingRatePct: 0.005,
      bucketDurationHours: 4
    });
  });
});
