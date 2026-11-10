import { describe, expect, it } from "vitest";
import { computeRecord, loanPosition, PROPERTY_LOAN_FIELDS, preEmiPosition } from "./calculations";

const asOf = new Date("2026-11-10T12:00:00");
const building = {
  construction_status: "Under Construction",
  purchase_price: 10_000_000,
  loan_amount: 6_000_000,
  loan_interest_rate: 9,
  loan_tenure_months: 240,
  pre_emi: "Yes",
  possession_date: "2028-11-01",
  construction_payments: [
    { id: "a", date: "2025-06-01", amount: 1_500_000, from: "own" },
    { id: "b", date: "2026-03-01", amount: 2_000_000, from: "loan" },
  ],
};

describe("interest only until possession (pre-EMI)", () => {
  it("charges only interest on what the bank has paid out so far", () => {
    const p = preEmiPosition(building, PROPERTY_LOAN_FIELDS, asOf)!;
    expect(p.balance).toBe(2_000_000);
    expect(p.emi).toBeCloseTo(2_000_000 * 0.09 / 12); // ₹15,000 a month
    expect(p.nextPrincipal).toBe(0);
    expect(p.fullEmi).toBeGreaterThan(p.emi);
    // The full EMI starts at possession (24 months away) and then runs to clear the loan.
    expect(p.monthsLeft).toBeGreaterThan(24);
  });

  it("flows into the property's loan figures", () => {
    const c = computeRecord("property", building);
    expect(c.monthly_emi).toBeCloseTo(15_000);
    expect(c.loan_balance).toBe(2_000_000);
  });

  it("does not apply without the choice, once built, or after possession", () => {
    expect(preEmiPosition({ ...building, pre_emi: "No" }, PROPERTY_LOAN_FIELDS, asOf)).toBeNull();
    expect(preEmiPosition({ ...building, construction_status: "Ready" }, PROPERTY_LOAN_FIELDS, asOf)).toBeNull();
    expect(preEmiPosition({ ...building, possession_date: "2026-01-01" }, PROPERTY_LOAN_FIELDS, asOf)).toBeNull();
    expect(loanPosition({ ...building, pre_emi: "No" }, PROPERTY_LOAN_FIELDS, asOf).emi).toBeGreaterThan(15_000);
  });

  it("asks for a possession date when it is missing", () => {
    expect(preEmiPosition({ ...building, possession_date: "" }, PROPERTY_LOAN_FIELDS, asOf)!.warnings[0]).toMatch(/possession date/);
  });
});

describe("full EMI while being built", () => {
  it("charges interest and the EMI only on what the bank has paid out", () => {
    const fullEmi = { ...building, pre_emi: "No", loan_balance: "" };
    const p = loanPosition(fullEmi, PROPERTY_LOAN_FIELDS, asOf);
    expect(p.balance).toBe(2_000_000);
    expect(p.nextInterest).toBeCloseTo(15_000);
    // The EMI is for the disbursed ₹20 lakh over the tenure, far below the EMI on the full ₹60 lakh.
    expect(p.emi).toBeLessThan(loanPosition({ ...fullEmi, construction_payments: [] }, PROPERTY_LOAN_FIELDS, asOf).emi / 2);
    // The sanctioned loan still shows as entered.
    expect(computeRecord("property", fullEmi).loan_amount).toBe(6_000_000);
  });
});
