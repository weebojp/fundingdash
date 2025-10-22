import { afterEach, describe, expect, it, vi } from 'vitest';
import latestFixture from './__fixtures__/hyperliquid-funding.json';
import historyFixture from './__fixtures__/hyperliquid-history.json';

vi.mock('../src/httpClient.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/httpClient.js')>();
  return {
    ...actual,
    fetchJson: vi.fn()
  };
});

const httpClientMock = await import('../src/httpClient.js');
const fetchJsonMock = vi.mocked(httpClientMock.fetchJson);
const hyperliquidModule = await import('../src/hyperliquid.js');
const hyperliquidConnector = hyperliquidModule.default;

afterEach(() => {
  vi.clearAllMocks();
});

describe('hyperliquidConnector', () => {
  it('normalizes funding snapshots from API response', async () => {
    fetchJsonMock.mockResolvedValueOnce(latestFixture as any);

    const connector = hyperliquidConnector({ baseUrl: 'https://api.hyperliquid.xyz' });
    const snapshots = await connector.fetchLatest();

    expect(fetchJsonMock).toHaveBeenCalledWith(
      'https://api.hyperliquid.xyz/info',
      expect.objectContaining({ method: 'POST' })
    );
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]).toMatchObject({
      symbol: 'BTC',
      exchange: 'Hyperliquid',
      fundingRatePct: 0.004,
      periodHours: 8,
      markPrice: 42000.5
    });
    expect(new Date(snapshots[0].collectedAt).getTime()).toBe(1700000000000);
    expect(new Date(snapshots[0].nextFundingAt ?? '').getTime()).toBe(1700002880000);
  });

  it('falls back to stub snapshots when request fails', async () => {
    fetchJsonMock.mockRejectedValueOnce(new Error('network error'));

    const connector = hyperliquidConnector({ baseUrl: 'https://api.hyperliquid.xyz' });
    const snapshots = await connector.fetchLatest();

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].exchange).toBe('Hyperliquid');
    expect(fetchJsonMock).toHaveBeenCalledTimes(1);
  });

  it('returns normalized history data', async () => {
    fetchJsonMock.mockResolvedValueOnce(historyFixture as any);

    const connector = hyperliquidConnector({ baseUrl: 'https://api.hyperliquid.xyz' });
    const history = await connector.fetchHistory(
      'BTC',
      { from: new Date(1700000000000), to: new Date(1700000500000), granularityHours: 1 }
    );

    expect(fetchJsonMock).toHaveBeenCalledWith(
      'https://api.hyperliquid.xyz/fundingHistory',
      expect.objectContaining({ method: 'POST' })
    );
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({
      symbol: 'BTC',
      exchange: 'Hyperliquid',
      bucketDurationHours: 1,
      avgFundingRatePct: 0.0025,
      sourceCount: 1
    });
  });
});
