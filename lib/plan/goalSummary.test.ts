// R17 / D3: no screen adds goals into one percentage. Home shows goals on track out of the total,
// the weakest goal with its percentage, and the extra needed each month against the monthly surplus.
import { describe, expect, it } from "vitest";
import { goalsSummary } from "./goalSummary";

const goal = (name: string, target: number, projected: number | null, monthlyNeeded = 0) => ({ name, target, projected, monthlyNeeded });

describe("goalsSummary", () => {
  it("counts by status and names the weakest goal, without a combined percentage", () => {
    const s = goalsSummary([
      goal("Legacy", 20000000, 71800000),
      goal("Marriage", 10000000, 7300000, 30000),
      goal("Education", 10000000, 8500000, 12000),
      goal("Someday", 5000000, null),
    ]);
    expect(s).toMatchObject({ total: 4, onTrack: 1, close: 1, needsWork: 1, undated: 1, extraMonthly: 42000 });
    expect(s.weakest).toEqual({ name: "Marriage", pct: 73 });
    expect(s).not.toHaveProperty("pct");
  });

  it("has no weakest goal when none can be projected", () => {
    expect(goalsSummary([goal("Someday", 100, null)]).weakest).toBeNull();
  });
});
