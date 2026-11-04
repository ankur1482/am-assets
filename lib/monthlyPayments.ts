import { isOverdraftLoan, num } from './calculations';

export const MONTHLY_PAYMENT_MODULE = 'monthlyPayment';

type PaymentRecord = { id: string; module_key: string; data: Record<string, any> };
export type PaidEntry = { label: string; type: string; amount: number; paid_on: string; from_id: string; from_name: string; drawn: number };
export type CustomPayment = { id: string; label: string; amount: number; due_date: string };
export type PaymentMonth = { period: string; paid?: Record<string, PaidEntry>; custom?: CustomPayment[]; amounts?: Record<string, number> };
export type PaymentItem = { id: string; label: string; type: string; bank: string; amount: number; dueDate: string; paid?: PaidEntry; custom: boolean; recurringId?: string; informational?: boolean; note?: string };
/** regular: same each month. card: amount changes monthly. on_card: already inside a card bill, so never counted again. */
export type RecurringKind = 'regular' | 'card' | 'on_card';
export type RecurringPayment = { id: string; label: string; amount: number; due_day: number | null; via: string; kind: RecurringKind; note?: string };
const RECURRING_PERIOD = 'recurring';

export const recurringRecord = (records: PaymentRecord[]) => records.find(record => record.module_key === MONTHLY_PAYMENT_MODULE && record.data?.period === RECURRING_PERIOD);
export const recurringPayments = (records: PaymentRecord[]): RecurringPayment[] => recurringRecord(records)?.data?.items || [];
export const recurringData = (items: RecurringPayment[]) => ({ period: RECURRING_PERIOD, items });
/** What regular payments take out of cash flow each month. */
export const monthlyRegularTotal = (items: RecurringPayment[]) => items.reduce((sum, item) => sum + (item.kind === 'on_card' ? 0 : Math.max(0, num(item.amount))), 0);

/** Reads a payment list from an imported file, ignoring anything without a name. Throws if it is not a list. */
export function parseRecurringImport(text: string): RecurringPayment[] {
  const parsed = JSON.parse(text), list = Array.isArray(parsed) ? parsed : parsed?.items;
  if (!Array.isArray(list)) throw new Error('This file does not contain a payment list.');
  return list.filter(row => String(row?.label || '').trim()).map((row, index) => ({
    id: `r${Date.now()}-${index}`, label: String(row.label).trim(), amount: Math.max(0, num(row.amount)), due_day: num(row.due_day) >= 1 && num(row.due_day) <= 31 ? num(row.due_day) : null,
    via: String(row.via || '').trim(), kind: row.kind === 'card' || row.kind === 'on_card' ? row.kind : 'regular', note: String(row.note || '').trim(),
  }));
}
export type OdAccount = { id: string; name: string; parked: number };

const inMonth = (date: any, month: string) => String(date || '').slice(0, 7) === month;
/** The EMI's day of the month, limited to the month's length. */
function emiDueDate(start: any, month: string) {
  const day = Number(String(start || '').slice(8, 10));
  if (!day) return '';
  const [year, value] = month.split('-').map(Number), last = new Date(Date.UTC(year, value, 0)).getUTCDate();
  return `${month}-${String(Math.min(day, last)).padStart(2, '0')}`;
}

/** Everything to pay in a month, soonest first: loan EMIs, premiums falling due, and payments added by hand. */
export function paymentsDue(records: PaymentRecord[], compute: (moduleKey: string, data: any) => any, month: string, saved?: PaymentMonth): PaymentItem[] {
  const items: PaymentItem[] = [];
  for (const row of recurringPayments(records)) {
    const id = `rec:${row.id}`, informational = row.kind === 'on_card';
    items.push({ id, recurringId: row.id, label: row.label, type: row.kind === 'card' ? 'Credit card' : informational ? 'Auto-debited on a card' : 'Regular payment', bank: row.via, note: row.note, amount: saved?.amounts?.[id] ?? Math.max(0, num(row.amount)), dueDate: row.due_day ? emiDueDate(`0000-00-${String(row.due_day).padStart(2, '0')}`, month) : '', custom: false, informational });
  }
  for (const record of records) {
    const k = record.module_key, d = record.data || {};
    if (k === 'property' || k === 'loans') {
      const c = compute(k, d);
      if (num(c.monthly_emi) <= 0) continue;
      items.push({ id: `${record.id}:emi`, label: String(k === 'property' ? d.broker || d.location || 'Home loan' : d.security_name || 'Loan'), type: 'Loan EMI', bank: String(d.loan_institution || (k === 'loans' ? d.broker : '') || ''), amount: num(c.monthly_emi), dueDate: emiDueDate(k === 'property' ? d.loan_start_date : d.purchase_date, month), custom: false });
    } else if (k === 'insurance') {
      const c = compute(k, d);
      if (c.premium_status === 'PAYING' && inMonth(c.next_premium_due_date, month) && num(d.premium_amount) > 0) items.push({ id: `${record.id}:premium`, label: String(d.security_name || 'Policy'), type: 'Insurance premium', bank: String(d.broker || ''), amount: num(d.premium_amount), dueDate: String(c.next_premium_due_date).slice(0, 10), custom: false });
    }
  }
  for (const custom of saved?.custom || []) items.push({ id: custom.id, label: custom.label, type: 'Other payment', bank: '', amount: num(custom.amount), dueDate: custom.due_date, custom: true });
  const paid = saved?.paid || {};
  for (const item of items) item.paid = paid[item.id];
  // A paid item stays listed for the month even if its loan has since changed or gone.
  for (const [id, entry] of Object.entries(paid)) if (!items.some(item => item.id === id)) items.push({ id, label: entry.label, type: entry.type, bank: '', amount: num(entry.amount), dueDate: entry.paid_on, paid: entry, custom: false });
  return items.sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || a.label.localeCompare(b.label));
}

export function paymentTotals(items: PaymentItem[]) {
  const paid = items.reduce((sum, item) => sum + (item.paid ? num(item.paid.amount) : 0), 0);
  const remaining = items.reduce((sum, item) => sum + (item.paid || item.informational ? 0 : item.amount), 0);
  return { paid, remaining, total: paid + remaining, unpaidCount: items.filter(item => !item.paid && !item.informational).length };
}

/** OD accounts payments can come from, with the most parked money first. */
export function odAccounts(records: PaymentRecord[]): OdAccount[] {
  return records
    .filter(record => (record.module_key === 'property' || record.module_key === 'loans') && isOverdraftLoan(record.data))
    .map(record => ({ id: record.id, name: String(record.data.loan_institution || record.data.broker || record.data.security_name || 'OD account'), parked: Math.max(0, num(record.data.od_parked_balance)) }))
    .sort((a, b) => b.parked - a.parked);
}

/** Takes a payment out of an OD account. It can only draw what is parked; the rest is reported, not hidden. */
export function drawFromOd(data: Record<string, any>, amount: number) {
  const parked = Math.max(0, num(data.od_parked_balance)), drawn = Math.min(parked, Math.max(0, amount));
  return { data: { ...data, od_parked_balance: parked - drawn }, drawn, shortBy: Math.max(0, amount) - drawn };
}

export const returnToOd = (data: Record<string, any>, drawn: number) => ({ ...data, od_parked_balance: Math.max(0, num(data.od_parked_balance)) + Math.max(0, drawn) });
