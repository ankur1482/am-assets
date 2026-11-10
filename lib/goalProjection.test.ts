import { describe, expect, it } from "vitest";
import { cleanGrowth, cleanPlanned, DEFAULT_GROWTH, futureValue, holdingGrowth, holdingMonthly, monthlyToClose, plannedItems, projectGoal, yearlyReturns } from "./goalProjection";

describe("goal projection", () => {
  it("picks a growth rate by type, using a saved interest rate first", () => {
    expect(holdingGrowth("bullion", { security_name: "Gold" }, DEFAULT_GROWTH)).toMatchObject({ rate: 12 });
    expect(holdingGrowth("bullion", { security_name: "Silver" }, DEFAULT_GROWTH)).toMatchObject({ rate: 9 });
    expect(holdingGrowth("property", {}, DEFAULT_GROWTH)).toMatchObject({ rate: 4 });
    expect(holdingGrowth("fixedIncome", { category: "Sukanya Samriddhi", interest_rate: 8.2 }, DEFAULT_GROWTH)).toEqual({ rate: 8.2, basis: "Its interest rate" });
    expect(holdingGrowth("fixedIncome", { category: "Cash at Home" }, DEFAULT_GROWTH).rate).toBe(0);
    expect(holdingGrowth("mutualFunds", {}, DEFAULT_GROWTH).rate).toBe(11);
  });

  it("counts ongoing deposits but not income rows", () => {
    expect(holdingMonthly("fixedIncome", { category: "PPF", yearly_investment: 150000 })).toBe(12500);
    expect(holdingMonthly("mutualFunds", { sip_amount: 5000 })).toBe(5000);
    expect(holdingMonthly("fixedIncome", { category: "Salary", employee_contribution: 200000 })).toBe(0);
    expect(holdingMonthly("property", {})).toBe(0);
  });

  it("grows today's value and monthly payments", () => {
    expect(futureValue(100, 0, 0, 24)).toBe(100);
    expect(futureValue(0, 10, 0, 12)).toBe(120);
    expect(futureValue(1000, 0, 10, 12)).toBeCloseTo(1100);
    expect(futureValue(1000, 0, 40, 24)).toBeCloseTo(1960); // 40% a year for two years
    expect(futureValue(1000, 0, 100, 12)).toBeCloseTo(1400); // rates above 40% are capped
    expect(monthlyToClose(120, 0, 12)).toBe(10);
    expect(monthlyToClose(0, 8, 12)).toBe(0);
  });

  it("projects a goal, taking a property loan off at the end", () => {
    const p = projectGoal({
      target: 3_000_000,
      months: 120,
      items: [
        { id: "gold", label: "Gold", today: 700_000, monthly: 0, rate: 12, basis: "" },
        { id: "flat", label: "Flat", today: 2_000_000, monthly: 0, rate: 4, basis: "", deduct: 1_000_000 },
      ],
    });
    expect(p.items[0].atTarget).toBeCloseTo(700_000 * Math.pow(1.12, 10), 0);
    expect(p.items[1].atTarget).toBeCloseTo(2_000_000 * Math.pow(1.04, 10) - 1_000_000, 0);
    expect(p.onTrack).toBe(true);
    expect(p.monthlyNeeded).toBe(0);
  });

  it("works out the extra monthly amount when short", () => {
    const p = projectGoal({ target: 1_000_000, months: 60, items: [{ id: "a", label: "A", today: 100_000, monthly: 0, rate: 8, basis: "" }] });
    expect(p.onTrack).toBe(false);
    expect(futureValue(0, p.monthlyNeeded, 8, 60) + p.projected).toBeCloseTo(1_000_000, 0);
  });
});

describe("growth rates, yearly returns and planned investments", () => {
  it("keeps only known, sensible saved rates", () => {
    expect(cleanGrowth({ gold: "14", shares: 99, nope: 5, silver: "", property: null })).toEqual({ gold: 14, shares: 40 });
    expect(cleanGrowth(undefined)).toEqual({});
  });

  it("works out each calendar year's change from year-end prices", () => {
    const r = yearlyReturns([
      { date: "2023-06-01", value: 50 }, { date: "2023-12-29", value: 100 },
      { date: "2024-12-31", value: 110 }, { date: "2025-12-31", value: 99 }, { date: "2026-11-09", value: 118.8 },
    ]);
    expect(r.map((x) => [x.year, Math.round(x.pct * 10) / 10])).toEqual([[2024, 10], [2025, -10], [2026, 20]]);
    expect(yearlyReturns([])).toEqual([]);
  });

  it("turns planned investments into projection lines at their type's rate", () => {
    const planned = cleanPlanned([
      { id: "a", type: "gold", mode: "monthly", amount: 5000 },
      { id: "b", type: "property", mode: "once", amount: 200000, note: "Plot booking" },
      { id: "", type: "gold", amount: 10 }, { id: "c", type: "bogus", amount: 0 },
    ]);
    expect(planned.map((p) => p.id)).toEqual(["a", "b"]);
    const items = plannedItems(planned, { ...DEFAULT_GROWTH, gold: 15 });
    expect(items[0]).toMatchObject({ monthly: 5000, today: 0, rate: 15 });
    expect(items[1]).toMatchObject({ label: "Planned: Plot booking (one-off)", today: 200000, monthly: 0, rate: 4 });
  });
});
