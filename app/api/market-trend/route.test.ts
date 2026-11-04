import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

afterEach(() => vi.unstubAllGlobals());

describe('market history for predictive planning', () => {
  it('skips news in history-only mode and removes null or nonpositive prices', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ chart: { result: [{ timestamp: [1767225600, 1767312000, 1767398400, 1767484800], indicators: { quote: [{ close: [100, null, 0, 105] }] } }] } }));
    vi.stubGlobal('fetch', fetcher);
    const response = await GET(new Request('http://localhost/api/market-trend?asset=shares-history&range=6mo&historyOnly=1'));
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.points.map((p: { value: number }) => p.value)).toEqual([100, 105]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(json.tone.label).toBe('Not requested');
  });

  it('keeps commodity history conversion explicit and reports unavailable feeds', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ chart: { result: [{ meta: { regularMarketPrice: 80 } }] } }))
      .mockResolvedValueOnce(Response.json({ chart: { result: [{ timestamp: [1767225600], indicators: { quote: [{ close: [31.1034768] }] } }] } }));
    vi.stubGlobal('fetch', fetcher);
    const response = await GET(new Request('http://localhost/api/market-trend?asset=silver&historyOnly=1'));
    const json = await response.json();
    expect(json.unit).toBe('kg');
    expect(json.currency).toBe('INR');
    expect(json.points[0].value).toBeCloseTo(80000);
    fetcher.mockRejectedValueOnce(new Error('Feed unavailable'));
    const failed = await GET(new Request('http://localhost/api/market-trend?asset=shares-history&historyOnly=1'));
    expect(failed.status).toBe(500);
    expect((await failed.json()).error).toBe('Feed unavailable');
  });
});
