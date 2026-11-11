// R6: card spending is estimated from what was actually paid. For each of the last 6 complete months,
// the card bills marked paid on the Payments screen (or, when no bill was marked paid that month, what
// was spent on the card that month: tagged expenses and payments made by card). Months with
// nothing recorded are skipped. Three months or more give an estimate; fewer give a rough one.
// (Phase 2 adds a saved household figure for when there is too little history.)
import { num } from "../calculations";
import { cardSpendIn } from "../expenses";
import { isCardRow, MONTHLY_PAYMENT_MODULE, recurringPayments } from "../monthlyPayments";

type Rec = { id: string; module_key: string; data: Record<string, any> };

const MONTHS_BACK = 6, ENOUGH = 3;

/** The calendar month `back` months before `asOf`'s month, as YYYY-MM. */
function monthBefore(asOf: string, back: number) {
  const d = new Date(Date.UTC(Number(asOf.slice(0, 4)), Number(asOf.slice(5, 7)) - 1 - back, 1));
  return d.toISOString().slice(0, 7);
}

/** What went on cards in one calendar month, or 0 when nothing is recorded. */
export function cardSpendInMonth(records: Rec[], month: string) {
  const cardItemIds = new Set(recurringPayments(records).filter(isCardRow).map((row) => `rec:${row.id}`));
  const saved = records.find((r) => r.module_key === MONTHLY_PAYMENT_MODULE && r.data?.period === month)?.data;
  const bills = Object.entries((saved?.paid || {}) as Record<string, any>).filter(([id]) => cardItemIds.has(id)).reduce((s, [, e]) => s + Math.max(0, num(e?.amount)), 0);
  if (bills > 0) return bills;
  // Auto-debits repeat every month whether or not anything was recorded, so they do not make a month count as history.
  return cardSpendIn(records, month).reduce((s, card) => s + card.expenses + card.payments, 0);
}

export function cardEstimate(records: Rec[], asOf: string) {
  const history = Array.from({ length: MONTHS_BACK }, (_, i) => monthBefore(asOf, i + 1))
    .map((month) => ({ month, amount: cardSpendInMonth(records, month) }))
    .filter((m) => m.amount > 0);
  const months = history.length;
  return { monthly: months ? history.reduce((s, m) => s + m.amount, 0) / months : 0, months, rough: months > 0 && months < ENOUGH, history };
}
