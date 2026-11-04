import { num } from './calculations';
import { receivedDividends } from './dividends';

export type CalendarDividend = { exDate: string; announced: string; type: string; amount: number };
export type StockCalendar = { symbol: string; name?: string; price?: number; dividends: CalendarDividend[] };
export type BuySource = 'Holding' | 'Watchlist' | 'Large company';
export type BuySignal = { symbol: string; name: string; source: BuySource; exDate: string; buyBy: string; daysLeft: number; amount: number; type: string; price: number; yieldPct: number | null; heldQuantity: number; expected: number; strength: 'higher' | 'modest' | 'amount_unknown' };

/** Yield at which a dividend stands out. A guide only, since the price usually drops by about the dividend. */
export const HIGHER_YIELD_PERCENT = 1;

// A starting list for exploring, since no source available to the app lists upcoming dividends across the whole market.
export const LARGE_COMPANIES = ['ADANIENT', 'ADANIPORTS', 'APOLLOHOSP', 'ASIANPAINT', 'AXISBANK', 'BAJAJ-AUTO', 'BAJFINANCE', 'BAJAJFINSV', 'BEL', 'BHARTIARTL', 'BPCL', 'BRITANNIA', 'CIPLA', 'COALINDIA', 'DRREDDY', 'EICHERMOT', 'GAIL', 'GRASIM', 'HCLTECH', 'HDFCBANK', 'HDFCLIFE', 'HEROMOTOCO', 'HINDALCO', 'HINDUNILVR', 'ICICIBANK', 'INDUSINDBK', 'INFY', 'IOC', 'ITC', 'JSWSTEEL', 'KOTAKBANK', 'LT', 'M&M', 'MARUTI', 'NESTLEIND', 'NTPC', 'ONGC', 'PFC', 'POWERGRID', 'RECLTD', 'RELIANCE', 'SBILIFE', 'SBIN', 'SHRIRAMFIN', 'SUNPHARMA', 'TATACONSUM', 'TATASTEEL', 'TCS', 'TECHM', 'TITAN', 'TRENT', 'ULTRACEMCO', 'VEDL', 'WIPRO'];

/** A result reads "Company name&nbsp; ISIN, TICKER, BSE CODE". Only the part after the name identifies the stock. */
const listingIdentifiers = (value: any) => (String(value || '').split(/&nbsp;/i).pop() || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/gi, '&').toUpperCase().split(',').map(part => part.trim());
/** The Indian listing whose ticker is exactly this symbol. Search also returns similar names and foreign stocks. */
export function matchIndianStock(rows: any, symbol: string) {
  if (!Array.isArray(rows)) return null;
  const wanted = symbol.trim().toUpperCase();
  const row = rows.find(item => !String(item?.sc_id || '').includes(':') && listingIdentifiers(item?.pdt_dis_nm).includes(wanted));
  return row ? { scId: String(row.sc_id), name: String(row.stock_name || wanted) } : null;
}

const MONTHS: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
function parseDate(text: any) {
  const match = String(text || '').match(/^(\d{1,2}) (\w{3}), (\d{4})$/);
  if (!match || MONTHS[match[2]] === undefined) return '';
  return new Date(Date.UTC(Number(match[3]), MONTHS[match[2]], Number(match[1]))).toISOString().slice(0, 10);
}

export function parseCalendar(list: any): CalendarDividend[] {
  if (!Array.isArray(list)) return [];
  return list.map(item => ({ exDate: parseDate(item?.effective_date), announced: String(item?.announce_date || ''), type: String(item?.dividend_type || 'Dividend'), amount: Math.max(0, num(item?.dividend_amount)) })).filter(item => item.exDate);
}

/** The last day to buy and still qualify: the weekday before the ex-date. Market holidays are not known here. */
export function lastBuyDate(exDate: string) {
  const date = new Date(`${exDate}T00:00:00Z`);
  do date.setUTCDate(date.getUTCDate() - 1); while (date.getUTCDay() === 0 || date.getUTCDay() === 6);
  return date.toISOString().slice(0, 10);
}

/** Every announced dividend that can still be bought into, soonest deadline first. */
export function buySignals(stocks: { symbol: string; name: string; source: BuySource; price: number; heldQuantity: number }[], calendars: Record<string, StockCalendar>, today: string): BuySignal[] {
  const signals: BuySignal[] = [];
  for (const stock of stocks) {
    const calendar = calendars[stock.symbol];
    for (const dividend of calendar?.dividends || []) {
      const buyBy = lastBuyDate(dividend.exDate);
      if (buyBy < today) continue;
      const price = stock.price || num(calendar.price), yieldPct = price && dividend.amount ? dividend.amount / price * 100 : null;
      signals.push({
        symbol: stock.symbol, name: stock.name || calendar.name || stock.symbol, source: stock.source, exDate: dividend.exDate, buyBy,
        daysLeft: Math.round((Date.parse(`${buyBy}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000),
        amount: dividend.amount, type: dividend.type, price, yieldPct, heldQuantity: stock.heldQuantity, expected: stock.heldQuantity * dividend.amount,
        strength: !dividend.amount ? 'amount_unknown' : (yieldPct ?? 0) >= HIGHER_YIELD_PERCENT ? 'higher' : 'modest',
      });
    }
  }
  return signals.sort((a, b) => a.buyBy.localeCompare(b.buyBy) || (b.yieldPct ?? 0) - (a.yieldPct ?? 0));
}

/** Every dividend confirmed as received, kept whether or not the shares are still held. */
export function dividendHistory(records: { id: string; module_key: string; data: Record<string, any> }[]) {
  const held = new Set(records.filter(record => record.module_key === 'stocks' && !record.data?.sold_out).map(record => `${String(record.data?.account_name || '').trim().toLowerCase()}|${String(record.data?.ticker_symbol || '').trim().toUpperCase()}`));
  const groups = new Map<string, { account: string; ticker: string; name: string; total: number; stillHeld: boolean; receipts: Record<string, any>[] }>();
  for (const { data } of receivedDividends(records)) {
    const account = String(data.account_name || '').trim() || 'Unassigned', ticker = String(data.ticker_symbol || '').trim().toUpperCase(), key = `${account.toLowerCase()}|${ticker}`;
    const group = groups.get(key) || { account, ticker, name: String(data.security_name || ticker), total: 0, stillHeld: held.has(key), receipts: [] };
    group.total += num(data.amount);
    group.receipts.push(data);
    groups.set(key, group);
  }
  for (const group of groups.values()) group.receipts.sort((a, b) => String(b.received_on).localeCompare(String(a.received_on)));
  return [...groups.values()].sort((a, b) => a.account.localeCompare(b.account) || a.name.localeCompare(b.name));
}
