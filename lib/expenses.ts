import { num } from './calculations';
import { MONTHLY_PAYMENT_MODULE, firstWordMatch, recurringPayments } from './monthlyPayments';

export const EXPENSE_MODULE = 'expense';
export const CARD_PREFIX = 'card:';

type ExpenseRecord = { id: string; module_key: string; data: Record<string, any> };
export type PaymentCard = { id: string; label: string };
export type ExpenseTag = { id: string; label: string; onCard: boolean };
export type CardSpend = PaymentCard & { spend: number; expenses: number; payments: number; autoDebits: number };

/** Cards come from the regular payment list, including a card row saved as "same each month". */
export const paymentCards = (records: ExpenseRecord[]): PaymentCard[] =>
  recurringPayments(records).filter(row => row.kind === 'card' || /credit\s*card/i.test(row.label)).map(row => ({ id: `${CARD_PREFIX}${row.id}`, label: row.label }));

/** The one-tap choices when logging an expense. */
export const expenseTags = (records: ExpenseRecord[]): ExpenseTag[] => [
  ...paymentCards(records).map(card => ({ id: card.id, label: card.label, onCard: true })),
  { id: 'google-pay', label: 'Google Pay', onCard: false },
  { id: 'cash', label: 'Cash', onCard: false },
  { id: 'other', label: 'Other', onCard: false },
];

export const expensesIn = (records: ExpenseRecord[], month: string) =>
  records.filter(record => record.module_key === EXPENSE_MODULE && String(record.data?.date || '').slice(0, 7) === month);

/** Spending paid straight away this month. Card spending is left out, because it is paid when the bill comes. */
export const monthlyDirectExpenses = (records: ExpenseRecord[], month: string) =>
  expensesIn(records, month).filter(record => !String(record.data?.tag_id || '').startsWith(CARD_PREFIX)).reduce((sum, record) => sum + Math.max(0, num(record.data.amount)), 0);

/** Where the month's spending happened, biggest first. */
export function expensesByTag(records: ExpenseRecord[], month: string) {
  const totals = new Map<string, { label: string; total: number; count: number }>();
  for (const { data } of expensesIn(records, month)) {
    const label = String(data.tag_label || 'Other'), row = totals.get(label) || { label, total: 0, count: 0 };
    row.total += Math.max(0, num(data.amount)); row.count += 1;
    totals.set(label, row);
  }
  return [...totals.values()].sort((a, b) => b.total - a.total);
}

/**
 * An estimate of each card's next statement from what the app knows of this calendar month: expenses
 * tagged to it, payments marked paid from it, and charges auto-debited to it. Real statement cycles differ.
 */
export function cardSpendIn(records: ExpenseRecord[], month: string): CardSpend[] {
  const saved = records.find(record => record.module_key === MONTHLY_PAYMENT_MODULE && record.data?.period === month)?.data, regular = recurringPayments(records);
  return paymentCards(records).map(card => {
    const expenses = expensesIn(records, month).filter(record => record.data?.tag_id === card.id).reduce((sum, record) => sum + Math.max(0, num(record.data.amount)), 0);
    const payments = Object.values((saved?.paid || {}) as Record<string, any>).filter(entry => entry.from_id === card.id).reduce((sum, entry) => sum + Math.max(0, num(entry.amount)), 0);
    const autoDebits = regular.filter(row => row.kind === 'on_card' && firstWordMatch(row.via, { name: card.label })).reduce((sum, row) => sum + Math.max(0, num(row.amount)), 0);
    return { ...card, expenses, payments, autoDebits, spend: expenses + payments + autoDebits };
  });
}
