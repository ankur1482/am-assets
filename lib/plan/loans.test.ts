// R2: one loan position. Every screen lists the same loans with the same balance and EMI.
import { describe, expect, it } from "vitest";
import { loanPosition, LOAN_FIELDS, PROPERTY_LOAN_FIELDS } from "../calculations";
import { AS_OF, AS_OF_INSTANT, household, ID } from "./__fixtures__/household";
import { loansOf } from "./loans";

const rec = (id: string, module_key: string, data: Record<string, any>) => ({ id, module_key, data });

describe("loansOf", () => {
  it("lists every loan in the fixture, including the one that exists only through builder payments", () => {
    const ids = loansOf(household(), AS_OF).map((l) => l.id).sort();
    expect(ids).toEqual([ID.building, ID.emiFlat, ID.home, ID.odAbove, ID.odZero].sort());
  });

  it("takes balance, EMI and parked money from loanPosition and nothing else", () => {
    const records = household();
    for (const loan of loansOf(records, AS_OF)) {
      const p = loanPosition(records.find((r) => r.id === loan.id)!.data, PROPERTY_LOAN_FIELDS, AS_OF_INSTANT);
      expect([loan.balance, loan.emi, loan.parked, loan.netBalance], loan.id).toEqual([p.balance, p.emi, p.parked, p.netBalance]);
    }
  });

  it("includes loans and borrowings as well as property loans", () => {
    const loans = loansOf([
      rec("l", "loans", { security_name: "Car", loan_amount: 500000, loan_balance: 300000, interest_rate: 9, emi_amount: 12000 }),
      rec("b", "borrowings", { security_name: "From a friend", loan_balance: 100000, monthly_emi: 5000 }),
    ], AS_OF);
    expect(loans.map((l) => [l.id, l.balance, l.emi])).toEqual([["l", 300000, 12000], ["b", 100000, 5000]]);
  });

  it("leaves out loans with nothing outstanding", () => {
    expect(loansOf([rec("l", "loans", { loan_amount: 500000, loan_balance: 0, interest_rate: 9 })], AS_OF)).toEqual([]);
  });
});

describe("loanPosition: blank balance versus an entered 0 (R2)", () => {
  const base = { loan_amount: 1000000, interest_rate: 9, tenure_months: 120, purchase_date: "2024-01-05" };

  it("a blank balance is worked out from the EMI schedule", () => {
    expect(loanPosition({ ...base, loan_balance: "" }, LOAN_FIELDS, AS_OF_INSTANT).balance).toBeGreaterThan(0);
    expect(loanPosition({ ...base }, LOAN_FIELDS, AS_OF_INSTANT).balance).toBeGreaterThan(0);
  });

  it("an entered 0 means nothing is outstanding", () => {
    const p = loanPosition({ ...base, loan_balance: 0 }, LOAN_FIELDS, AS_OF_INSTANT);
    expect([p.balance, p.emi]).toEqual([0, 0]);
  });

  it("an OD loan with 0 entered and money parked keeps today's reading until the owner says which is meant", () => {
    const p = loanPosition({ ...base, loan_structure: "Overdraft (OD)", loan_balance: 0, od_parked_balance: 400000 }, LOAN_FIELDS, AS_OF_INSTANT);
    expect(p.balance).toBe(1000000);
  });
});
