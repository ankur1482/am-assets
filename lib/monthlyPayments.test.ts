import { describe, expect, it } from 'vitest';
import { computeRecord } from './calculations';
import { drawFromOd, monthlyRegularTotal, MONTHLY_PAYMENT_MODULE, odAccounts, parseRecurringImport, paymentsDue, paymentTotals, recurringData, returnToOd, type PaidEntry, type RecurringPayment } from './monthlyPayments';
import { planningSnapshot } from './predictions';

const loan = (id: string, data: Record<string, any> = {}) => ({ id, module_key: 'property', data: { broker: 'Example Heights', loan_institution: 'HDFC Bank', loan_balance: 1000000, loan_interest_rate: 12, emi_amount: 20000, loan_start_date: '2022-03-31', ...data } });
const paid = (amount: number): PaidEntry => ({ label: 'Example Heights', type: 'Loan EMI', amount, paid_on: '2026-11-05', from_id: 'od', from_name: 'HDFC', drawn: amount });

describe('monthly payments', () => {
  it('lists loan EMIs with their bank and due day, limited to the month length', () => {
    const [item] = paymentsDue([loan('a')], computeRecord, '2027-02');
    expect(item).toMatchObject({ id: 'a:emi', type: 'Loan EMI', bank: 'HDFC Bank', amount: 20000, dueDate: '2027-02-28' });
  });
  it('asks for nothing on an OD loan fully covered by parked savings', () => {
    const covered = loan('a', { emi_amount: 0, loan_structure: 'Overdraft (OD)', od_parked_balance: 1000000, emis_left: 100 });
    expect(paymentsDue([covered], computeRecord, '2026-11')).toEqual([]);
  });
  it('lists an insurance premium only in the month it falls due', () => {
    const compute = () => ({ premium_status: 'PAYING', next_premium_due_date: '2026-11-20' });
    const policy = { id: 'p', module_key: 'insurance', data: { security_name: 'Term', premium_amount: 24000 } };
    expect(paymentsDue([policy], compute, '2026-11')[0]).toMatchObject({ type: 'Insurance premium', amount: 24000, dueDate: '2026-11-20' });
    expect(paymentsDue([policy], compute, '2026-12')).toEqual([]);
  });
  it('includes payments added by hand, soonest first', () => {
    const items = paymentsDue([loan('a', { loan_start_date: '2022-03-20' })], computeRecord, '2026-11', { period: '2026-11', custom: [{ id: 'c', label: 'School fees', amount: 5000, due_date: '2026-11-03' }] });
    expect(items.map(item => item.label)).toEqual(['School fees', 'Example Heights']);
  });
  it('totals what is paid and still to pay, using the amount actually paid', () => {
    const items = paymentsDue([loan('a'), loan('b')], computeRecord, '2026-11', { period: '2026-11', paid: { 'a:emi': paid(21000) } });
    expect(paymentTotals(items)).toEqual({ paid: 21000, remaining: 20000, total: 41000, unpaidCount: 1 });
  });
  it('keeps a paid item listed after its loan has gone', () => {
    const items = paymentsDue([], computeRecord, '2026-11', { period: '2026-11', paid: { 'gone:emi': paid(9000) } });
    expect(items[0]).toMatchObject({ id: 'gone:emi', label: 'Example Heights', amount: 9000 });
  });
  describe('regular payments', () => {
    const list = (items: RecurringPayment[]) => ({ id: 'list', module_key: MONTHLY_PAYMENT_MODULE, data: recurringData(items) });
    const rows: RecurringPayment[] = [
      { id: 'a', label: 'Household', amount: 20000, due_day: null, via: 'Cash', kind: 'regular' },
      { id: 'b', label: 'Card', amount: 0, due_day: 21, via: '', kind: 'card' },
      { id: 'c', label: 'Mobile', amount: 2000, due_day: 4, via: 'Card', kind: 'on_card' },
    ];
    it('repeats every month with their due day', () => {
      const items = paymentsDue([list(rows)], computeRecord, '2026-11');
      expect(items.find(item => item.recurringId === 'b')).toMatchObject({ type: 'Credit card', dueDate: '2026-11-21', amount: 0 });
      expect(items.find(item => item.recurringId === 'a')?.dueDate).toBe('');
    });
    it('does not count a charge that is already inside a card bill', () => {
      const items = paymentsDue([list(rows)], computeRecord, '2026-11');
      expect(paymentTotals(items)).toMatchObject({ remaining: 20000, unpaidCount: 2 });
      expect(monthlyRegularTotal(rows)).toBe(20000);
    });
    it('uses an amount updated for one month without changing other months', () => {
      const saved = { period: '2026-11', amounts: { 'rec:b': 75000 } };
      expect(paymentsDue([list(rows)], computeRecord, '2026-11', saved).find(item => item.recurringId === 'b')?.amount).toBe(75000);
      expect(paymentsDue([list(rows)], computeRecord, '2026-12').find(item => item.recurringId === 'b')?.amount).toBe(0);
    });
    it('imports a list and rejects a bad file', () => {
      const imported = parseRecurringImport(JSON.stringify([{ label: ' Rent ', amount: '500', due_day: 40, kind: 'odd' }, { amount: 1 }, { label: 'Card', kind: 'card', due_day: 21 }]));
      expect(imported).toHaveLength(2);
      expect(imported[0]).toMatchObject({ label: 'Rent', amount: 500, due_day: null, kind: 'regular' });
      expect(imported[1]).toMatchObject({ kind: 'card', due_day: 21 });
      expect(() => parseRecurringImport('{"x":1}')).toThrow('payment list');
      expect(() => parseRecurringImport('not json')).toThrow();
    });
    it('reduces available cash flow in the planner', () => {
      const snapshot = planningSnapshot([list(rows), { id: 'sal', module_key: 'fixedIncome', data: { category: 'Salary', employee_contribution: 100000 } }], '2026-11-04');
      expect(snapshot).toMatchObject({ monthlyRegular: 20000, availableCashFlow: 80000 });
    });
  });
  it('offers OD accounts with the most parked money first', () => {
    const accounts = odAccounts([loan('s'), loan('a', { loan_structure: 'Overdraft (OD)', od_parked_balance: 100 }), loan('b', { loan_structure: 'Overdraft (OD)', od_parked_balance: 900 })]);
    expect(accounts.map(account => account.id)).toEqual(['b', 'a']);
  });
  it('takes a payment out of the OD account and puts it back on undo', () => {
    const { data, drawn, shortBy } = drawFromOd({ od_parked_balance: 1000 }, 300);
    expect(data.od_parked_balance).toBe(700);
    expect([drawn, shortBy]).toEqual([300, 0]);
    expect(returnToOd(data, drawn).od_parked_balance).toBe(1000);
  });
  it('never takes the OD account below zero and reports the shortfall', () => {
    expect(drawFromOd({ od_parked_balance: 100 }, 300)).toMatchObject({ data: { od_parked_balance: 0 }, drawn: 100, shortBy: 200 });
  });
});
