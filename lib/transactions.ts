import { num } from './calculations';

export const TRANSACTION_MODULE = 'transactions';
/** Equity holding period for long-term treatment. Other asset classes can differ, so confirm with a tax adviser. */
export const LONG_TERM_MONTHS = 12;

export type SaleTerm = 'short' | 'long' | 'unknown';
export type SaleLot = { id: string; quantity: number; cost: number; purchaseDate: string };
export type SaleLine = { lotId: string; quantity: number; share: number; buyPrice: number; cost: number; purchaseDate: string; proceeds: number; gain: number; term: SaleTerm };
export type SaleInput = { quantity: number; price: number; charges: number; date: string };

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

export function holdingTerm(purchaseDate: string, saleDate: string): SaleTerm {
  if (!validDate(purchaseDate)) return 'unknown';
  const bought = new Date(`${purchaseDate}T00:00:00Z`);
  const cutoff = new Date(Date.UTC(bought.getUTCFullYear(), bought.getUTCMonth() + LONG_TERM_MONTHS, bought.getUTCDate()));
  return new Date(`${saleDate}T00:00:00Z`) > cutoff ? 'long' : 'short';
}

/** Matches a sale to the oldest lots first. Lots bought after the sale date cannot be sold; undated lots go last. */
export function planSale(lots: SaleLot[], input: SaleInput) {
  const quantity = num(input.quantity), price = num(input.price), charges = Math.max(0, num(input.charges));
  const usable = lots.filter(lot => lot.quantity > 0 && !(validDate(lot.purchaseDate) && lot.purchaseDate > input.date)).sort((a, b) => (a.purchaseDate || '9999').localeCompare(b.purchaseDate || '9999'));
  const available = usable.reduce((sum, lot) => sum + lot.quantity, 0);
  let error = '';
  if (!validDate(input.date)) error = 'Enter the sale date.';
  else if (quantity <= 0) error = 'Enter the quantity sold.';
  else if (price <= 0) error = 'Enter the selling price.';
  else if (quantity > available + 1e-9) error = `You held only ${available} on that date.`;
  if (error) return { error, available, lines: [] as SaleLine[], proceeds: 0, cost: 0, gain: 0, shortTerm: 0, longTerm: 0, unknownTerm: 0 };
  let remaining = quantity;
  const netProceeds = quantity * price - charges, lines: SaleLine[] = [];
  for (const lot of usable) {
    if (remaining <= 1e-9) break;
    const sold = Math.min(lot.quantity, remaining), share = sold / lot.quantity, cost = lot.cost * share, proceeds = netProceeds * sold / quantity;
    lines.push({ lotId: lot.id, quantity: sold, share, buyPrice: lot.cost / lot.quantity, cost, purchaseDate: lot.purchaseDate, proceeds, gain: proceeds - cost, term: holdingTerm(lot.purchaseDate, input.date) });
    remaining -= sold;
  }
  const byTerm = (term: SaleTerm) => lines.filter(line => line.term === term).reduce((sum, line) => sum + line.gain, 0);
  const cost = lines.reduce((sum, line) => sum + line.cost, 0);
  return { error, available, lines, proceeds: netProceeds, cost, gain: netProceeds - cost, shortTerm: byTerm('short'), longTerm: byTerm('long'), unknownTerm: byTerm('unknown') };
}

const SCALED_FIELDS = ['quantity', 'investment_amount', 'latest_value'] as const;

/** Reduces a holding by the share sold and records what was removed, so the sale can be undone. */
export function reduceLot(data: Record<string, any>, share: number, saleDate: string) {
  const left = share >= 1 - 1e-9 ? 0 : 1 - share;
  const removed = Object.fromEntries(SCALED_FIELDS.map(field => [field, num(data[field]) * (1 - left)]));
  const next: Record<string, any> = { ...data, ...Object.fromEntries(SCALED_FIELDS.map(field => [field, num(data[field]) * left])) };
  if (!left) Object.assign(next, { sold_out: true, sold_out_on: saleDate });
  return { next, removed };
}

export function restoreLot(data: Record<string, any>, removed: Record<string, number>) {
  const next: Record<string, any> = { ...data, ...Object.fromEntries(SCALED_FIELDS.map(field => [field, num(data[field]) + num(removed[field])])) };
  delete next.sold_out;
  delete next.sold_out_on;
  return next;
}

type SaleRecord = { id: string; module_key: string; data: Record<string, any> };
export const postedSales = (records: SaleRecord[]) => records.filter(record => record.module_key === TRANSACTION_MODULE && record.data?.status === 'posted');
const fyOfDate = (date: string) => {
  const [year, month] = date.split('-').map(Number);
  return month < 4 ? year - 1 : year;
};

/** Realised gains for each Indian financial year, newest first. */
export function gainsByFinancialYear(records: SaleRecord[]) {
  const years = new Map<number, { year: number; proceeds: number; cost: number; gain: number; shortTerm: number; longTerm: number; unknownTerm: number }>();
  for (const { data } of postedSales(records)) {
    const year = fyOfDate(String(data.sale_date)), row = years.get(year) || { year, proceeds: 0, cost: 0, gain: 0, shortTerm: 0, longTerm: 0, unknownTerm: 0 };
    row.proceeds += num(data.proceeds); row.cost += num(data.cost); row.gain += num(data.gain);
    row.shortTerm += num(data.short_term_gain); row.longTerm += num(data.long_term_gain); row.unknownTerm += num(data.unknown_term_gain);
    years.set(year, row);
  }
  return [...years.values()].sort((a, b) => b.year - a.year);
}

export type CashFlow = { date: string; amount: number };
/** Annualised return of dated cash flows, in percent, or null when it cannot be worked out. */
export function xirr(flows: CashFlow[]) {
  const dated = flows.filter(flow => validDate(flow.date) && flow.amount).map(flow => ({ amount: flow.amount, time: Date.parse(flow.date) }));
  if (!dated.some(flow => flow.amount > 0) || !dated.some(flow => flow.amount < 0)) return null;
  const first = Math.min(...dated.map(flow => flow.time));
  const value = (rate: number) => dated.reduce((sum, flow) => sum + flow.amount / Math.pow(1 + rate, (flow.time - first) / (365 * 86400000)), 0);
  let low = -0.999, high = 100;
  if (value(low) * value(high) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const middle = (low + high) / 2;
    if (value(low) * value(middle) <= 0) high = middle; else low = middle;
  }
  return ((low + high) / 2) * 100;
}
