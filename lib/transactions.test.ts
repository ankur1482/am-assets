import { describe, expect, it } from 'vitest';
import { computeRecord, computeTotals } from './calculations';
import { gainsByFinancialYear, holdingTerm, planSale, reduceLot, restoreLot, TRANSACTION_MODULE, xirr, type SaleLot } from './transactions';

const lots: SaleLot[] = [
  { id: 'new', quantity: 10, cost: 2000, purchaseDate: '2026-06-01' },
  { id: 'old', quantity: 10, cost: 1000, purchaseDate: '2024-01-15' },
];

describe('transaction ledger', () => {
  it('splits short and long term at twelve months', () => {
    expect(holdingTerm('2025-01-15', '2026-01-15')).toBe('short');
    expect(holdingTerm('2025-01-15', '2026-01-16')).toBe('long');
    expect(holdingTerm('', '2026-01-16')).toBe('unknown');
  });
  it('sells the oldest lots first and reports the gain on each', () => {
    const plan = planSale(lots, { quantity: 15, price: 300, charges: 150, date: '2026-11-01' });
    expect(plan.error).toBe('');
    expect(plan.lines.map(line => [line.lotId, line.quantity])).toEqual([['old', 10], ['new', 5]]);
    expect(plan.proceeds).toBe(4350);
    expect(plan.cost).toBe(2000);
    expect(plan.gain).toBe(2350);
    expect(plan.longTerm).toBeCloseTo(1900);
    expect(plan.shortTerm).toBeCloseTo(450);
    expect(plan.lines[1].share).toBe(0.5);
  });
  it('rejects impossible sales', () => {
    const sale = { quantity: 5, price: 10, charges: 0, date: '2026-11-01' };
    expect(planSale(lots, { ...sale, quantity: 21 }).error).toContain('held only 20');
    expect(planSale(lots, { ...sale, price: 0 }).error).toContain('selling price');
    expect(planSale(lots, { ...sale, quantity: 0 }).error).toContain('quantity');
    expect(planSale(lots, { ...sale, date: '' }).error).toContain('date');
    expect(planSale(lots, { ...sale, quantity: 15, date: '2025-01-01' }).error).toContain('held only 10');
  });
  it('sells undated lots last and flags them as unknown term', () => {
    const plan = planSale([{ id: 'x', quantity: 5, cost: 50, purchaseDate: '' }, ...lots], { quantity: 21, price: 10, charges: 0, date: '2026-11-01' });
    expect(plan.lines.at(-1)).toMatchObject({ lotId: 'x', term: 'unknown' });
    expect(plan.unknownTerm).toBeCloseTo(0);
  });
  it('reduces a holding and removes it from net worth, and undo puts it back', () => {
    const holding = { quantity: 10, inv_price: 100, live_price: 150, investment_amount: 1000, latest_value: 1500, purchase_date: '2024-01-15' };
    const partial = reduceLot(holding, 0.4, '2026-11-01');
    expect(partial.next).toMatchObject({ quantity: 6, investment_amount: 600, latest_value: 900 });
    expect(partial.next.sold_out).toBeUndefined();
    expect(computeRecord('stocks', partial.next).latest).toBe(900);
    const full = reduceLot(holding, 1, '2026-11-01');
    expect(full.next).toMatchObject({ quantity: 0, sold_out: true, sold_out_on: '2026-11-01' });
    expect(computeTotals([{ module_key: 'stocks', data: full.next }]).assets).toBe(0);
    expect(restoreLot(full.next, full.removed)).toMatchObject({ quantity: 10, investment_amount: 1000, latest_value: 1500 });
    expect(restoreLot(full.next, full.removed).sold_out).toBeUndefined();
  });
  it('sells a mutual fund holding the same way', () => {
    const fund = { quantity: 100, nav: 10, live_nav: 12, investment_amount: 1000, latest_value: 1200 };
    expect(computeRecord('mutualFunds', reduceLot(fund, 0.5, '2026-11-01').next)).toMatchObject({ invested: 500, latest: 600 });
  });
  it('totals gains by financial year and ignores reversed sales', () => {
    const sale = (id: string, sale_date: string, gain: number, status = 'posted') => ({ id, module_key: TRANSACTION_MODULE, data: { sale_date, gain, proceeds: gain + 100, cost: 100, short_term_gain: gain, long_term_gain: 0, unknown_term_gain: 0, status } });
    const years = gainsByFinancialYear([sale('a', '2026-04-01', 10), sale('b', '2027-03-31', 20), sale('c', '2026-03-31', 5), sale('d', '2026-06-01', 999, 'reversed')]);
    expect(years.map(year => [year.year, year.gain])).toEqual([[2026, 30], [2025, 5]]);
  });
  it('calculates an annualised return from dated cash flows', () => {
    expect(xirr([{ date: '2025-01-01', amount: -1000 }, { date: '2026-01-01', amount: 1100 }])).toBeCloseTo(10, 1);
    expect(xirr([{ date: '2025-01-01', amount: -1000 }])).toBeNull();
    expect(xirr([{ date: '', amount: -1000 }, { date: '2026-01-01', amount: 1100 }])).toBeNull();
  });
});
