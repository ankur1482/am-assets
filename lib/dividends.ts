import { num } from './calculations';
import { postedSales } from './transactions';

export const DIVIDEND_MODULE = 'dividendReceipt';

type DividendRecord = { id: string; module_key: string; data: Record<string, any> };
export type DividendEvent = { date: string; amount: number; currency: string };
export type PendingDividend = { key: string; account: string; name: string; ticker: string; exDate: string; perShare: number; quantity: number; amount: number; currency: string; uncertain: boolean };

const accountOf = (data: Record<string, any>) => String(data.account_name || '').trim() || 'Unassigned';
const tickerOf = (data: Record<string, any>) => String(data.ticker_symbol || '').trim().toUpperCase();
export const dividendKey = (account: string, ticker: string, exDate: string) => `${account.toLowerCase()}|${ticker}|${exDate}`;
/** Distinct stocks to look up. Sold-out holdings stay in, because a dividend may predate the sale. */
export function dividendSymbols(records: DividendRecord[]) {
  const symbols = new Map<string, { symbol: string; exchange: string }>();
  for (const { module_key, data } of records) if (module_key === 'stocks' && tickerOf(data)) symbols.set(tickerOf(data), { symbol: tickerOf(data), exchange: String(data.exchange || 'NSE') });
  return [...symbols.values()];
}

/** Units that qualified: bought before the ex-date, including any sold on or after it. */
function unitsOnExDate(records: DividendRecord[], lots: DividendRecord[], compute: (moduleKey: string, data: any) => any, account: string, ticker: string, exDate: string) {
  let quantity = 0, uncertain = false;
  for (const lot of lots) {
    const bought = String(lot.data.purchase_date || '').slice(0, 10);
    if (bought && bought >= exDate) continue;
    if (!bought) uncertain = true;
    quantity += num(compute('stocks', lot.data).quantity);
  }
  for (const { data } of postedSales(records)) {
    if (data.module_key !== 'stocks' || accountOf(data) !== account || String(data.ticker_symbol || '').toUpperCase() !== ticker || String(data.sale_date) < exDate) continue;
    for (const line of data.lines || []) if (!line.purchaseDate || line.purchaseDate < exDate) quantity += num(line.quantity);
  }
  return { quantity, uncertain };
}

/** Dividends since a date on shares held at the time, not yet answered yes or no. */
export function pendingDividends(records: DividendRecord[], events: Record<string, DividendEvent[]>, compute: (moduleKey: string, data: any) => any, fromDate: string, today: string): PendingDividend[] {
  const answered = new Set(records.filter(record => record.module_key === DIVIDEND_MODULE).map(record => record.data?.key));
  const groups = new Map<string, DividendRecord[]>();
  for (const record of records) if (record.module_key === 'stocks' && tickerOf(record.data)) {
    const group = `${accountOf(record.data)}\u0000${tickerOf(record.data)}`;
    groups.set(group, [...(groups.get(group) || []), record]);
  }
  const pending: PendingDividend[] = [];
  for (const [group, lots] of groups) {
    const [account, ticker] = group.split('\u0000');
    for (const event of events[ticker] || []) {
      const key = dividendKey(account, ticker, event.date);
      if (event.date < fromDate || event.date > today || answered.has(key)) continue;
      const { quantity, uncertain } = unitsOnExDate(records, lots, compute, account, ticker, event.date);
      if (quantity <= 0) continue;
      pending.push({ key, account, ticker, name: String(lots[0].data.security_name || ticker), exDate: event.date, perShare: event.amount, quantity, amount: quantity * event.amount, currency: event.currency, uncertain });
    }
  }
  return pending.sort((a, b) => a.exDate.localeCompare(b.exDate) || a.name.localeCompare(b.name));
}

export const receivedDividends = (records: DividendRecord[]) => records.filter(record => record.module_key === DIVIDEND_MODULE && record.data?.status === 'received');
/** Dividends confirmed as received during a month (YYYY-MM). */
export const dividendsReceivedIn = (records: DividendRecord[], month: string) =>
  receivedDividends(records).filter(record => String(record.data.received_on || '').slice(0, 7) === month).reduce((sum, record) => sum + num(record.data.amount), 0);
