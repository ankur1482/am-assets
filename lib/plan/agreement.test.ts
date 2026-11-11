// Agreement tests: the same figure must be the same on every screen that shows it
// (PLAN_ENGINE_BRIEF section 6.2). Each `it.fails` documents a contradiction that exists today;
// the Phase 1 or Phase 2 task that removes it turns that test into a plain `it`.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AS_OF, AS_OF_INSTANT, household } from "./__fixtures__/household";
import { goals, home, planner } from "./__fixtures__/screens";
import type { SourcePicks } from "../plannerSources";

const rupees = (v: number) => Math.round(v);
// Choices a household might save in the Planner: the card bill unticked from living expenses
// and payroll PF unticked from cash-funded investing.
const SAVED_PICKS: SourcePicks = { expenses: ["payment:m1", "payment:m2"], investment: [] };

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(AS_OF_INSTANT);
});
afterAll(() => vi.useRealTimers());

describe("loans (6.2 items 1–2)", () => {
  // D10: planningSnapshot works out balances itself and drops loans that loanPosition finds.
  it.fails("1. monthly EMIs: Home Loans tile = cash flow = Planner", () => {
    const h = home(household(), AS_OF), p = planner(household(), AS_OF);
    expect(rupees(h.cashFlowEmis)).toBe(rupees(h.emis));
    expect(rupees(p.emis)).toBe(rupees(h.emis));
  });

  it.fails("2. number of loans: Home Loans tile = Planner payoff explorer", () => {
    expect(planner(household(), AS_OF).loanCount).toBe(home(household(), AS_OF).loanCount);
  });
});

describe("cash flow and cash (6.2 items 3, 4, 8)", () => {
  it("3a. typical monthly surplus agrees when nothing has been ticked in the Planner", () => {
    expect(rupees(planner(household(), AS_OF).surplus)).toBe(rupees(home(household(), AS_OF).surplus));
  });

  // D8: Home and the dashboard ignore the records ticked in the Planner.
  it.fails("3b. typical monthly surplus: Home = Planner with saved ticks", () => {
    expect(rupees(planner(household(), AS_OF, SAVED_PICKS).surplus)).toBe(rupees(home(household(), AS_OF).surplus));
  });

  // D11: Home adds every rupee parked in OD; the Planner adds parked money minus what is parked
  // against loans it happened to find. Neither is R3's "cash now".
  it.fails("4. cash now: Home = Planner", () => {
    expect(rupees(planner(household(), AS_OF).openingCash)).toBe(rupees(home(household(), AS_OF).liquidity));
  });

  // D7: each box shows the snapshot figure but the sum uses the ticked records.
  it.fails("8. each Planner box displays the number the calculation uses", () => {
    const boxes = planner(household(), AS_OF, SAVED_PICKS).boxes;
    for (const [name, box] of Object.entries(boxes)) expect(rupees(box.shown), name).toBe(rupees(box.used));
  });
});

describe("net worth (6.2 item 5)", () => {
  it("5. Home net worth = Goals 'net worth as cash' with the lived-in home and protection cover added back", () => {
    const h = home(household(), AS_OF), g = goals(household(), AS_OF, AS_OF_INSTANT);
    expect(rupees(g.netAvailable + g.homeValue + g.protectionValue)).toBe(rupees(h.netWorth));
  });
});

describe("goals (6.2 items 6, 7, 9)", () => {
  const both = () => {
    const g = goals(household(), AS_OF, AS_OF_INSTANT);
    return { g, p: planner(household(), AS_OF, {}, g.current) };
  };

  // D4: calendar months in one, plus one more month when the target day is later in the month in the other.
  it.fails("6a. months left: Goals = Planner", () => {
    const { g, p } = both();
    for (const goal of g.goals) expect(p.goals.find((x) => x.id === goal.id)?.forecast?.months, goal.id).toBe(goal.months);
  });

  // D2: a goal's value today is capped at its target, then handed to the Planner capped.
  it.fails("6b. value today: Goals card = its funding holdings = Planner starting value", () => {
    const { g, p } = both();
    for (const goal of g.goals.filter((x) => x.funding === "selected")) {
      expect(rupees(goal.shownToday), goal.id).toBe(rupees(goal.holdingsToday));
      expect(rupees(p.goals.find((x) => x.id === goal.id)!.current), goal.id).toBe(rupees(goal.holdingsToday));
    }
  });

  // D1, D5: Goals grows each holding at its own rate; the Planner grows the capped value at one flat rate.
  it.fails("6c. projected value at the target date: Goals = Planner", () => {
    const { g, p } = both();
    for (const goal of g.goals) expect(rupees(p.goals.find((x) => x.id === goal.id)?.forecast?.projected ?? 0), goal.id).toBe(rupees(goal.p?.projected ?? 0));
  });

  it.fails("6d. status: Goals = Planner", () => {
    const { g, p } = both();
    for (const goal of g.goals) {
      const f = p.goals.find((x) => x.id === goal.id)?.forecast, share = f && goal.target ? f.projected / goal.target : 0;
      const plannerStatus = !f ? "undated" : share >= 1 ? "on" : share >= 0.8 ? "close" : "off";
      expect(plannerStatus, goal.id).toBe(goal.status);
    }
  });

  it.fails("6e and 7. extra per month, each goal and in total: Goals = Planner", () => {
    const { g, p } = both();
    for (const goal of g.goals) expect(rupees(p.goals.find((x) => x.id === goal.id)?.forecast?.required ?? 0), goal.id).toBe(rupees(goal.p?.monthlyNeeded ?? 0));
    expect(rupees(p.extraNeeded)).toBe(rupees(g.extraNeeded));
  });

  it("9. no holding funds more than 100% across goals", () => {
    const ids = goals(household(), AS_OF, AS_OF_INSTANT).goals.flatMap((goal) => goal.holdingIds);
    expect(ids.length).toBe(new Set(ids).size);
  });
});

describe("the plan engine (6.2 item 10)", () => {
  it.todo("10. plan.netWorth.total = Σ assets − Σ liabilities (once buildPlan exists, task 2.1)");
});
