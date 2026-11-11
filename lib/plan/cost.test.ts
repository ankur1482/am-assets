// R18 / D20: a holding with no recorded cost has an unknown cost, not a cost of zero. Its value counts
// in net worth; it is left out of every gain figure and percentage.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { computeRecord, computeTotals } from "../calculations";
import { AS_OF_INSTANT, household, ID } from "./__fixtures__/household";

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(AS_OF_INSTANT);
});
afterAll(() => vi.useRealTimers());

const ppf = () => household().find((r) => r.id === ID.ppf)!;

describe("fixed income with only a balance entered", () => {
  it("has no recorded cost and no gain", () => {
    const c = computeRecord("fixedIncome", ppf().data);
    expect([c.invested, c.gain, c.gain_pct, c.latest]).toEqual([null, null, null, 1200000]);
  });

  it("uses Total deposited so far as its cost when entered", () => {
    const c = computeRecord("fixedIncome", { ...ppf().data, total_deposited: 800000 });
    expect([c.invested, c.gain]).toEqual([800000, 400000]);
  });

  it("savings and cash still count their balance as cost", () => {
    const c = computeRecord("fixedIncome", household().find((r) => r.id === ID.savingsHdfc)!.data);
    expect([c.invested, c.gain]).toEqual([300000, 0]);
  });
});

describe("totals", () => {
  it("count the value in net worth but leave it out of invested and gain", () => {
    const only = (records: ReturnType<typeof household>) => computeTotals(records.filter((r) => r.id === ID.ppf || r.id === ID.stockBig));
    const t = only(household());
    expect([t.assets, t.invested, t.gain]).toEqual([1200000 + 2000000, 1000000, 1000000]);
  });
});
