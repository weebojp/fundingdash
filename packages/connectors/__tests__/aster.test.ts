import { afterEach, describe, expect, it, vi } from 'vitest';
import premiumIndexFixture from './__fixtures__/aster-premium-index.json';
import fundingInfoFixture from './__fixtures__/aster-funding-info.json';
import fundingRateFixture from './__fixtures__/aster-funding-rate.json';

vi.mock('../src/httpClient.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/httpClient.js')>();
  return {
    ...actual,
    fetchJson: vi.fn()
  };
});

const httpClientMock = await import('../src/httpClient.js');
const fetchJsonMock = vi.mocked(httpClientMock.fetchJson);
const asterModule = await import('../src/aster.js');
const asterConnector = asterModule.default;

afterEach(() => {
  vi.clearAllMocks();
});

describe('asterConnector', () => {
  it('fetches and normalizes premium index snapshots', async () => {
    fetchJsonMock
      .mockResolvedValueOnce(premiumIndexFixture as any) // premiumIndex
      .mockResolvedValueOnce(fundingInfoFixture as any); // fundingInfo

    const connector = asterConnector({ baseUrl: 'https://api.example.com', apiKey: 'test-key' });
    const snapshots = await connector.fetchLatest();

    expect(fetchJsonMock).toHaveBeenNthCalledWith(
      1,
      'https://api.example.com/premiumIndex',
      expect.objectContaining({ headers: { 'X-MBX-APIKEY': 'test-key' } })
    );
    expect(fetchJsonMock).toHaveBeenNthCalledWith(
      2,
      'https://api.example.com/fundingInfo',
      expect.objectContaining({ headers: { 'X-MBX-APIKEY': 'test-key' } })
    );
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]).toMatchObject({
      symbol: 'BTCUSDT',
      exchange: 'Aster',
      fundingRatePct: 0.025,
      periodHours: 4,
      markPrice: 43210.1234
    });
  });

  it('fetches funding history', async () => {
    fetchJsonMock.mockResolvedValueOnce(fundingRateFixture as any);

    const connector = asterConnector({ baseUrl: 'https://api.example.com', apiKey: 'test-key' });
    const history = await connector.fetchHistory('BTCUSDT', {
      from: new Date(1700000000000),
      to: new Date(1700007200000),
      granularityHours: 1
    });

    expect(fetchJsonMock).toHaveBeenLastCalledWith(
      'https://api.example.com/fundingRate?symbol=BTCUSDT&startTime=1700000000000&endTime=1700007200000&limit=1000',
      expect.objectContaining({ headers: { 'X-MBX-APIKEY': 'test-key' } })
    );
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({
      symbol: 'BTCUSDT',
      exchange: 'Aster',
      avgFundingRatePct: 0.03
    });
  });
});
