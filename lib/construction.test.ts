import { describe, expect, it } from "vitest";
import { cleanPayments, constructionSummary } from "./construction";

describe("property being built", () => {
  it("adds up stage payments and works out what is still to pay", () => {
    const s = constructionSummary({
      purchase_price: 10_000_000,
      construction_payments: [
        { id: "b", date: "2026-03-01", amount: 2_000_000, from: "loan" },
        { id: "a", date: "2025-06-15", amount: 1_500_000, from: "own", note: "Booking" },
        { id: "c", date: "2026-09-01", amount: 500_000, from: "own" },
      ],
    });
    expect(s).toMatchObject({ total: 10_000_000, paid: 4_000_000, own: 2_000_000, loan: 2_000_000, pending: 6_000_000, paidPct: 40 });
    expect(s.payments.map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(s.lastPayment?.id).toBe("c");
  });

  it("falls back to the own-money amount when no payments are recorded", () => {
    expect(constructionSummary({ purchase_price: 5_000_000, self_funded_so_far: 1_000_000 })).toMatchObject({ paid: 1_000_000, own: 1_000_000, pending: 4_000_000 });
    expect(constructionSummary({})).toMatchObject({ total: 0, paid: 0, pending: 0, paidPct: 0 });
  });

  it("never shows a negative amount still to pay", () => {
    expect(constructionSummary({ purchase_price: 100, construction_payments: [{ id: "x", date: "2026-01-01", amount: 150, from: "own" }] })).toMatchObject({ pending: 0, overpaid: 50 });
  });

  it("drops payments with no id or amount, and bad dates", () => {
    expect(cleanPayments([{ id: "", amount: 5 }, { id: "y", amount: 0 }, { id: "z", amount: 10, date: "soon" }, "junk"])).toEqual([{ id: "z", date: "", amount: 10, from: "own", note: undefined }]);
  });
});
