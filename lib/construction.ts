// A property being built is paid for in stages, as the builder asks. The
// purchase price is the full price; each payment made is recorded with where
// the money came from, and what is still to pay is the price less those payments.

import { indiaToday } from "./plan/dates";

export type ConstructionPayment = { id: string; date: string; amount: number; from: "own" | "loan"; note?: string };

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export function cleanPayments(raw: unknown): ConstructionPayment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && typeof p === "object")
    .map((p: any) => ({
      id: String(p.id || ""),
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(p.date || "")) ? String(p.date) : "",
      amount: Math.max(0, n(p.amount)),
      from: p.from === "loan" ? ("loan" as const) : ("own" as const),
      note: p.note ? String(p.note).slice(0, 80) : undefined,
    }))
    .filter((p) => p.id && p.amount > 0)
    .sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
}

/** R1: a payment counts once its date has come. Undated payments count at once. */
export const isMadeBy = (p: Pick<ConstructionPayment, "date">, asOf: string) => !p.date || p.date <= asOf;

/**
 * Totals for a property being built, as of a day (R1). Payments dated after it are listed as
 * scheduled and count towards nothing yet. Without any payments recorded, an amount entered in
 * "Paid so far from your own money" still counts as paid.
 */
export function constructionSummary(data: Record<string, any> | null | undefined, asOf: string = indiaToday()) {
  const d = data || {}, payments = cleanPayments(d.construction_payments);
  const made = payments.filter((p) => isMadeBy(p, asOf)), scheduled = payments.filter((p) => !isMadeBy(p, asOf));
  const total = Math.max(0, n(d.purchase_price));
  const own = payments.length ? made.filter((p) => p.from === "own").reduce((s, p) => s + p.amount, 0) : Math.max(0, n(d.self_funded_so_far));
  const loan = made.filter((p) => p.from === "loan").reduce((s, p) => s + p.amount, 0);
  const paid = own + loan;
  return {
    payments,
    total,
    paid,
    own,
    loan,
    pending: Math.max(0, total - paid),
    overpaid: Math.max(0, paid - total),
    paidPct: total > 0 ? Math.min(100, (paid / total) * 100) : 0,
    lastPayment: made.at(-1) || null,
    /** Payments dated after the as-of day, not yet made. */
    scheduled,
    scheduledTotal: scheduled.reduce((s, p) => s + p.amount, 0),
  };
}
