// R3: overdraft accounts. Parked money up to the balance offsets the loan and can be redrawn;
// anything above the balance is the owner's own money.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { computeTotals } from "../calculations";
import { planningSnapshot } from "../predictions";
import { AS_OF, AS_OF_INSTANT, household, ID } from "./__fixtures__/household";
import { odPosition, splitParked } from "./od";

const od = (id: string, data: Record<string, any>) => ({ id, module_key: "property", data: { loan_structure: "Overdraft (OD)", loan_interest_rate: 8, ...data } });

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(AS_OF_INSTANT);
});
afterAll(() => vi.useRealTimers());

describe("splitParked (worked examples from the rule)", () => {
  it.each([
    [5000000, 5200000, 5000000, 200000],
    [3000000, 3000000, 3000000, 0],
    [0, 3000000, 0, 3000000],
  ])("balance %i, parked %i → offset %i, spare %i", (balance, parked, offset, spare) => {
    expect(splitParked(balance, parked)).toEqual({ offset, spare });
  });
});

describe("odPosition", () => {
  it("splits each OD account in the fixture", () => {
    const accounts = odPosition(household(), AS_OF).accounts.map((a) => [a.id, a.balance, a.parked, a.offset, a.spare, a.ambiguous]);
    expect(accounts).toEqual([
      [ID.odAbove, 4000000, 4200000, 4000000, 200000, false],
      // Balance entered as 0 with money parked: read as the sanctioned loan until the owner answers.
      [ID.odZero, 3000000, 3000000, 3000000, 0, true],
    ]);
  });

  it("totals spare and can-redraw money", () => {
    const p = odPosition(household(), AS_OF);
    expect([p.spare, p.canRedraw]).toEqual([200000, 7000000]);
  });

  it("an OD with nothing borrowed and money parked is all spare", () => {
    expect(odPosition([od("x", { od_parked_balance: 500000 })], AS_OF).spare).toBe(500000);
  });
});

describe("cash now and can redraw are never one headline", () => {
  it("cash now is savings, cash at home and OD spare; can redraw is the OD offset", () => {
    const s = planningSnapshot(household(), AS_OF);
    expect([s.cashNow, s.canRedraw]).toEqual([300000 + 150000 + 50000 + 200000, 7000000]);
  });
});

describe("net worth counts OD spare money", () => {
  it("adds the spare above the balance as an asset", () => {
    const records = household();
    const without = computeTotals(records.map((r) => (r.id === ID.odAbove ? { ...r, data: { ...r.data, od_parked_balance: 4000000 } } : r)));
    expect(Math.round(computeTotals(records).net - without.net)).toBe(200000);
  });
});
