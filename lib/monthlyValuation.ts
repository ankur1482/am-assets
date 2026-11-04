import { isCashAtHome, isDividendIncome, isSavingsAccount, num, occupiedShareOfMonth, isRentedProperty } from './calculations';
import { DIVIDEND_MODULE } from './dividends';
import { TRANSACTION_MODULE } from './transactions';

export const MONTHLY_VALUATION_MODULE = 'monthlyValuation';

export type LedgerSide = 'asset' | 'liability' | 'inflow' | 'outflow';
export type LedgerField = 'start' | 'end' | 'amount';
export type LedgerEntry = { id: string; label: string; group: string; account: string; side: LedgerSide; value: number; purchase?: number };
export type LedgerItem = Omit<LedgerEntry, 'id' | 'value'> & { start?: number | null; end?: number | null; amount?: number | null; start_edited?: boolean; end_edited?: boolean; amount_edited?: boolean; start_original?: number | null; end_original?: number | null; amount_original?: number | null };
export type MonthData = { period: string; items: Record<string, LedgerItem>; captured_at?: string };
type LedgerRecord = { id: string; module_key: string; data: Record<string, any> };
export type LedgerCell = { start: number | null; end: number | null; amount: number | null; change: number | null; gain: number | null; startEdited: boolean; endEdited: boolean; amountEdited: boolean; startPeriod?: string; endPeriod?: string };
export type LedgerRow = Omit<LedgerEntry, 'value' | 'purchase'> & { purchase: number | null; cells: Record<string, LedgerCell | undefined> };

/** Order of the sections on the screen. */
export const LEDGER_GROUPS = ['Stocks & ETFs', 'Mutual Funds', 'ULIPs', 'Bullion', 'NSEL e-Series', 'Fixed Income', 'Savings & Cash', 'Property', 'Other Assets', 'Insurance', 'Loans', 'Borrowings', 'Salary', 'Rent', 'Dividends', 'Sale Proceeds', 'Loan EMIs', 'Insurance Premiums'];
const HOLDING_GROUPS: Record<string, string> = { stocks: 'Stocks & ETFs', mutualFunds: 'Mutual Funds', ulips: 'ULIPs', bullion: 'Bullion', nsel: 'NSEL e-Series', otherAssets: 'Other Assets' };
const YEARLY_GROUPS = new Set(['Property', 'Insurance', 'Insurance Premiums', 'Loans', 'Borrowings']);
const LONG_TERM_DEPOSIT = /^(fd|ppf|sukanya|nsc|kvp|bond|corporate deposit|gratuity)\b/i;
/** Slow-moving items are reviewed by financial year rather than month by month. */
export const isYearlyRow = (row: { group: string; label: string }) => YEARLY_GROUPS.has(row.group) || (row.group === 'Fixed Income' && LONG_TERM_DEPOSIT.test(row.label));

const text = (...parts: any[]) => parts.map(part => String(part || '').trim()).filter(Boolean).join(' · ');
export const isFlow = (side: LedgerSide) => side === 'inflow' || side === 'outflow';
export const previousMonth = (month: string) => {
  const [year, value] = month.split('-').map(Number);
  return new Date(Date.UTC(year, value - 2, 1)).toISOString().slice(0, 7);
};

/** Turns today's records into ledger lines. Values are balances; inflows and outflows are amounts for the month. */
export function ledgerEntries(records: LedgerRecord[], compute: (moduleKey: string, data: any) => any, month: string): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  const propertyIds = new Set(records.filter(r => r.module_key === 'property').map(r => r.id));
  for (const record of records) {
    const k = record.module_key, d = record.data || {}, account = String(d.account_name || '').trim() || 'Unassigned';
    if (k === DIVIDEND_MODULE) {
      if (String(d.received_on || '').slice(0, 7) !== month) continue;
      entries.push({ id: `${record.id}:dividend`, label: `${d.security_name} dividend`, group: 'Dividends', account, side: 'inflow', value: d.status === 'received' ? num(d.amount) : 0 });
    } else if (k === TRANSACTION_MODULE) {
      if (String(d.sale_date || '').slice(0, 7) !== month || !['posted', 'reversed'].includes(d.status)) continue;
      // Purchase beside proceeds shows buying versus selling. An undone sale zeroes out rather than lingering.
      entries.push({ id: `${record.id}:sale`, label: `${d.security_name} · sold ${d.quantity} @ ₹${d.price}`, group: 'Sale Proceeds', account, side: 'inflow', value: d.status === 'posted' ? num(d.proceeds) : 0, purchase: num(d.cost) });
    } else if (HOLDING_GROUPS[k]) {
      // A sold holding shows zero in the month it was sold, then drops off.
      if (d.sold_out && String(d.sold_out_on || '').slice(0, 7) !== month) continue;
      const c = compute(k, d);
      entries.push({ id: record.id, label: text(d.security_name, k === 'bullion' ? d.city : '') || HOLDING_GROUPS[k], group: HOLDING_GROUPS[k], account, side: 'asset', value: num(c.latest), purchase: num(c.invested) });
    } else if (k === 'insurance') {
      const c = compute(k, d), name = text(d.security_name, d.broker) || 'Policy';
      if (num(c.latest) > 0) entries.push({ id: record.id, label: name, group: 'Insurance', account, side: 'asset', value: num(c.latest), purchase: num(c.invested) });
      if (c.premium_status === 'PAYING' && num(c.annual_premium) > 0) entries.push({ id: `${record.id}:premium`, label: name, group: 'Insurance Premiums', account, side: 'outflow', value: num(c.annual_premium) });
    } else if (k === 'fixedIncome') {
      const category = String(d.category || '').trim(), c = compute(k, d);
      if (/^salary$/i.test(category)) entries.push({ id: record.id, label: text('Salary', d.broker), group: 'Salary', account, side: 'inflow', value: Math.max(0, num(d.employee_contribution)) });
      else if (/^rental\s*income$/i.test(category)) { if (!propertyIds.has(d.linked_property_id)) entries.push({ id: record.id, label: 'Rental income', group: 'Rent', account, side: 'inflow', value: Math.max(0, num(d.employee_contribution)) }); }
      else if (isDividendIncome(d)) entries.push({ id: record.id, label: 'Dividends', group: 'Dividends', account, side: 'inflow', value: Math.max(0, num(d.employee_contribution)) });
      else entries.push({ id: record.id, label: text(category || 'Fixed income', d.broker), group: isSavingsAccount(d) || isCashAtHome(d) ? 'Savings & Cash' : 'Fixed Income', account, side: 'asset', value: num(c.latest), purchase: num(c.invested) });
    } else if (k === 'property') {
      const c = compute(k, d), name = text(d.broker || d.location || 'Property', d.security_name);
      entries.push({ id: record.id, label: name, group: 'Property', account, side: 'asset', value: num(c.latest), purchase: num(c.invested) });
      if (isRentedProperty(d)) entries.push({ id: `${record.id}:rent`, label: text(name, d.rentee_name), group: 'Rent', account, side: 'inflow', value: Math.max(0, num(d.monthly_rent)) * occupiedShareOfMonth(d, month) });
      if (num(c.loan_balance) > 0) {
        entries.push({ id: `${record.id}:loan`, label: name, group: 'Loans', account, side: 'liability', value: num(c.net_loan_balance) });
        entries.push({ id: `${record.id}:emi`, label: name, group: 'Loan EMIs', account, side: 'outflow', value: num(c.monthly_emi) });
      }
    } else if (k === 'loans' || k === 'borrowings') {
      const c = compute(k, d), name = text(d.security_name, d.broker) || 'Loan';
      entries.push({ id: record.id, label: name, group: k === 'loans' ? 'Loans' : 'Borrowings', account, side: 'liability', value: num(c.balance) });
      if (k === 'loans' && num(c.monthly_emi) > 0) entries.push({ id: `${record.id}:emi`, label: name, group: 'Loan EMIs', account, side: 'outflow', value: num(c.monthly_emi) });
    }
  }
  return entries;
}

/**
 * Refreshes the month in progress. Edited figures are never overwritten, and items that have since been
 * sold or deleted keep the last values they had. Earlier months are never touched by this.
 */
export function mergeCurrentMonth(existing: MonthData | undefined, previous: MonthData | undefined, entries: LedgerEntry[], month: string) {
  const items: Record<string, LedgerItem> = { ...(existing?.items || {}) };
  let changed = !existing;
  for (const { id, value, ...meta } of entries) {
    const held = items[id];
    const next: LedgerItem = isFlow(meta.side)
      ? { ...held, ...meta, amount: held?.amount_edited ? held.amount : value }
      : { ...held, ...meta, start: held?.start ?? previous?.items?.[id]?.end ?? value, end: held?.end_edited ? held.end : value };
    if (!held || Math.abs(num(held.end) - num(next.end)) > 0.5 || Math.abs(num(held.amount) - num(next.amount)) > 0.5 || held.label !== next.label) changed = true;
    items[id] = next;
  }
  return { data: { period: month, items } as MonthData, changed };
}

/** Stores a hand-edited figure, remembering the original. A null value undoes the edit. */
export function applyLedgerEdit(data: MonthData | undefined, period: string, id: string, meta: Omit<LedgerItem, LedgerField>, field: LedgerField, value: number | null): MonthData {
  const held: LedgerItem = data?.items?.[id] || (meta as LedgerItem), edited = `${field}_edited` as const, original = `${field}_original` as const;
  const item: LedgerItem = value === null
    ? { ...held, [field]: held[original] ?? null, [edited]: false, [original]: undefined }
    : { ...held, [field]: value, [edited]: true, [original]: held[edited] ? held[original] : held[field] ?? null };
  return { ...(data || {}), period, items: { ...(data?.items || {}), [id]: item } };
}

/** Builds the table. A month opens at the previous month's close unless its opening figure was edited by hand. */
export function ledgerTable(months: MonthData[], columns: string[]) {
  const byPeriod = new Map(months.map(month => [month.period, month]));
  const ordered = [...months].sort((a, b) => a.period.localeCompare(b.period));
  const rows = new Map<string, LedgerRow>();
  for (const month of ordered) {
    for (const [id, item] of Object.entries(month.items || {})) {
      const row = rows.get(id);
      rows.set(id, { id, label: item.label, group: item.group, account: item.account, side: item.side, purchase: item.purchase ?? row?.purchase ?? null, cells: row?.cells || {} });
    }
  }
  for (const row of rows.values()) {
    for (const column of columns) {
      const item = byPeriod.get(column)?.items?.[row.id], before = byPeriod.get(previousMonth(column))?.items?.[row.id];
      if (!item) continue;
      const end = item.end ?? null, amount = item.amount ?? null;
      const start = item.start_edited ? item.start ?? null : before?.end ?? item.start ?? null;
      const flow = isFlow(row.side);
      row.cells[column] = {
        start, end, amount,
        change: flow ? (amount !== null && before?.amount != null ? amount - before.amount : null) : (start !== null && end !== null ? end - start : null),
        gain: !flow && end !== null && row.purchase !== null ? end - row.purchase : null,
        startEdited: !!item.start_edited, endEdited: !!item.end_edited, amountEdited: !!item.amount_edited,
      };
    }
  }
  const list = [...rows.values()].sort((a, b) => LEDGER_GROUPS.indexOf(a.group) - LEDGER_GROUPS.indexOf(b.group) || a.account.localeCompare(b.account) || a.label.localeCompare(b.label));
  return { rows: list, groups: LEDGER_GROUPS.filter(group => list.some(row => row.group === group)) };
}

type TotalField = 'start' | 'end' | 'amount' | 'change' | 'gain';
export const sumCells = (rows: LedgerRow[], month: string, field: TotalField) => rows.reduce((sum, row) => sum + num(row.cells[month]?.[field]), 0);
/** Assets less liabilities at the chosen point in the month. */
export const netWorthOn = (rows: LedgerRow[], month: string, field: 'start' | 'end' | 'change') =>
  sumCells(rows.filter(row => row.side === 'asset'), month, field) - sumCells(rows.filter(row => row.side === 'liability'), month, field);
export const netCashFlow = (rows: LedgerRow[], month: string) =>
  sumCells(rows.filter(row => row.side === 'inflow'), month, 'amount') - sumCells(rows.filter(row => row.side === 'outflow'), month, 'amount');

/** April to March months of the Indian financial year containing the given month, stopping at the current month. */
export function financialYearMonths(fyStartYear: number, currentMonth: string) {
  return Array.from({ length: 12 }, (_, index) => new Date(Date.UTC(fyStartYear, 3 + index, 1)).toISOString().slice(0, 7)).filter(month => month <= currentMonth);
}
export const financialYearOf = (month: string) => {
  const [year, value] = month.split('-').map(Number);
  return value < 4 ? year - 1 : year;
};

/** A monthly amount's total for the financial year, shown only once March is recorded so it is never a projection. */
export function financialYearTotal(row: LedgerRow, fyStartYear: number) {
  if (row.cells[`${fyStartYear + 1}-03`]?.amount == null) return null;
  return financialYearMonths(fyStartYear, `${fyStartYear + 1}-03`).reduce((sum, month) => sum + num(row.cells[month]?.amount), 0);
}

/** The month a yearly figure belongs to when nothing is saved for that year yet. */
export const yearlyPeriodFor = (fyStartYear: number, field: LedgerField, currentMonth: string) => {
  if (field === 'start') return `${fyStartYear}-04`;
  const close = `${fyStartYear + 1}-03`;
  return close < currentMonth ? close : currentMonth;
};

/**
 * One column per financial year: a value opens at its first saved month and closes at its last,
 * and a yearly amount is the latest one in that year. Figures stay stored by month, so editing a
 * yearly cell changes the month it came from.
 */
export function yearlyLedgerTable(months: MonthData[], years: number[], currentMonth: string) {
  const periods = [...new Set(years.flatMap(year => financialYearMonths(year, currentMonth)))].sort();
  const monthly = ledgerTable(months, periods);
  const sortedYears = [...years].sort((a, b) => a - b);
  const rows: LedgerRow[] = monthly.rows.map(row => {
    const cells: Record<string, LedgerCell | undefined> = {};
    let previous: LedgerCell | undefined;
    for (const year of sortedYears) {
      const held = financialYearMonths(year, currentMonth).filter(period => row.cells[period]);
      if (!held.length) continue;
      const startPeriod = held[0], endPeriod = held[held.length - 1], first = row.cells[startPeriod]!, last = row.cells[endPeriod]!;
      const start = first.startEdited ? first.start : previous?.end ?? first.start, flow = isFlow(row.side);
      const cell: LedgerCell = {
        start, end: last.end, amount: last.amount,
        change: flow ? (last.amount !== null && previous?.amount != null ? last.amount - previous.amount : null) : (start !== null && last.end !== null ? last.end - start : null),
        gain: last.gain, startEdited: first.startEdited, endEdited: last.endEdited, amountEdited: last.amountEdited, startPeriod, endPeriod,
      };
      cells[String(year)] = cell;
      previous = cell;
    }
    return { ...row, cells };
  });
  return { rows, groups: monthly.groups };
}
