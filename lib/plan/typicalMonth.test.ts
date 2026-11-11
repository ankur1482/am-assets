// R5: the typical month includes a twelfth of yearly insurance premiums, and dividends are the
// last 12 months' receipts divided by 12, not whatever happened to arrive this calendar month.
import { describe, expect, it } from "vitest";
import { pickedTotal, plannerSources } from "../plannerSources";
import { planningSnapshot } from "../predictions";
import { AS_OF, household } from "./__fixtures__/household";

const dividend = (id: string, received_on: string, amount: number) => ({
  id, module_key: "dividendReceipt",
  data: { key: id, status: "received", account_name: "Asha", security_name: "Example", ticker_symbol: "EX", ex_date: received_on, received_on, amount },
});

describe("dividends", () => {
  it("are the last 12 months' receipts divided by 12", () => {
    // 12,000 in Aug 2026 is inside the year; 24,000 in Oct 2025 is outside it.
    const s = planningSnapshot([...household(), dividend("old", "2025-10-20", 24000)], AS_OF);
    expect(s.monthlyDividend).toBe(1000);
  });

  it("the Planner's income uses the same average", () => {
    const records = household(), item = plannerSources(records, AS_OF).income.find((i) => i.id === "dividends-this-month");
    expect(item?.value).toBe(1000);
    expect(item?.label).toMatch(/last 12 months/);
  });
});

describe("insurance", () => {
  it("a twelfth of yearly premiums comes off the typical month", () => {
    const s = planningSnapshot(household(), AS_OF);
    expect(s.monthlyPremium).toBe((24000 + 60000) / 12);
    expect(s.availableCashFlow).toBeCloseTo(s.monthlyIncome - s.monthlyEmi - s.monthlyInvestment - s.monthlyRegular - s.monthlyCardEstimate - s.monthlyDirectExpenses - s.monthlyPremium);
  });

  it("the Planner premiums box still totals the year", () => {
    expect(pickedTotal(plannerSources(household(), AS_OF).insurance, undefined)).toBe(84000);
  });
});
