// R5: payroll contributions (Company PF, EPF) are deducted before take-home pay, so they are reported
// on their own line and never subtracted from cash flow again.
import { describe, expect, it } from "vitest";
import { pickedTotal, plannerSources } from "../plannerSources";
import { planningSnapshot } from "../predictions";
import { AS_OF, household, ID } from "./__fixtures__/household";
import { isPaidFromPayroll } from "./contributions";

describe("isPaidFromPayroll", () => {
  it.each([
    ["Company PF", undefined, true],
    ["EPF", undefined, true],
    ["PF", undefined, true],
    ["PPF", undefined, false],
    ["Recurring Deposit", undefined, false],
    ["Company PF", "Bank", false],
    ["Recurring Deposit", "Payroll", true],
  ])("%s with paid_from %s → %s", (category, paidFrom, expected) => {
    expect(isPaidFromPayroll({ category, paid_from: paidFrom })).toBe(expected);
  });
});

describe("cash flow", () => {
  it("reports payroll PF separately and does not subtract it", () => {
    const s = planningSnapshot(household(), AS_OF);
    expect(s.monthlyPayrollInvestment).toBe(30000);
    expect(s.monthlyInvestment).toBe(0);
  });

  it("counts a contribution saved as paid from the bank", () => {
    const records = household().map((r) => (r.id === ID.pf ? { ...r, data: { ...r.data, paid_from: "Bank" } } : r));
    const s = planningSnapshot(records, AS_OF);
    expect([s.monthlyInvestment, s.monthlyPayrollInvestment]).toEqual([30000, 0]);
  });

  it("the Planner leaves payroll contributions unticked, so its default matches the snapshot", () => {
    const records = household(), sources = plannerSources(records, AS_OF);
    const pf = sources.investment.find((i) => i.id === ID.pf);
    expect(pf?.defaultOn).toBe(false);
    expect(pf?.label).toMatch(/payroll/i);
    expect(pickedTotal(sources.investment, undefined)).toBe(planningSnapshot(records, AS_OF).monthlyInvestment);
  });
});
