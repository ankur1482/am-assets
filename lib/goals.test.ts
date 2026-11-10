import { describe, expect, it } from "vitest";
import { goalFunding, monthsUntil } from "./goals";

const asOf = new Date("2026-11-10T00:00:00+05:30");

describe("goalFunding", () => {
  const assets = [
    { key: "stocks", label: "Stocks", value: 400_000 },
    { key: "fixedIncome", label: "Fixed Income", value: 300_000 },
    { key: "bullion", label: "Gold & Silver", value: 200_000 },
    { key: "property", label: "Property", value: 0 },
  ];
  const liabilities = [{ key: "loans", label: "Loans", value: 150_000 }];

  it("measures net worth after liabilities against the total target", () => {
    const r = goalFunding(assets, liabilities, [{ id: "a", name: "Retire", target: 1_500_000 }], asOf);
    expect(r.totalAssets).toBe(900_000);
    expect(r.totalLiabilities).toBe(150_000);
    expect(r.netAvailable).toBe(750_000);
    expect(r.target).toBe(1_500_000);
    expect(r.gap).toBe(750_000);
    expect(r.fundedPct).toBe(50);
    expect(r.assets.map((a) => a.key)).toEqual(["stocks", "fixedIncome", "bullion"]);
  });

  it("funds high priority and earlier goals first", () => {
    const r = goalFunding(assets, liabilities, [
      { id: "low", name: "Car", target: 500_000, priority: "Low", targetDate: "2027-01-01" },
      { id: "late", name: "House", target: 600_000, priority: "High", targetDate: "2030-01-01" },
      { id: "soon", name: "School", target: 400_000, priority: "High", targetDate: "2027-11-10" },
    ], asOf);
    expect(r.goals.map((g) => [g.id, g.allocated, g.gap])).toEqual([
      ["soon", 400_000, 0],
      ["late", 350_000, 250_000],
      ["low", 0, 500_000],
    ]);
    const late = r.goals[1];
    expect(late.monthsLeft).toBe(38);
    expect(late.monthlyRequired).toBeCloseTo(250_000 / 38);
  });

  it("reports a surplus and never goes negative when debts exceed assets", () => {
    expect(goalFunding(assets, [], [{ id: "a", name: "x", target: 100_000 }], asOf).surplus).toBe(800_000);
    const r = goalFunding(assets, [{ key: "loans", label: "Loans", value: 2_000_000 }], [{ id: "a", name: "x", target: 100_000 }], asOf);
    expect(r.netAvailable).toBe(-1_100_000);
    expect(r.fundedPct).toBe(0);
    expect(r.goals[0].allocated).toBe(0);
    expect(r.gap).toBe(1_200_000);
  });
});

describe("monthsUntil", () => {
  it("counts whole months and handles blanks and past dates", () => {
    expect(monthsUntil("2027-11-10", asOf)).toBe(12);
    expect(monthsUntil("2020-01-01", asOf)).toBe(0);
    expect(monthsUntil(undefined, asOf)).toBeNull();
  });
});
