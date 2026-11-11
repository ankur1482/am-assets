// R4 / D15: the home you live in is left out of goals, and so is its own loan (unless the setting says otherwise).
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AS_OF, AS_OF_INSTANT, household } from "./__fixtures__/household";
import { goals } from "./__fixtures__/screens";
import { livedInHomes } from "./home";

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(AS_OF_INSTANT);
});
afterAll(() => vi.useRealTimers());

describe("livedInHomes", () => {
  it("finds the lived-in home, its value and its own loan", () => {
    const h = livedInHomes(household());
    expect([h.value, h.loan, h.records.length]).toEqual([15000000, 3000000, 1]);
  });

  it("with the setting on, the loan still counts against goals", () => {
    expect(livedInHomes(household(), { homeLoanAgainstPlan: true }).loan).toBe(0);
  });
});

describe("Goals net worth as cash", () => {
  it("leaves out the lived-in home's loan as well as the home", () => {
    const g = goals(household(), AS_OF, AS_OF_INSTANT);
    const withLoan = goals(household(), AS_OF, AS_OF_INSTANT, undefined, { homeLoanAgainstPlan: true });
    expect(Math.round(g.netAvailable - withLoan.netAvailable)).toBe(3000000);
  });
});
