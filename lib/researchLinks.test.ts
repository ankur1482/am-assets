import { describe, expect, it } from 'vitest';
import { researchLinks } from './researchLinks';

const names = (data: Record<string, any>) => researchLinks(data).map(link => link.name);
const href = (data: Record<string, any>, name: string) => researchLinks(data).find(link => link.name === name)?.href;

describe('holding research links', () => {
  it('offers nothing without an identifier', () => {
    expect(researchLinks({ security_name: 'Unknown' })).toEqual([]);
  });
  it('uses only ticker sites until an ISIN is saved', () => {
    expect(names({ ticker_symbol: 'RELIANCE', exchange: 'NSE' })).toEqual(['Yahoo Finance', 'TradingView', 'CNBC', 'Nasdaq']);
  });
  it('maps Indian exchanges to the right ticker formats', () => {
    const stock = { ticker_symbol: 'reliance', exchange: 'NSE' };
    expect(href(stock, 'Yahoo Finance')).toBe('https://finance.yahoo.com/quote/RELIANCE.NS');
    expect(href(stock, 'TradingView')).toBe('https://www.tradingview.com/chart/?symbol=NSE%3ARELIANCE');
    expect(href({ ticker_symbol: 'RELIANCE', exchange: 'BSE' }, 'Yahoo Finance')).toBe('https://finance.yahoo.com/quote/RELIANCE.BO');
  });
  it('separates ETF and share pages', () => {
    const shared = { isin: 'ie00b4l5y983', ticker_symbol: 'IWDA.AS' };
    expect(names({ ...shared, asset_type: 'ETF' })).toContain('justETF');
    expect(names({ ...shared, asset_type: 'ETF' })).not.toContain('aktien.guide');
    expect(href({ ...shared, asset_type: 'ETF' }, 'comdirect')).toBe('https://www.comdirect.de/inf/etfs/IE00B4L5Y983');
    expect(href({ ...shared, asset_type: 'Stock' }, 'comdirect')).toBe('https://www.comdirect.de/inf/aktien/IE00B4L5Y983');
  });
  it('covers all eighteen bookmarks across shares and ETFs', () => {
    const data = { isin: 'INE002A01018', ticker_symbol: 'RELIANCE', exchange: 'NSE' };
    const hrefs = new Set([...researchLinks({ ...data, asset_type: 'Stock' }), ...researchLinks({ ...data, asset_type: 'ETF' })].map(link => link.href));
    expect(hrefs.size).toBe(18);
  });
});
