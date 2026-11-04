import { describe, expect, it } from 'vitest';
import { backupFingerprint } from './backups';
import { cardSpendIn, EXPENSE_MODULE, expensesByTag, expenseTags, monthlyDirectExpenses, paymentCards } from './expenses';
import { MONTHLY_PAYMENT_MODULE, recurringData, type RecurringPayment } from './monthlyPayments';
import { planningSnapshot } from './predictions';

const regular: RecurringPayment[] = [
  { id: 'h', label: 'hdfc credit card', amount: 300000, due_day: null, via: '', kind: 'regular' },
  { id: 'c2', label: 'Credit card 2', amount: 0, due_day: null, via: '', kind: 'card' },
  { id: 'a', label: 'Airtel mobile', amount: 2000, due_day: 4, via: 'HDFC card', kind: 'on_card' },
  { id: 'm', label: 'Maintenance', amount: 2500, due_day: null, via: 'Axis OD', kind: 'regular' },
];
const list = { id: 'list', module_key: MONTHLY_PAYMENT_MODULE, data: recurringData(regular) };
const expense = (id: string, amount: number, tag_id: string, tag_label: string, date = '2026-11-04') => ({ id, module_key: EXPENSE_MODULE, data: { amount, tag_id, tag_label, date, label: 'Lunch' } });
const paidFromCard = { id: 'nov', module_key: MONTHLY_PAYMENT_MODULE, data: { period: '2026-11', paid: { x: { from_id: 'card:h', amount: 5000 }, y: { from_id: 'od', amount: 999 } } } };

describe('daily expenses and card spend', () => {
  it('treats a row named credit card as a card even if saved as same each month', () => {
    expect(paymentCards([list]).map(card => card.label)).toEqual(['hdfc credit card', 'Credit card 2']);
  });
  it('offers cards first, then Google Pay, cash and other', () => {
    expect(expenseTags([list]).map(tag => [tag.label, tag.onCard])).toEqual([['hdfc credit card', true], ['Credit card 2', true], ['Google Pay', false], ['Cash', false], ['Other', false]]);
  });
  it('shows where the month’s money went, biggest first', () => {
    const records = [expense('a', 100, 'card:h', 'hdfc credit card'), expense('b', 300, 'google-pay', 'Google Pay'), expense('c', 50, 'card:h', 'hdfc credit card'), expense('d', 999, 'cash', 'Cash', '2026-10-30')];
    expect(expensesByTag(records, '2026-11')).toEqual([{ label: 'Google Pay', total: 300, count: 1 }, { label: 'hdfc credit card', total: 150, count: 2 }]);
  });
  it('estimates a card statement from expenses, payments from it, and auto-debits on it', () => {
    const [hdfc, other] = cardSpendIn([list, paidFromCard, expense('a', 1000, 'card:h', 'hdfc credit card'), expense('b', 7, 'card:h', 'hdfc credit card', '2026-10-01')], '2026-11');
    expect(hdfc).toMatchObject({ expenses: 1000, payments: 5000, autoDebits: 2000, spend: 8000 });
    expect(other.spend).toBe(0);
  });
  it('takes direct spending out of cash flow, but not card spending, which is paid by the bill', () => {
    const records = [expense('a', 1000, 'card:h', 'hdfc credit card'), expense('b', 300, 'google-pay', 'Google Pay'), expense('c', 200, 'cash', 'Cash')];
    expect(monthlyDirectExpenses(records, '2026-11')).toBe(500);
    expect(planningSnapshot([...records, { id: 's', module_key: 'fixedIncome', data: { category: 'Salary', employee_contribution: 10000 } }], '2026-11-04')).toMatchObject({ monthlyDirectExpenses: 500, availableCashFlow: 9500 });
    expect(planningSnapshot(records, '2026-12-01').monthlyDirectExpenses).toBe(0);
  });
  it('makes a new expense trigger a backup', () => {
    expect(backupFingerprint([], [expense('a', 1, 'cash', 'Cash')])).not.toBe(backupFingerprint([], []));
  });
});
