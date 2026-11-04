import { describe, expect, it } from 'vitest';
import { computeRecord } from './calculations';
import { addToAccount, defaultSource, dividendAccountFor, drawFromAccount, firstWordMatch, payAccountLabel, mergeRecurring, monthName, monthlyRegularTotal, MONTHLY_PAYMENT_MODULE, yearlyCommitments, odAccounts, parseRecurringImport, payAccounts, paymentsDue, paymentTotals, recurringData, type PaidEntry, type RecurringPayment } from './monthlyPayments';
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
  it('repeats a yearly premium in its month even when the saved year has passed', () => {
    const compute = () => ({ premium_status: 'PAYING', next_premium_due_date: '2024-11-20' });
    const policy = (premium_frequency: string) => ({ id: 'p', module_key: 'insurance', data: { security_name: 'Term', premium_amount: 24000, premium_frequency } });
    expect(paymentsDue([policy('Yearly')], compute, '2026-11')[0]).toMatchObject({ amount: 24000, dueDate: '2026-11-20' });
    expect(paymentsDue([policy('Yearly')], compute, '2026-12')).toEqual([]);
    expect(paymentsDue([policy('Quarterly')], compute, '2026-11')).toEqual([]);
  });
  it('shows a yearly investment in its due month, from the choice or else the start date', () => {
    const ppf = (extra = {}) => ({ id: 'f', module_key: 'fixedIncome', data: { category: 'PPF', account_name: 'Ankur', broker: 'Govt', yearly_investment: 150000, purchase_date: '2020-04-10', ...extra } });
    expect(paymentsDue([ppf()], computeRecord, '2027-04')[0]).toMatchObject({ id: 'f:yearly', type: 'Yearly investment', amount: 150000, dueDate: '2027-04-10' });
    expect(paymentsDue([ppf()], computeRecord, '2026-11')).toEqual([]);
    expect(paymentsDue([ppf({ investment_due_month: 'November' })], computeRecord, '2026-11')[0].amount).toBe(150000);
  });
  it('never treats salary or savings as a yearly investment', () => {
    const row = (category: string) => ({ id: category, module_key: 'fixedIncome', data: { category, yearly_investment: 100, investment_due_month: 'November' } });
    const records = [row('Salary'), row('Savings in Bank'), row('Cash at Home')];
    expect(paymentsDue(records, computeRecord, '2026-11')).toEqual([]);
    expect(yearlyCommitments(records, computeRecord)).toEqual([]);
  });
  it('lists every yearly commitment by due month, with unknown months last', () => {
    const compute = () => ({ premium_status: 'PAYING', annual_premium: 24000, next_premium_due_date: '2026-08-01' });
    const rows = yearlyCommitments([
      { id: 'a', module_key: 'fixedIncome', data: { category: 'PPF', yearly_investment: 150000 } },
      { id: 'b', module_key: 'fixedIncome', data: { category: 'Sukanya Samriddhi', yearly_investment: 100000, investment_due_month: 'April' } },
      { id: 'c', module_key: 'insurance', data: { security_name: 'Term', premium_frequency: 'Yearly' } },
    ], compute);
    expect(rows.map(row => [row.id, row.dueMonth])).toEqual([['b', 4], ['c', 8], ['a', null]]);
    expect(rows[1]).toMatchObject({ type: 'Insurance premium', amount: 24000 });
    expect(monthName(4)).toBe('April');
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
    it('keeps a transfer between your own accounts out of payments and cash flow', () => {
      const transfer: RecurringPayment = { id: 't', label: 'Axis to HDFC', amount: 250000, due_day: 4, via: 'Axis OD', to: 'HDFC', kind: 'transfer' };
      const items = paymentsDue([list([transfer])], computeRecord, '2026-11');
      expect(items[0]).toMatchObject({ transfer: true, informational: true, type: 'Background transfer', to: 'HDFC', dueDate: '2026-11-04' });
      expect(paymentTotals(items)).toMatchObject({ remaining: 0, paid: 0, unpaidCount: 0 });
      expect(monthlyRegularTotal([transfer])).toBe(0);
      const moved = paymentsDue([list([transfer])], computeRecord, '2026-11', { period: '2026-11', paid: { 'rec:t': paid(250000) } });
      expect(paymentTotals(moved)).toMatchObject({ paid: 0, unpaidCount: 0 });
    });
    it('defaults an HDFC loan to the Axis OD account that funds it in the background', () => {
      const accounts = payAccounts([
        loan('od', { loan_structure: 'Overdraft (OD)', loan_institution: 'Axis Bank', od_parked_balance: 5 }),
        loan('bob', { loan_structure: 'Overdraft (OD)', loan_institution: 'Bank of Baroda', od_parked_balance: 9 }),
        { id: 'sav', module_key: 'fixedIncome', data: { category: 'Savings in Bank', broker: 'HDFC Bank', current_value_today: 1 } },
      ]);
      const emi = { id: 'x:emi', label: 'Example Towers', type: 'Loan EMI', bank: 'HDFC Bank', amount: 1, dueDate: '', custom: false };
      const transfer = { id: 'rec:t', recurringId: 't', label: 'Move', type: 'Background transfer', bank: 'Axis OD', to: 'HDFC', amount: 1, dueDate: '', custom: false, transfer: true };
      expect(defaultSource(emi, [emi, transfer], accounts, 'bob')).toBe('od');
      expect(defaultSource(emi, [emi], accounts, 'bob')).toBe('sav');
      expect(defaultSource({ ...emi, bank: '' }, [emi, transfer], accounts, 'bob')).toBe('bob');
      expect(defaultSource({ ...emi, id: 'rec:s', recurringId: 's', bank: 'Axis OD' }, [emi], accounts, 'bob')).toBe('od');
    });
    it("finds each person's own HDFC savings for their dividends", () => {
      const savings = (id: string, broker: string, account_name: string) => ({ id, module_key: 'fixedIncome', data: { category: 'Savings in Bank', broker, account_name, current_value_today: 1 } });
      const accounts = payAccounts([savings('a', 'HDFC Bank', 'Ankur'), savings('k', 'HDFC Bank', 'Meera'), savings('x', 'Axis Bank', 'Nina')]);
      expect(dividendAccountFor(accounts, 'meera')?.id).toBe('k');
      expect(dividendAccountFor(accounts, 'Ankur')?.id).toBe('a');
      expect(dividendAccountFor(accounts, 'Nina')).toBeUndefined();
      expect(payAccountLabel(accounts[1])).toBe('HDFC Bank savings (Meera)');
    });
    it('moves money from the OD account to savings, keeping liquidity the same', () => {
      const od = drawFromAccount({ od_parked_balance: 300000 }, 'od', 250000), savings = addToAccount({ current_value_today: 1000 }, 'savings', od.drawn);
      expect(od.data.od_parked_balance).toBe(50000);
      expect(savings.current_value_today).toBe(251000);
      expect(drawFromAccount(savings, 'savings', 251000).data.current_value_today).toBe(0);
    });
    it('offers OD accounts then bank savings, and matches them by bank name', () => {
      const accounts = payAccounts([loan('a', { loan_structure: 'Overdraft (OD)', loan_institution: 'Axis Bank', od_parked_balance: 5 }), { id: 's', module_key: 'fixedIncome', data: { category: 'Savings in Bank', broker: 'HDFC Bank', current_value_today: 9 } }, { id: 'h', module_key: 'fixedIncome', data: { category: 'Cash at Home', current_value_today: 7 } }]);
      expect(accounts.map(account => [account.id, account.kind])).toEqual([['a', 'od'], ['s', 'savings']]);
      expect(firstWordMatch('Axis OD', accounts[0])).toBe(true);
      expect(firstWordMatch('HDFC Bank', accounts[0])).toBe(false);
    });
    it('replaces rows of the same name when imported again', () => {
      const merged = mergeRecurring(rows, parseRecurringImport(JSON.stringify([{ label: 'household', amount: 1 }])));
      expect(merged.filter(row => row.label.toLowerCase() === 'household')).toEqual([expect.objectContaining({ amount: 1 })]);
      expect(merged).toHaveLength(3);
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
    const { data, drawn, shortBy } = drawFromAccount({ od_parked_balance: 1000 }, 'od', 300);
    expect(data.od_parked_balance).toBe(700);
    expect([drawn, shortBy]).toEqual([300, 0]);
    expect(addToAccount(data, 'od', drawn).od_parked_balance).toBe(1000);
  });
  it('never takes the OD account below zero and reports the shortfall', () => {
    expect(drawFromAccount({ od_parked_balance: 100 }, 'od', 300)).toMatchObject({ data: { od_parked_balance: 0 }, drawn: 100, shortBy: 200 });
  });
});
