import { describe, expect, it } from 'vitest';
import { computeRecord } from './calculations';
import { dividendKey, dividendsReceivedIn, DIVIDEND_MODULE, dividendSymbols, pendingDividends, receiptCheck, validateReceipt } from './dividends';
import { earningsByPerson } from './earnings';
import { ledgerEntries } from './monthlyValuation';
import { planningSnapshot } from './predictions';
import { TRANSACTION_MODULE } from './transactions';

const stock = (id: string, data: Record<string, any> = {}) => ({ id, module_key: 'stocks', data: { account_name: 'Ankur', security_name: 'Reliance', ticker_symbol: 'RELIANCE', exchange: 'NSE', quantity: 10, inv_price: 100, purchase_date: '2024-01-01', ...data } });
const events = { RELIANCE: [{ date: '2025-08-14', amount: 5.5, currency: 'INR' }, { date: '2026-06-05', amount: 6, currency: 'INR' }] };
const pending = (records: any[], from = '2026-04-01') => pendingDividends(records, events, computeRecord, from, '2026-11-04');
const receipt = (data: Record<string, any>) => ({ id: 'd', module_key: DIVIDEND_MODULE, data: { status: 'received', account_name: 'Ankur', amount: 60, received_on: '2026-06-20', security_name: 'Reliance', ...data } });

describe('dividend confirmations', () => {
  it('asks about dividends since the start date on shares held', () => {
    expect(pending([stock('a')])).toEqual([expect.objectContaining({ account: 'Ankur', exDate: '2026-06-05', perShare: 6, quantity: 10, amount: 60, uncertain: false })]);
    expect(pending([stock('a')], '2025-01-01')).toHaveLength(2);
  });
  it('counts only shares bought before the ex-date', () => {
    expect(pending([stock('a'), stock('b', { quantity: 5, purchase_date: '2026-06-05' })])[0].quantity).toBe(10);
    expect(pending([stock('a', { purchase_date: '2026-07-01' })])).toEqual([]);
  });
  it('flags a holding with no purchase date for checking', () => {
    expect(pending([stock('a', { purchase_date: '' })])[0].uncertain).toBe(true);
  });
  it('asks each person separately', () => {
    expect(pending([stock('a'), stock('b', { account_name: 'Nina', quantity: 3 })]).map(item => [item.account, item.amount])).toEqual([['Ankur', 60], ['Nina', 18]]);
  });
  it('still counts shares sold on or after the ex-date, but not those sold before', () => {
    const sale = (sale_date: string) => ({ id: 't', module_key: TRANSACTION_MODULE, data: { status: 'posted', module_key: 'stocks', account_name: 'Ankur', ticker_symbol: 'RELIANCE', sale_date, lines: [{ quantity: 4, purchaseDate: '2024-01-01' }] } });
    const held = stock('a', { quantity: 6 });
    expect(pending([held, sale('2026-07-01')])[0].quantity).toBe(10);
    expect(pending([held, sale('2026-05-01')])[0].quantity).toBe(6);
  });
  it('stops asking once answered either way', () => {
    const key = dividendKey('Ankur', 'RELIANCE', '2026-06-05');
    expect(pending([stock('a'), receipt({ key })])).toEqual([]);
    expect(pending([stock('a'), receipt({ key, status: 'not_received' })])).toEqual([]);
  });
  it('ignores dividends dated in the future', () => {
    expect(pendingDividends([stock('a')], { RELIANCE: [{ date: '2026-12-01', amount: 1, currency: 'INR' }] }, computeRecord, '2026-04-01', '2026-11-04')).toEqual([]);
  });
  it('lists each stock once to look up', () => {
    expect(dividendSymbols([stock('a'), stock('b'), stock('c', { ticker_symbol: 'ITC' }), { id: 'x', module_key: 'goals', data: {} }])).toEqual([{ symbol: 'RELIANCE', exchange: 'NSE' }, { symbol: 'ITC', exchange: 'NSE' }]);
  });
  it('adds a confirmed dividend to that month only, in cash flow and month on month', () => {
    const records = [receipt({ key: 'k' }), { ...receipt({ key: 'k2', status: 'not_received', amount: 999, received_on: '' }), id: 'no' }];
    expect(dividendsReceivedIn(records, '2026-06')).toBe(60);
    expect(planningSnapshot(records, '2026-06-25')).toMatchObject({ monthlyDividend: 60, availableCashFlow: 60 });
    expect(planningSnapshot(records, '2026-07-01').monthlyDividend).toBe(0);
    expect(ledgerEntries(records, computeRecord, '2026-06')).toEqual([expect.objectContaining({ id: 'd:dividend', group: 'Dividends', side: 'inflow', value: 60, account: 'Ankur' })]);
    expect(ledgerEntries(records, computeRecord, '2026-07')).toEqual([]);
  });
});

describe('payout date validation', () => {
  const key = dividendKey('Ankur', 'RELIANCE', '2026-06-05');
  const at = (today: string, extra: any[] = []) => pendingDividends([stock('a'), ...extra], events, computeRecord, '2026-04-01', today)[0];
  it('estimates the payout 30 days after the ex-date, and does not ask before then', () => {
    expect(at('2026-06-20')).toMatchObject({ payoutDate: '2026-07-05', payoutEstimated: true, state: 'awaiting' });
    expect(at('2026-07-05').state).toBe('due');
    expect(at('2026-07-20').state).toBe('due');
    expect(at('2026-07-21').state).toBe('overdue');
  });
  it('uses a payout date you entered in place of the estimate', () => {
    const entered = { id: 'p', module_key: DIVIDEND_MODULE, data: { key, status: 'awaiting', payout_date: '2026-08-30' } };
    expect(at('2026-08-01', [entered])).toMatchObject({ payoutDate: '2026-08-30', payoutEstimated: false, state: 'awaiting' });
    expect(at('2026-08-30', [entered]).state).toBe('due');
  });
  it('keeps asking until answered when only a payout date has been saved', () => {
    expect(at('2026-09-30', [{ id: 'p', module_key: DIVIDEND_MODULE, data: { key, status: 'awaiting', payout_date: '2026-08-30' } }])).toBeDefined();
  });
  it('rejects answers that do not fit the dates', () => {
    const item = { exDate: '2026-06-05', payoutDate: '2026-08-30' }, today = '2026-11-04';
    expect(validateReceipt(item, '2026-08-30', 60, today)).toBe('');
    expect(validateReceipt(item, '2026-09-15', 60, today)).toBe('');
    expect(validateReceipt(item, '2026-08-29', 60, today)).toContain('before the payout date');
    expect(validateReceipt(item, '2026-12-01', 60, today)).toContain('future');
    expect(validateReceipt(item, '2026-08-30', 0, today)).toContain('amount');
  });
  it('cannot be confirmed while the payout date is still ahead, even with today as the date', () => {
    const item = { exDate: '2026-11-04', payoutDate: '2026-12-04' };
    expect(validateReceipt(item, '2026-11-04', 5.75, '2026-11-04')).toContain('confirmed from the payout date');
    expect(validateReceipt(item, '2026-12-04', 5.75, '2026-11-04')).toContain('confirmed from the payout date');
    expect(validateReceipt(item, '2026-12-04', 5.75, '2026-12-04')).toBe('');
    expect(validateReceipt({ exDate: '2026-11-04', payoutDate: '2026-11-04' }, '2026-11-04', 5.75, '2026-11-04')).toBe('');
  });
  it('reports timing and any shortfall against the announcement', () => {
    const data = { per_share: 6, quantity: 10, currency: 'INR', payout_date: '2026-07-05', payout_estimated: true };
    expect(receiptCheck({ ...data, amount: 60, received_on: '2026-07-05' })).toBe('On the payout date');
    expect(receiptCheck({ ...data, amount: 54, received_on: '2026-07-08' })).toBe('3 days after the estimated payout date. ₹6.00 less than announced, possibly tax deducted');
    expect(receiptCheck({ ...data, amount: 70, received_on: '2026-07-01' })).toContain('more than announced');
  });
});

describe('earnings by person', () => {
  const month = (period: string, items: Record<string, any>) => ({ period, items });
  const flow = (group: string, account: string, amount: number) => ({ label: group, group, account, side: 'inflow', amount });
  it('adds up what each person received in the financial year', () => {
    const months = [
      month('2026-04', { s: flow('Salary', 'Ankur', 100), r: flow('Rent', 'Meera', 30) }),
      month('2027-03', { s: flow('Salary', 'Ankur', 200), r: flow('Rent', 'Meera', 40), d: flow('Dividends', 'Nina', 5) }),
      month('2026-03', { s: flow('Salary', 'Ankur', 9999) }),
      month('2027-04', { s: flow('Salary', 'Ankur', 9999) }),
    ];
    const rows = earningsByPerson(months as any, [], 2026);
    expect(rows.map(row => row.account)).toEqual(['Ankur', 'Meera', 'Nina']);
    expect(rows[0]).toMatchObject({ salary: 300, salaryMonths: 2, total: 300 });
    expect(rows[1]).toMatchObject({ rent: 70, salaryMonths: 0 });
    expect(rows[2]).toMatchObject({ dividends: 5 });
  });
  it('counts a confirmed dividend once, not from both the receipt and month on month', () => {
    const months = [month('2026-06', { 'd:dividend': flow('Dividends', 'Ankur', 60) })];
    expect(earningsByPerson(months as any, [receipt({ key: 'k' })], 2026)[0]).toMatchObject({ dividends: 60, total: 60 });
  });
  it('splits realised gains by term, in the year of the sale', () => {
    const sale = (sale_date: string) => ({ id: sale_date, module_key: TRANSACTION_MODULE, data: { status: 'posted', account_name: 'Nina', sale_date, short_term_gain: 10, long_term_gain: 20, unknown_term_gain: 1 } });
    expect(earningsByPerson([], [sale('2026-05-01'), sale('2025-05-01')], 2026)[0]).toMatchObject({ shortTerm: 10, longTerm: 20, unknownTerm: 1, total: 31 });
  });
  it('includes interest supplied for the year', () => {
    expect(earningsByPerson([], [], 2026, { Meera: 500, Ankur: 0 })).toEqual([expect.objectContaining({ account: 'Meera', interest: 500, total: 500 })]);
  });
});
