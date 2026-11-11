import { formatDate, num } from './calculations';
import { postedSales } from './transactions';

export const DIVIDEND_MODULE = 'dividendReceipt';

type DividendRecord = { id: string; module_key: string; data: Record<string, any> };
export type DividendEvent = { date: string; amount: number; currency: string };
export type PayoutState = 'awaiting' | 'due' | 'overdue';
export type PendingDividend = { key: string; account: string; name: string; ticker: string; exDate: string; perShare: number; quantity: number; amount: number; currency: string; uncertain: boolean; payoutDate: string; payoutEstimated: boolean; state: PayoutState };

// No public source available to the app states payout dates, so one is assumed until the real date is entered.
export const PAYOUT_ESTIMATE_DAYS = 30;
export const PAYOUT_OVERDUE_DAYS = 15;
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
export const payoutState = (payoutDate: string, today: string): PayoutState =>
  today < payoutDate ? 'awaiting' : daysBetween(payoutDate, today) > PAYOUT_OVERDUE_DAYS ? 'overdue' : 'due';

/** Why an answer cannot be accepted, or an empty string. Money cannot arrive before its payout date, so correct that date if it did. */
export function validateReceipt(item: Pick<PendingDividend, 'exDate' | 'payoutDate'>, receivedOn: string, amount: number, today: string) {
  if (!(amount > 0)) return 'Enter the amount received.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(receivedOn)) return 'Enter the date it was received.';
  if (item.payoutDate > today) return `This can be confirmed from the payout date, ${formatDate(item.payoutDate)}. If it has already been credited, change the payout date.`;
  if (receivedOn > today) return 'The date received cannot be in the future.';
  if (receivedOn < item.payoutDate) return `The date received cannot be before the payout date, ${formatDate(item.payoutDate)}. If it arrived earlier, change the payout date.`;
  return '';
}

/** Compares what arrived with what the announcement implied, for the received list. */
export function receiptCheck(data: Record<string, any>) {
  const notes: string[] = [], expected = num(data.per_share) * num(data.quantity), gap = expected - num(data.amount), payout = String(data.payout_date || '');
  if (payout) {
    const late = daysBetween(payout, String(data.received_on));
    notes.push(late > 0 ? `${late} day${late === 1 ? '' : 's'} after the ${data.payout_estimated ? 'estimated ' : ''}payout date` : 'On the payout date');
  }
  if (data.currency === 'INR' && gap > 0.5) notes.push(`₹${gap.toFixed(2)} less than announced, possibly tax deducted`);
  if (data.currency === 'INR' && gap < -0.5) notes.push(`₹${(-gap).toFixed(2)} more than announced, so check the quantity`);
  return notes.join('. ');
}

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
  const saved = records.filter(record => record.module_key === DIVIDEND_MODULE);
  const answered = new Set(saved.filter(record => ['received', 'not_received'].includes(record.data?.status)).map(record => record.data?.key));
  const enteredPayout = new Map(saved.filter(record => record.data?.status === 'awaiting').map(record => [record.data?.key, String(record.data?.payout_date || '')]));
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
      const entered = enteredPayout.get(key), payoutDate = entered || addDays(event.date, PAYOUT_ESTIMATE_DAYS);
      pending.push({ key, account, ticker, name: String(lots[0].data.security_name || ticker), exDate: event.date, perShare: event.amount, quantity, amount: quantity * event.amount, currency: event.currency, uncertain, payoutDate, payoutEstimated: !entered, state: payoutState(payoutDate, today) });
    }
  }
  return pending.sort((a, b) => a.exDate.localeCompare(b.exDate) || a.name.localeCompare(b.name));
}

export const receivedDividends = (records: DividendRecord[]) => records.filter(record => record.module_key === DIVIDEND_MODULE && record.data?.status === 'received');
/** Dividends confirmed as received during a month (YYYY-MM). */
export const dividendsReceivedIn = (records: DividendRecord[], month: string) =>
  receivedDividends(records).filter(record => String(record.data.received_on || '').slice(0, 7) === month).reduce((sum, record) => sum + num(record.data.amount), 0);
/** A typical month of dividends (R5): those received in the 12 months up to `asOf` (YYYY-MM-DD), divided by 12. */
export function dividendsMonthlyAverage(records: DividendRecord[], asOf: string) {
  const yearAgo = `${Number(asOf.slice(0, 4)) - 1}${asOf.slice(4, 10)}`;
  const total = receivedDividends(records).filter(record => { const on = String(record.data.received_on || '').slice(0, 10); return on > yearAgo && on <= asOf; }).reduce((sum, record) => sum + num(record.data.amount), 0);
  return total / 12;
}
