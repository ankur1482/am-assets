// Research pages to open for a holding. These are links only: the sites either refuse automated
// requests or publish no quote feed, so live prices continue to come from /api/quote.
type ResearchSite = { name: string; url: string; kinds?: ('share' | 'etf')[] };
export type ResearchLink = { name: string; href: string };

const SITES: ResearchSite[] = [
  { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/quote/{tickerSymbol}' },
  { name: 'onvista', url: 'https://www.onvista.de/suche.html?SEARCH_VALUE={isin}' },
  { name: 'finanzen.net', url: 'https://www.finanzen.net/suchergebnis.asp?frmAktiensucheTextfeld={isin}' },
  { name: 'ariva', url: 'https://www.ariva.de/{isin}' },
  { name: 'justETF', url: 'https://www.justetf.com/etf-profile.html?isin={isin}', kinds: ['etf'] },
  { name: 'fondsweb', url: 'https://www.fondsweb.com/{isin}' },
  { name: 'Morningstar', url: 'https://www.morningstar.de/de/funds/SecuritySearchResults.aspx?type=ALL&search={isin}' },
  { name: 'extraETF', url: 'https://extraetf.com/etf-profile/{isin}', kinds: ['etf'] },
  { name: 'AlleAktien', url: 'https://www.alleaktien.de/data/{isin}', kinds: ['share'] },
  { name: 'comdirect', url: 'https://www.comdirect.de/inf/aktien/{isin}', kinds: ['share'] },
  { name: 'comdirect', url: 'https://www.comdirect.de/inf/etfs/{isin}', kinds: ['etf'] },
  { name: 'DivvyDiary', url: 'https://divvydiary.com/symbols/{isin}' },
  { name: 'trackingdifferences', url: 'https://www.trackingdifferences.com/ETF/ISIN/{isin}', kinds: ['etf'] },
  { name: 'TradingView', url: 'https://www.tradingview.com/chart/?symbol={tradingViewSymbol}' },
  { name: 'CNBC', url: 'https://www.cnbc.com/quotes/{tickerSymbolPrefix}', kinds: ['share'] },
  { name: 'Nasdaq', url: 'https://www.nasdaq.com/market-activity/stocks/{tickerSymbolPrefix}', kinds: ['share'] },
  { name: 'Aktienfinder', url: 'https://aktienfinder.net/aktien-profil/{isin}', kinds: ['share'] },
  { name: 'aktien.guide', url: 'https://aktien.guide/isin/aktien/{isin}', kinds: ['share'] },
];

const YAHOO_SUFFIX: Record<string, string> = { NSE: '.NS', BSE: '.BO' };
const TRADINGVIEW_MARKET: Record<string, string> = { NSE: 'NSE', BSE: 'BSE', NYSE: 'NYSE', NASDAQ: 'NASDAQ' };

/** Builds the links a holding has identifiers for; sites needing a missing ISIN or ticker are left out. */
export function researchLinks(data: Record<string, any>): ResearchLink[] {
  const isin = String(data?.isin || '').trim().toUpperCase();
  const ticker = String(data?.ticker_symbol || '').trim().toUpperCase();
  const exchange = String(data?.exchange || '').trim().toUpperCase();
  const prefix = ticker.split('.')[0];
  const isEtf = /etf/i.test(String(data?.asset_type || ''));
  const values: Record<string, string> = {
    isin,
    tickerSymbol: ticker && !ticker.includes('.') ? `${ticker}${YAHOO_SUFFIX[exchange] || ''}` : ticker,
    tickerSymbolPrefix: prefix,
    tradingViewSymbol: prefix ? (TRADINGVIEW_MARKET[exchange] ? `${TRADINGVIEW_MARKET[exchange]}:${prefix}` : prefix) : '',
  };
  return SITES.filter(site => !site.kinds || site.kinds.includes(isEtf ? 'etf' : 'share')).flatMap(site => {
    const needed = [...site.url.matchAll(/\{(\w+)\}/g)].map(match => match[1]);
    if (needed.some(name => !values[name])) return [];
    return [{ name: site.name, href: site.url.replace(/\{(\w+)\}/g, (_, name) => encodeURIComponent(values[name])) }];
  });
}
