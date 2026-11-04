import { describe, expect, it } from 'vitest';
import { buySignals, dividendHistory, lastBuyDate, LARGE_COMPANIES, matchIndianStock, parseCalendar } from './dividendCalendar';
import { DIVIDEND_MODULE } from './dividends';

const today = '2026-11-04';
const calendars = { HINDUNILVR: { symbol: 'HINDUNILVR', price: 2000, dividends: [{ exDate: '2026-11-12', announced: '2026-10-28', type: 'Interim', amount: 19 }, { exDate: '2026-06-23', announced: '2026-05-04', type: 'Final', amount: 22 }] } };
const stock = (extra = {}) => ({ symbol: 'HINDUNILVR', name: 'Hindustan Unilever', source: 'Watchlist' as const, price: 0, heldQuantity: 0, ...extra });

describe('dividend buy indicator', () => {
  it('picks the exact Indian ticker, never a similar or foreign result', () => {
    const rows = [
      { sc_id: 'AAPL:US', stock_name: 'Apple Inc', pdt_dis_nm: 'Apple Inc&nbsp; US0378331005, AAPL:US ' },
      { sc_id: 'ITC', stock_name: 'ITC', pdt_dis_nm: 'ITC&nbsp; INE154A01025, ITC, 500875 ' },
      { sc_id: 'PTC02', stock_name: 'PTC Industries', pdt_dis_nm: 'PTC Industries&nbsp; INE596F01018, PTCIL, 539006 ' },
    ];
    expect(matchIndianStock(rows, 'itc')).toEqual({ scId: 'ITC', name: 'ITC' });
    expect(matchIndianStock(rows, 'PTC')).toBeNull();
    expect(matchIndianStock(rows, 'AAPL')).toBeNull();
    expect(matchIndianStock('oops', 'ITC')).toBeNull();
    expect(matchIndianStock([{ sc_id: 'MM', stock_name: 'Mahindra', pdt_dis_nm: 'Mahindra&nbsp; INE101A01026, M&amp;M, 500520 ' }], 'M&M')?.scId).toBe('MM');
  });
  it('reads the announced dates and amounts, dropping rows with no usable date', () => {
    expect(parseCalendar([{ announce_date: '2026-10-28', dividend_type: 'Interim', effective_date: '12 Nov, 2026', dividend_amount: '19.00' }, { effective_date: 'soon' }])).toEqual([{ exDate: '2026-11-12', announced: '2026-10-28', type: 'Interim', amount: 19 }]);
    expect(parseCalendar(null)).toEqual([]);
  });
  it('sets the buy deadline to the weekday before the ex-date', () => {
    expect(lastBuyDate('2026-11-12')).toBe('2026-11-11');
    expect(lastBuyDate('2026-11-09')).toBe('2026-11-06');
  });
  it('shows upcoming dividends only, with the yield', () => {
    const [signal, ...rest] = buySignals([stock()], calendars, today);
    expect(rest).toEqual([]);
    expect(signal).toMatchObject({ exDate: '2026-11-12', buyBy: '2026-11-11', daysLeft: 7, amount: 19, price: 2000, strength: 'modest' });
    expect(signal.yieldPct).toBeCloseTo(0.95);
  });
  it('drops a dividend once the last day to buy has passed, but keeps it on that last day', () => {
    expect(buySignals([stock()], calendars, '2026-11-11')[0].daysLeft).toBe(0);
    expect(buySignals([stock()], calendars, '2026-11-12')).toEqual([]);
  });
  it('flags a higher yield and shows what your shares would earn', () => {
    const [signal] = buySignals([stock({ price: 1000, heldQuantity: 10, source: 'Holding' })], calendars, today);
    expect(signal).toMatchObject({ strength: 'higher', expected: 190, source: 'Holding' });
  });
  it('does not claim a yield when the amount is not announced', () => {
    const [signal] = buySignals([stock()], { HINDUNILVR: { symbol: 'HINDUNILVR', price: 100, dividends: [{ exDate: '2026-11-12', announced: '', type: 'Interim', amount: 0 }] } }, today);
    expect(signal).toMatchObject({ strength: 'amount_unknown', yieldPct: null });
  });
  it('has no repeated names in the list of large companies', () => {
    expect(new Set(LARGE_COMPANIES).size).toBe(LARGE_COMPANIES.length);
  });
});

describe('dividend history', () => {
  const receipt = (id: string, data: Record<string, any>) => ({ id, module_key: DIVIDEND_MODULE, data: { status: 'received', account_name: 'Meera', ticker_symbol: 'ITC', security_name: 'ITC', ...data } });
  it('keeps received dividends after the shares are sold or deleted', () => {
    const receipts = [receipt('a', { amount: 80, received_on: '2026-06-30' }), receipt('b', { amount: 65, received_on: '2026-03-01' })];
    const check = (records: any[], stillHeld: boolean) => expect(dividendHistory(records)).toEqual([expect.objectContaining({ account: 'Meera', ticker: 'ITC', total: 145, stillHeld })]);
    check([...receipts, { id: 's', module_key: 'stocks', data: { account_name: 'Meera', ticker_symbol: 'ITC' } }], true);
    check([...receipts, { id: 's', module_key: 'stocks', data: { account_name: 'Meera', ticker_symbol: 'ITC', sold_out: true } }], false);
    check(receipts, false);
  });
  it('lists the newest first, per person, and leaves out anything not received', () => {
    const history = dividendHistory([receipt('a', { amount: 1, received_on: '2026-03-01' }), receipt('b', { amount: 2, received_on: '2026-06-30' }), receipt('c', { amount: 9, received_on: '2026-06-30', account_name: 'Ankur' }), receipt('d', { amount: 99, status: 'not_received' }), receipt('e', { amount: 99, status: 'undone' })]);
    expect(history.map(group => [group.account, group.total])).toEqual([['Ankur', 9], ['Meera', 3]]);
    expect(history[1].receipts[0].amount).toBe(2);
  });
});
