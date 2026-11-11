import { isCashAtHome, isIncomeRecord, isOverdraftLoan, isSavingsAccount, num } from './calculations';
import { loansOf } from './plan/loans';
import { indiaToday } from './plan/dates';

export const MONTHLY_PAYMENT_MODULE = 'monthlyPayment';

type PaymentRecord = { id: string; module_key: string; data: Record<string, any> };
export type PaidEntry = { label: string; type: string; amount: number; paid_on: string; from_id: string; from_name: string; drawn: number; from_kind?: 'od' | 'savings' | 'card'; to_id?: string; to_name?: string };
export type CustomPayment = { id: string; label: string; amount: number; due_date: string };
export type PaymentMonth = { period: string; paid?: Record<string, PaidEntry>; custom?: CustomPayment[]; amounts?: Record<string, number> };
export type PaymentItem = { id: string; label: string; type: string; bank: string; amount: number; dueDate: string; paid?: PaidEntry; custom: boolean; recurringId?: string; informational?: boolean; transfer?: boolean; to?: string; note?: string };
/** regular: same each month. card: amount changes monthly. on_card: already inside a card bill, so never counted again. transfer: moves money between your own accounts. */
export type RecurringKind = 'regular' | 'card' | 'on_card' | 'transfer';
export type RecurringPayment = { id: string; label: string; amount: number; due_day: number | null; via: string; kind: RecurringKind; note?: string; to?: string };
const RECURRING_PERIOD = 'recurring';

export const recurringRecord = (records: PaymentRecord[]) => records.find(record => record.module_key === MONTHLY_PAYMENT_MODULE && record.data?.period === RECURRING_PERIOD);
export const recurringPayments = (records: PaymentRecord[]): RecurringPayment[] => recurringRecord(records)?.data?.items || [];
export const recurringData = (items: RecurringPayment[]) => ({ period: RECURRING_PERIOD, items });
/** What regular payments take out of cash flow each month. */
export const monthlyRegularTotal = (items: RecurringPayment[]) => items.reduce((sum, item) => sum + (item.kind === 'on_card' || item.kind === 'transfer' ? 0 : Math.max(0, num(item.amount))), 0);

/** Reads a payment list from an imported file, ignoring anything without a name. Throws if it is not a list. */
export function parseRecurringImport(text: string): RecurringPayment[] {
  const parsed = JSON.parse(text), list = Array.isArray(parsed) ? parsed : parsed?.items;
  if (!Array.isArray(list)) throw new Error('This file does not contain a payment list.');
  return list.filter(row => String(row?.label || '').trim()).map((row, index) => ({
    id: `r${Date.now()}-${index}`, label: String(row.label).trim(), amount: Math.max(0, num(row.amount)), due_day: num(row.due_day) >= 1 && num(row.due_day) <= 31 ? num(row.due_day) : null,
    via: String(row.via || '').trim(), kind: ['card', 'on_card', 'transfer'].includes(row.kind) ? row.kind : 'regular', note: String(row.note || '').trim(), to: String(row.to || '').trim(),
  }));
}

/** Adds imported rows; a row with the same name replaces the old one, so importing twice makes no duplicates. */
export const mergeRecurring = (existing: RecurringPayment[], imported: RecurringPayment[]) => {
  const names = new Set(imported.map(row => row.label.toLowerCase()));
  return [...existing.filter(row => !names.has(row.label.toLowerCase())), ...imported];
};
export type OdAccount = { id: string; name: string; parked: number };

const inMonth = (date: any, month: string) => String(date || '').slice(0, 7) === month;
/** The EMI's day of the month, limited to the month's length. */
function emiDueDate(start: any, month: string) {
  const day = Number(String(start || '').slice(8, 10));
  if (!day) return '';
  const [year, value] = month.split('-').map(Number), last = new Date(Date.UTC(year, value, 0)).getUTCDate();
  return `${month}-${String(Math.min(day, last)).padStart(2, '0')}`;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthName = (monthNumber: number | null) => (monthNumber ? MONTH_NAMES[monthNumber - 1] : '');
const monthOfDate = (date: any) => { const value = Number(String(date || '').slice(5, 7)); return value >= 1 && value <= 12 ? value : null; };
const isFixedDeposit = (d: Record<string, any>) => !isIncomeRecord(d) && !isSavingsAccount(d) && !isCashAtHome(d);
/** Due month of a yearly investment: the one chosen, otherwise the anniversary of its start date. */
const investmentDueMonth = (d: Record<string, any>) => {
  const chosen = MONTH_NAMES.indexOf(String(d.investment_due_month || ''));
  return chosen >= 0 ? chosen + 1 : monthOfDate(d.purchase_date);
};
const isYearlyPremium = (d: Record<string, any>) => /^(yearly|annual)/i.test(String(d.premium_frequency || ''));
export type YearlyCommitment = { id: string; label: string; type: string; account: string; amount: number; dueMonth: number | null; frequency: string };

/** Everything paid once a year or spread over it, for planning across the whole year. */
export function yearlyCommitments(records: PaymentRecord[], compute: (moduleKey: string, data: any) => any): YearlyCommitment[] {
  const rows: YearlyCommitment[] = [];
  for (const record of records) {
    const d = record.data || {}, account = String(d.account_name || '').trim();
    if (record.module_key === 'fixedIncome' && num(d.yearly_investment) > 0 && isFixedDeposit(d)) {
      rows.push({ id: record.id, label: [d.category, d.broker].filter(Boolean).join(' · ') || 'Yearly investment', type: 'Yearly investment', account, amount: num(d.yearly_investment), dueMonth: investmentDueMonth(d), frequency: 'Yearly' });
    } else if (record.module_key === 'insurance') {
      const c = compute('insurance', d);
      if (c.premium_status === 'PAYING' && num(c.annual_premium) > 0) rows.push({ id: record.id, label: String(d.security_name || 'Policy'), type: 'Insurance premium', account, amount: num(c.annual_premium), dueMonth: monthOfDate(c.next_premium_due_date), frequency: String(d.premium_frequency || 'Yearly') });
    }
  }
  return rows.sort((a, b) => (a.dueMonth ?? 13) - (b.dueMonth ?? 13) || a.label.localeCompare(b.label));
}

/** Everything to pay in a month, soonest first: loan EMIs, premiums and yearly investments falling due, and payments added by hand. */
export function paymentsDue(records: PaymentRecord[], compute: (moduleKey: string, data: any) => any, month: string, saved?: PaymentMonth, asOf: string = indiaToday()): PaymentItem[] {
  const items: PaymentItem[] = [];
  for (const row of recurringPayments(records)) {
    // A transfer happens in the background: it is shown for reference and needs no action.
    const id = `rec:${row.id}`, transfer = row.kind === 'transfer', informational = row.kind === 'on_card' || transfer;
    items.push({ id, recurringId: row.id, label: row.label, type: row.kind === 'card' ? 'Credit card' : row.kind === 'on_card' ? 'Auto-debited on a card' : transfer ? 'Background transfer' : 'Regular payment', bank: row.via, to: row.to, note: row.note, amount: saved?.amounts?.[id] ?? Math.max(0, num(row.amount)), dueDate: row.due_day ? emiDueDate(`0000-00-${String(row.due_day).padStart(2, '0')}`, month) : '', custom: false, informational, transfer });
  }
  // EMIs come from the one loan list (R2), so Payments shows the same loans as Home and the Planner.
  const emis = new Map(loansOf(records, asOf).map(loan => [loan.id, loan.emi]));
  for (const record of records) {
    const k = record.module_key, d = record.data || {};
    if (k === 'property' || k === 'loans') {
      const emi = emis.get(record.id) || 0;
      if (emi <= 0) continue;
      items.push({ id: `${record.id}:emi`, label: String(k === 'property' ? d.broker || d.location || 'Home loan' : d.security_name || 'Loan'), type: 'Loan EMI', bank: String(d.loan_institution || (k === 'loans' ? d.broker : '') || ''), amount: emi, dueDate: emiDueDate(k === 'property' ? d.loan_start_date : d.purchase_date, month), custom: false });
    } else if (k === 'insurance') {
      const c = compute(k, d);
      // A yearly premium repeats in the same month every year, even if its saved date has not been moved on.
      const due = isYearlyPremium(d) ? monthOfDate(c.next_premium_due_date) === Number(month.slice(5)) : inMonth(c.next_premium_due_date, month);
      if (c.premium_status === 'PAYING' && due && num(d.premium_amount) > 0) items.push({ id: `${record.id}:premium`, label: String(d.security_name || 'Policy'), type: 'Insurance premium', bank: String(d.broker || ''), amount: num(d.premium_amount), dueDate: `${month}-${String(c.next_premium_due_date).slice(8, 10)}`, custom: false });
    } else if (k === 'fixedIncome' && num(d.yearly_investment) > 0 && isFixedDeposit(d) && investmentDueMonth(d) === Number(month.slice(5))) {
      items.push({ id: `${record.id}:yearly`, label: [d.category, String(d.account_name || '').trim()].filter(Boolean).join(' · ') || 'Yearly investment', type: 'Yearly investment', bank: String(d.broker || ''), amount: num(d.yearly_investment), dueDate: emiDueDate(d.purchase_date, month), custom: false });
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
  // A transfer stays inside liquidity, so it is neither money spent nor money still to pay.
  const paid = items.reduce((sum, item) => sum + (item.paid && !item.transfer ? num(item.paid.amount) : 0), 0);
  const remaining = items.reduce((sum, item) => sum + (item.paid || item.informational || item.transfer ? 0 : item.amount), 0);
  return { paid, remaining, total: paid + remaining, unpaidCount: items.filter(item => !item.paid && !item.informational).length };
}

export type PayAccount = OdAccount & { kind: 'od' | 'savings'; holder?: string };
/** Dividends are paid into each person's own HDFC savings account. */
export const DIVIDEND_BANK = 'HDFC Bank';
export const dividendAccountFor = (accounts: PayAccount[], holder: string) =>
  accounts.find(account => account.kind === 'savings' && /^hdfc/i.test(account.name) && String(account.holder || '').trim().toLowerCase() === holder.trim().toLowerCase());
export const payAccountLabel = (account: PayAccount) => `${account.name} ${account.kind === 'od' ? 'OD' : 'savings'}${account.holder ? ` (${account.holder})` : ''}`;
const BALANCE_FIELD = { od: 'od_parked_balance', savings: 'current_value_today' } as const;
/** Where money can come from: OD accounts with the most parked first, then bank savings. */
export function payAccounts(records: PaymentRecord[]): PayAccount[] {
  const savings = records
    .filter(record => record.module_key === 'fixedIncome' && isSavingsAccount(record.data) && !isCashAtHome(record.data))
    .map(record => ({ id: record.id, name: String(record.data.broker || 'Bank savings'), parked: Math.max(0, num(record.data.current_value_today)), kind: 'savings' as const, holder: String(record.data.account_name || '').trim() }));
  return [...odAccounts(records).map(account => ({ ...account, kind: 'od' as const })), ...savings];
}
export const firstWordMatch = (text: string, account: { name: string }) => Boolean(text) && text.toLowerCase().includes(account.name.split(/\s+/)[0].toLowerCase());
/**
 * The account a row should default to. A regular payment names its own. A loan pays from wherever a
 * background transfer funds that lender, otherwise from savings held with the lender, otherwise the default.
 */
export function defaultSource(item: PaymentItem, items: PaymentItem[], accounts: PayAccount[], fallback: string) {
  if (item.recurringId) return accounts.find(account => firstWordMatch(item.bank, account))?.id || fallback;
  const lender = item.bank.split(/\s+/)[0].toLowerCase();
  const funding = items.find(other => other.transfer && lender && String(other.to || '').toLowerCase().includes(lender));
  return (funding && accounts.find(account => firstWordMatch(funding.bank, account))?.id)
    || accounts.find(account => account.kind === 'savings' && firstWordMatch(item.bank, account))?.id
    || fallback;
}
/** Takes money out of an OD account or a savings balance, never below zero. */
export function drawFromAccount(data: Record<string, any>, kind: 'od' | 'savings', amount: number) {
  const field = BALANCE_FIELD[kind], balance = Math.max(0, num(data[field])), drawn = Math.min(balance, Math.max(0, amount));
  return { data: { ...data, [field]: balance - drawn }, drawn, shortBy: Math.max(0, amount) - drawn };
}
export const addToAccount = (data: Record<string, any>, kind: 'od' | 'savings', amount: number) => ({ ...data, [BALANCE_FIELD[kind]]: Math.max(0, num(data[BALANCE_FIELD[kind]])) + Math.max(0, amount) });

/** OD accounts payments can come from, with the most parked money first. */
export function odAccounts(records: PaymentRecord[]): OdAccount[] {
  return records
    .filter(record => (record.module_key === 'property' || record.module_key === 'loans') && isOverdraftLoan(record.data))
    .map(record => ({ id: record.id, name: String(record.data.loan_institution || record.data.broker || record.data.security_name || 'OD account'), parked: Math.max(0, num(record.data.od_parked_balance)) }))
    .sort((a, b) => b.parked - a.parked);
}

