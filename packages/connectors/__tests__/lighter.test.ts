import { afterEach, describe, expect, it, vi } from 'vitest';
import fundingFixture from './__fixtures__/lighter-funding.json';

vi.mock('../src/httpClient.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/httpClient.js')>();
  return {
    ...actual,
    fetchJson: vi.fn()
  };
});

const httpClientMock = await import('../src/httpClient.js');
const fetchJsonMock = vi.mocked(httpClientMock.fetchJson);
const lighterModule = await import('../src/lighter.js');
const lighterConnector = lighterModule.default;

afterEach(() => {
  vi.clearAllMocks();
});

describe('lighterConnector', () => {
  it('fetches and normalizes funding snapshots', async () => {
    fetchJsonMock.mockResolvedValueOnce(fundingFixture as any);

    const connector = lighterConnector({ baseUrl: 'https://lighter.example.com' });
    const snapshots = await connector.fetchLatest();

    expect(fetchJsonMock).toHaveBeenCalledWith('https://lighter.example.com/api/v1/funding-rates');
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]).toMatchObject({
      symbol: 'BTC',
      exchange: 'binance',
      fundingRatePct: -0.007191,
      periodHours: 1
    });
    expect(snapshots[1]).toMatchObject({
      symbol: 'ETH',
      exchange: 'bybit'
    });
  });

  it('creates history from latest snapshots', async () => {
    fetchJsonMock.mockResolvedValueOnce(fundingFixture as any);

    const connector = lighterConnector({ baseUrl: 'https://lighter.example.com' });
    const history = await connector.fetchHistory('BTC', {
      from: new Date(1700000000000),
      to: new Date(1700003600000),
      granularityHours: 1
    });

    expect(history[0]).toMatchObject({
      symbol: 'BTC',
      exchange: 'binance',
      avgFundingRatePct: -0.007191
    });
  });
});
