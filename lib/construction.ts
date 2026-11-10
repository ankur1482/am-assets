// A property being built is paid for in stages, as the builder asks. The
// purchase price is the full price; each payment made is recorded with where
// the money came from, and what is still to pay is the price less those payments.

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

/**
 * Totals for a property being built. Without any payments recorded, an amount
 * entered in "Paid so far from your own money" still counts as paid.
 */
export function constructionSummary(data: Record<string, any> | null | undefined) {
  const d = data || {}, payments = cleanPayments(d.construction_payments);
  const total = Math.max(0, n(d.purchase_price));
  const own = payments.length ? payments.filter((p) => p.from === "own").reduce((s, p) => s + p.amount, 0) : Math.max(0, n(d.self_funded_so_far));
  const loan = payments.filter((p) => p.from === "loan").reduce((s, p) => s + p.amount, 0);
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
    lastPayment: payments.at(-1) || null,
  };
}
