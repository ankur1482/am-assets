import { describe, expect, it } from 'vitest';
import { computeRecord } from './calculations';
import { applyLedgerEdit, financialYearMonths, financialYearTotal, financialYearOf, isYearlyRow, ledgerEntries, ledgerTable, mergeCurrentMonth, netCashFlow, netWorthOn, previousMonth, yearlyLedgerTable, yearlyPeriodFor, type LedgerEntry, type MonthData } from './monthlyValuation';

const gold = (value: number): LedgerEntry => ({ id: 'gold', label: 'Gold', group: 'Bullion', account: 'Ankur', side: 'asset', value, purchase: 100 });
const rent = (value: number): LedgerEntry => ({ id: 'flat:rent', label: 'Flat', group: 'Rent', account: 'Ankur', side: 'inflow', value });
const meta = { label: 'Gold', group: 'Bullion', account: 'Ankur', side: 'asset' as const };

describe('month on month valuation', () => {
  it('sorts records into balances and monthly amounts', () => {
    const entries = ledgerEntries([
      { id: 's', module_key: 'stocks', data: { security_name: 'RELIANCE', account_name: 'Ankur', quantity: 2, inv_price: 100, live_price: 150 } },
      { id: 'sal', module_key: 'fixedIncome', data: { category: 'Salary', account_name: 'Ankur', employee_contribution: 200000, purchase_date: '2020-01-01' } },
      { id: 'bank', module_key: 'fixedIncome', data: { category: 'Savings in Bank', current_value_today: 5000 } },
      { id: 'fd', module_key: 'fixedIncome', data: { category: 'FD', current_value_today: 9000 } },
      { id: 'flat', module_key: 'property', data: { broker: 'Example Heights', security_name: 'Residential', purchase_price: 100, latest_value: 200, occupancy: 'Rented', monthly_rent: 30000, vacant_from: '2026-11-16', loan_balance: 80, od_parked_balance: 20, loan_structure: 'Overdraft (OD)', loan_interest_rate: 8, emis_left: 10 } },
      { id: 'linked', module_key: 'fixedIncome', data: { category: 'Rental Income', employee_contribution: 30000, linked_property_id: 'flat' } },
      { id: 'skip', module_key: 'watchlist', data: { security_name: 'Idea' } },
    ], computeRecord, '2026-11');
    const by = Object.fromEntries(entries.map(e => [e.id, e]));
    expect(by.s).toMatchObject({ group: 'Stocks & ETFs', side: 'asset', value: 300, purchase: 200 });
    expect(by.sal).toMatchObject({ group: 'Salary', side: 'inflow', value: 200000 });
    expect(by.bank).toMatchObject({ group: 'Savings & Cash', value: 5000 });
    expect(by.fd.group).toBe('Fixed Income');
    expect(by.flat).toMatchObject({ group: 'Property', value: 200 });
    expect(by['flat:rent'].value).toBe(15000);
    expect(by['flat:loan']).toMatchObject({ side: 'liability', value: 60 });
    expect(by['flat:emi'].side).toBe('outflow');
    expect(by.linked).toBeUndefined();
    expect(by.skip).toBeUndefined();
  });
  it('opens a month at the previous close and keeps updating only its close', () => {
    const october: MonthData = { period: '2026-10', items: { gold: { ...meta, start: 100, end: 120 } } };
    const first = mergeCurrentMonth(undefined, october, [gold(130)], '2026-11').data;
    expect(first.items.gold).toMatchObject({ start: 120, end: 130 });
    expect(mergeCurrentMonth(first, october, [gold(140)], '2026-11').data.items.gold).toMatchObject({ start: 120, end: 140 });
  });
  it('uses the current value as the opening for an item with no earlier month', () => {
    expect(mergeCurrentMonth(undefined, undefined, [gold(130)], '2026-11').data.items.gold).toMatchObject({ start: 130, end: 130 });
  });
  it('reports a change only when a figure really moved', () => {
    const { data } = mergeCurrentMonth(undefined, undefined, [gold(130)], '2026-11');
    expect(mergeCurrentMonth(data, undefined, [gold(130.2)], '2026-11').changed).toBe(false);
    expect(mergeCurrentMonth(data, undefined, [gold(135)], '2026-11').changed).toBe(true);
  });
  it('never overwrites an edited figure, and undoing restores the original', () => {
    const { data } = mergeCurrentMonth(undefined, undefined, [rent(30000)], '2026-11');
    const edited = applyLedgerEdit(data, '2026-11', 'flat:rent', rent(0), 'amount', 35000);
    expect(mergeCurrentMonth(edited, undefined, [rent(30000)], '2026-11').data.items['flat:rent'].amount).toBe(35000);
    const twice = applyLedgerEdit(edited, '2026-11', 'flat:rent', rent(0), 'amount', 36000);
    const undone = applyLedgerEdit(twice, '2026-11', 'flat:rent', rent(0), 'amount', null);
    expect(undone.items['flat:rent']).toMatchObject({ amount: 30000, amount_edited: false });
  });
  it('keeps the last values of an item that has since gone', () => {
    const { data } = mergeCurrentMonth(undefined, undefined, [gold(130)], '2026-11');
    expect(mergeCurrentMonth(data, undefined, [], '2026-11').data.items.gold.end).toBe(130);
  });
  it('allows a value to be entered for a past month with no saved data', () => {
    const data = applyLedgerEdit(undefined, '2026-05', 'gold', meta, 'end', 500);
    expect(data).toMatchObject({ period: '2026-05', items: { gold: { end: 500, end_edited: true, label: 'Gold' } } });
    expect(ledgerTable([data], ['2026-05']).rows[0].cells['2026-05']).toMatchObject({ start: null, end: 500, change: null });
  });
  it('carries an edited close into the next opening, unless that opening was edited too', () => {
    const october: MonthData = { period: '2026-10', items: { gold: { ...meta, purchase: 100, start: 100, end: 150, end_edited: true } } };
    const november: MonthData = { period: '2026-11', items: { gold: { ...meta, purchase: 100, start: 120, end: 180 } } };
    const row = ledgerTable([october, november], ['2026-10', '2026-11']).rows[0];
    expect(row.cells['2026-11']).toMatchObject({ start: 150, end: 180, change: 30, gain: 80 });
    const pinned = applyLedgerEdit(november, '2026-11', 'gold', meta, 'start', 160);
    expect(ledgerTable([october, pinned], ['2026-10', '2026-11']).rows[0].cells['2026-11']).toMatchObject({ start: 160, startEdited: true, change: 20 });
  });
  it('shows rent changing month to month', () => {
    const months: MonthData[] = [{ period: '2026-10', items: { r: { label: 'Flat', group: 'Rent', account: 'A', side: 'inflow', amount: 30000 } } }, { period: '2026-11', items: { r: { label: 'Flat', group: 'Rent', account: 'A', side: 'inflow', amount: 33000, amount_edited: true } } }];
    const row = ledgerTable(months, ['2026-10', '2026-11']).rows[0];
    expect(row.cells['2026-10']?.change).toBeNull();
    expect(row.cells['2026-11']).toMatchObject({ amount: 33000, change: 3000, amountEdited: true });
  });
  it('totals net worth and net cash flow for a month', () => {
    const month: MonthData = { period: '2026-11', items: {
      a: { label: 'Gold', group: 'Bullion', account: 'A', side: 'asset', start: 100, end: 200 },
      l: { label: 'Loan', group: 'Loans', account: 'A', side: 'liability', start: 50, end: 40 },
      i: { label: 'Salary', group: 'Salary', account: 'A', side: 'inflow', amount: 90 },
      o: { label: 'EMI', group: 'Loan EMIs', account: 'A', side: 'outflow', amount: 30 },
    } };
    const { rows, groups } = ledgerTable([month], ['2026-11']);
    expect(groups).toEqual(['Bullion', 'Loans', 'Salary', 'Loan EMIs']);
    expect(netWorthOn(rows, '2026-11', 'start')).toBe(50);
    expect(netWorthOn(rows, '2026-11', 'end')).toBe(160);
    expect(netCashFlow(rows, '2026-11')).toBe(60);
  });
  it('shows a sale beside its purchase cost and drops a sold holding after its sale month', () => {
    const sale = (status: string) => ({ id: 'tx', module_key: 'transactions', data: { sale_date: '2026-11-05', status, security_name: 'RELIANCE', quantity: 5, price: 200, proceeds: 1000, cost: 600, account_name: 'Ankur' } });
    expect(ledgerEntries([sale('posted')], computeRecord, '2026-11')[0]).toMatchObject({ id: 'tx:sale', group: 'Sale Proceeds', side: 'inflow', value: 1000, purchase: 600 });
    expect(ledgerEntries([sale('reversed')], computeRecord, '2026-11')[0].value).toBe(0);
    expect(ledgerEntries([sale('posted')], computeRecord, '2026-12')).toEqual([]);
    const sold = { id: 's', module_key: 'stocks', data: { security_name: 'RELIANCE', quantity: 0, sold_out: true, sold_out_on: '2026-11-05' } };
    expect(ledgerEntries([sold], computeRecord, '2026-11')[0].value).toBe(0);
    expect(ledgerEntries([sold], computeRecord, '2026-12')).toEqual([]);
  });
  it('tracks slow-moving items by year and everyday items by month', () => {
    const yearly = (group: string, label = 'Item') => isYearlyRow({ group, label });
    for (const group of ['Property', 'Loans', 'Borrowings', 'Insurance', 'Insurance Premiums']) expect(yearly(group)).toBe(true);
    for (const label of ['PPF', 'Sukanya Samriddhi', 'FD · Axis Bank', 'NSC', 'KVP', 'Bond', 'Corporate Deposit', 'Gratuity']) expect(yearly('Fixed Income', label)).toBe(true);
    for (const label of ['EPF', 'Company PF', 'Recurring Deposit']) expect(yearly('Fixed Income', label)).toBe(false);
    for (const group of ['Stocks & ETFs', 'Mutual Funds', 'Bullion', 'Savings & Cash', 'Salary', 'Rent', 'Dividends', 'Loan EMIs']) expect(yearly(group)).toBe(false);
  });
  it('records an insurance premium as a yearly expense and skips a policy with no value', () => {
    const compute = () => ({ latest: 0, invested: 0, annual_premium: 24000, premium_status: 'PAYING' });
    const entries = ledgerEntries([{ id: 'term', module_key: 'insurance', data: { security_name: 'Term cover' } }], compute, '2026-11');
    expect(entries).toEqual([expect.objectContaining({ id: 'term:premium', group: 'Insurance Premiums', side: 'outflow', value: 24000 })]);
  });
  it('builds a yearly column from the first and last saved months of the financial year', () => {
    const property = { label: 'Example Heights', group: 'Property', account: 'A', side: 'asset' as const, purchase: 100 };
    const months: MonthData[] = [
      { period: '2025-04', items: { p: { ...property, start: 150, end: 150 } } },
      { period: '2026-03', items: { p: { ...property, start: 150, end: 170 } } },
      { period: '2026-04', items: { p: { ...property, start: 999, end: 175 } } },
      { period: '2026-11', items: { p: { ...property, start: 175, end: 190, end_edited: true } } },
    ];
    const row = yearlyLedgerTable(months, [2025, 2026], '2026-11').rows[0];
    expect(row.cells['2025']).toMatchObject({ start: 150, end: 170, change: 20, startPeriod: '2025-04', endPeriod: '2026-03' });
    expect(row.cells['2026']).toMatchObject({ start: 170, end: 190, change: 20, gain: 90, endEdited: true, endPeriod: '2026-11' });
  });
  it('compares a yearly expense with the year before', () => {
    const premium = { label: 'Policy', group: 'Insurance Premiums', account: 'A', side: 'outflow' as const };
    const months: MonthData[] = [{ period: '2025-06', items: { x: { ...premium, amount: 20000 } } }, { period: '2026-11', items: { x: { ...premium, amount: 23000 } } }];
    expect(yearlyLedgerTable(months, [2025, 2026], '2026-11').rows[0].cells['2026']).toMatchObject({ amount: 23000, change: 3000 });
  });
  it('shows a yearly salary total only once March is recorded, from actual credits', () => {
    const salary = { label: 'Salary', group: 'Salary', account: 'A', side: 'inflow' as const };
    const november: MonthData = { period: '2026-11', items: { s: { ...salary, amount: 453000 } } };
    const december: MonthData = { period: '2026-12', items: { s: { ...salary, amount: 400000 } } };
    const march: MonthData = { period: '2027-03', items: { s: { ...salary, amount: 500000 } } };
    const columns = financialYearMonths(2026, '2027-03');
    expect(financialYearTotal(ledgerTable([november, december], columns).rows[0], 2026)).toBeNull();
    expect(financialYearTotal(ledgerTable([november, december, march], columns).rows[0], 2026)).toBe(1353000);
  });
  it('picks where a yearly figure is stored when that year has no data', () => {
    expect(yearlyPeriodFor(2024, 'start', '2026-11')).toBe('2024-04');
    expect(yearlyPeriodFor(2024, 'end', '2026-11')).toBe('2025-03');
    expect(yearlyPeriodFor(2026, 'end', '2026-11')).toBe('2026-11');
  });
  it('works out financial years and stops at the current month', () => {
    expect(financialYearOf('2026-11')).toBe(2026);
    expect(financialYearOf('2027-02')).toBe(2026);
    expect(financialYearMonths(2026, '2026-06')).toEqual(['2026-04', '2026-05', '2026-06']);
    expect(financialYearMonths(2025, '2026-11')).toHaveLength(12);
    expect(previousMonth('2027-01')).toBe('2026-12');
  });
});
