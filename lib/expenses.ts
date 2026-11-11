import { num } from './calculations';
import { MONTHLY_PAYMENT_MODULE, firstWordMatch, isCardRow, payAccountLabel, payAccounts, recurringPayments, recurringRecord } from './monthlyPayments';

export const EXPENSE_MODULE = 'expense';
export const CARD_PREFIX = 'card:';

type ExpenseRecord = { id: string; module_key: string; data: Record<string, any> };
export type PaymentCard = { id: string; label: string };
export type ExpenseTag = { id: string; label: string; onCard: boolean; cardId?: string; accountId?: string; accountKind?: 'od' | 'savings'; accountLabel?: string };
export type CardSpend = PaymentCard & { spend: number; expenses: number; payments: number; autoDebits: number };

/** Cards come from the regular payment list, including a card row saved as "same each month". */
export const paymentCards = (records: ExpenseRecord[]): PaymentCard[] =>
  recurringPayments(records).filter(isCardRow).map(row => ({ id: `${CARD_PREFIX}${row.id}`, label: row.label }));

/** Google Pay draws on whichever card or account was chosen for it, saved with the regular payment list. */
function googlePayTags(records: ExpenseRecord[]): ExpenseTag[] {
  const config = recurringRecord(records)?.data?.google_pay || {}, tags: ExpenseTag[] = [];
  const card = paymentCards(records).find(item => item.id === `${CARD_PREFIX}${config.card_id}`);
  if (card) tags.push({ id: `gpay:${card.id}`, label: `Google Pay · ${card.label}`, onCard: true, cardId: card.id });
  const account = payAccounts(records).find(item => item.id === config.account_id);
  if (account) tags.push({ id: `gpay:account:${account.id}`, label: `Google Pay · ${payAccountLabel(account)}`, onCard: false, accountId: account.id, accountKind: account.kind, accountLabel: payAccountLabel(account) });
  return tags.length ? tags : [{ id: 'google-pay', label: 'Google Pay', onCard: false }];
}

/** The one-tap choices when logging an expense. */
export const expenseTags = (records: ExpenseRecord[]): ExpenseTag[] => [
  ...googlePayTags(records),
  ...paymentCards(records).map(card => ({ id: card.id, label: card.label, onCard: true, cardId: card.id })),
  { id: 'cash', label: 'Cash', onCard: false },
  { id: 'other', label: 'Other', onCard: false },
];
const expenseCardId = (data: Record<string, any>) => String(data?.card_id || (String(data?.tag_id || '').startsWith(CARD_PREFIX) ? data.tag_id : ''));

export const expensesIn = (records: ExpenseRecord[], month: string) =>
  records.filter(record => record.module_key === EXPENSE_MODULE && String(record.data?.date || '').slice(0, 7) === month);

/** Spending paid straight away this month. Card spending is left out, because it is paid when the bill comes. */
export const monthlyDirectExpenses = (records: ExpenseRecord[], month: string) =>
  expensesIn(records, month).filter(record => !expenseCardId(record.data)).reduce((sum, record) => sum + Math.max(0, num(record.data.amount)), 0);

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
    const expenses = expensesIn(records, month).filter(record => expenseCardId(record.data) === card.id).reduce((sum, record) => sum + Math.max(0, num(record.data.amount)), 0);
    const payments = Object.values((saved?.paid || {}) as Record<string, any>).filter(entry => entry.from_id === card.id).reduce((sum, entry) => sum + Math.max(0, num(entry.amount)), 0);
    const autoDebits = regular.filter(row => row.kind === 'on_card' && firstWordMatch(row.via, { name: card.label })).reduce((sum, row) => sum + Math.max(0, num(row.amount)), 0);
    return { ...card, expenses, payments, autoDebits, spend: expenses + payments + autoDebits };
  });
}
