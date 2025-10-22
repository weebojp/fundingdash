import { afterEach, describe, expect, it, vi } from 'vitest';

import marketsFixture from './__fixtures__/paradex/markets.json';
import fundingDataFixture from './__fixtures__/paradex/funding-data.json';

vi.mock('../src/httpClient.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/httpClient.js')>();
  return {
    ...actual,
    fetchJson: vi.fn()
  };
});

const httpClientMock = await import('../src/httpClient.js');
const fetchJsonMock = vi.mocked(httpClientMock.fetchJson);
const paradexModule = await import('../src/paradex.js');
const paradexConnector = paradexModule.default;

afterEach(() => {
  vi.clearAllMocks();
});

describe('paradexConnector', () => {
  it('fetches markets and latest funding snapshots', async () => {
    fetchJsonMock
      .mockResolvedValueOnce(marketsFixture as any)
      .mockResolvedValueOnce(fundingDataFixture as any)
      .mockResolvedValueOnce(fundingDataFixture as any);

    const connector = paradexConnector({ baseUrl: 'https://api.example.com' });
    const snapshots = await connector.fetchLatest();

    expect(fetchJsonMock).toHaveBeenNthCalledWith(
      1,
      'https://api.example.com/v1/markets',
      expect.objectContaining({ headers: { Accept: 'application/json' } })
    );
    expect(fetchJsonMock).toHaveBeenNthCalledWith(
      2,
      'https://api.example.com/v1/funding/data?market=BTC-USD-PERP&page_size=1',
      expect.objectContaining({ headers: { Accept: 'application/json' } })
    );
    expect(snapshots[0]).toMatchObject({
      symbol: 'BTC-USD-PERP',
      exchange: 'Paradex',
      fundingRatePct: 0.0123
    });
  });

  it('fetches funding history for a market', async () => {
    fetchJsonMock.mockResolvedValueOnce(fundingDataFixture as any);

    const connector = paradexConnector({ baseUrl: 'https://api.example.com' });
    const history = await connector.fetchHistory('BTC-USD-PERP', {
      from: new Date(1700000000000),
      to: new Date(1700003600000),
      granularityHours: 1
    });

    expect(fetchJsonMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/funding/data?market=BTC-USD-PERP&start_at=1700000000000&end_at=1700003600000&page_size=500',
      expect.objectContaining({ headers: { Accept: 'application/json' } })
    );
    expect(history[0]).toMatchObject({
      symbol: 'BTC-USD-PERP',
      exchange: 'Paradex',
      avgFundingRatePct: 0.0123
    });
  });
});
