import { describe, expect, it } from "vitest";
import { computeRecord, computeTotals, num } from "./calculations";
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


describe("still to pay the builder counts as owed", () => {
  const home = { construction_status: "Under Construction", purchase_price: 10_000_000, latest_value: 10_000_000, construction_payments: [{ id: "a", date: "2026-01-01", amount: 3_000_000, from: "own" }] };
  it("is owed until possession once a payment is recorded", () => {
    expect(computeRecord("property", home).construction_owed).toBe(7_000_000);
    expect(computeTotals([{ module_key: "property", data: home }])).toMatchObject({ assets: 10_000_000, liabilities: 7_000_000, net: 3_000_000 });
  });
  it("is not taken off again when the value is only what has been paid so far", () => {
    const paidValue = { ...home, latest_value: 3_000_000 };
    expect(computeRecord("property", paidValue).construction_owed).toBe(0);
    expect(computeTotals([{ module_key: "property", data: paidValue }])).toMatchObject({ assets: 3_000_000, liabilities: 0, net: 3_000_000 });
    // A value part-way between counts only the unpaid part inside it.
    expect(computeRecord("property", { ...home, latest_value: 5_000_000 }).construction_owed).toBe(2_000_000);
    // A value above the full price (the home has gone up) still owes the whole unpaid price.
    expect(computeRecord("property", { ...home, latest_value: 12_000_000 }).construction_owed).toBe(7_000_000);
  });
  it("counts what has been paid as invested, so the unpaid price is not shown as a loss", () => {
    // Value entered as the amount paid so far.
    expect(computeRecord("property", { ...home, latest_value: 3_000_000 })).toMatchObject({ invested: 3_000_000, gain: 0 });
    // Value entered as the full price: what is still owed is set against it.
    expect(computeRecord("property", home)).toMatchObject({ invested: 3_000_000, construction_owed: 7_000_000, gain: 0 });
    // A rise in value still shows as a gain.
    expect(computeRecord("property", { ...home, latest_value: 11_000_000 }).gain).toBe(1_000_000);
  });
  it("works out what is left to clear and what is then yours", () => {
    // A ready home: value 1.7 Cr, loan in use 46.79 L.
    const ready = computeRecord("property", { construction_status: "Ready", purchase_price: 11_700_000, latest_value: 17_000_000, loan_amount: 6_000_000, loan_balance: 4_679_415, loan_interest_rate: 7.35, loan_tenure_months: 240, purchase_date: "2022-01-01" });
    expect(ready.to_clear).toBeCloseTo(num(ready.balance), 0);
    expect(ready.realised_value).toBeCloseTo(17_000_000 - num(ready.balance), 0);
    // Being built with the value entered as the full price: the builder amount is cleared too.
    expect(computeRecord("property", home)).toMatchObject({ to_clear: 7_000_000, realised_value: 3_000_000 });
  });
  it("is not counted when nothing is recorded, or once the home is ready", () => {
    expect(computeRecord("property", { ...home, construction_payments: [] }).construction_owed).toBe(0);
    expect(computeRecord("property", { ...home, construction_status: "Ready" }).construction_owed).toBe(0);
  });
});
