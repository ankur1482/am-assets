// Sukanya Samriddhi Account Scheme, 2019: deposits for 15 years, maturity at 21 years, half for her
// education from 18, early closure for her marriage at 18 or over, ₹1,50,000 a year at most.
import { describe, expect, it } from "vitest";
import { addYears, goalPurpose, sukanyaDepositMonths, sukanyaShareFor, sukanyaTerms } from "./sukanya";

const account = { account_name: "Mira", category: "Sukanya Samriddhi", purchase_date: "2018-06-01", current_value_today: 800000 };
const DOB = "2014-02-10";

describe("sukanyaTerms", () => {
  it("works out the deposit end, maturity and her 18th birthday", () => {
    expect(sukanyaTerms(account, DOB)).toMatchObject({ opened: "2018-06-01", depositsUntil: "2033-06-01", maturity: "2039-06-01", turns18: "2032-02-10", warnings: [] });
  });

  it("asks for her date of birth when it is missing", () => {
    expect(sukanyaTerms(account, null).warnings.join(" ")).toMatch(/date of birth/);
  });

  it("flags an account opened after she turned 10, and deposits above the yearly limit", () => {
    const w = sukanyaTerms({ ...account, yearly_investment: 200000 }, "2005-01-01").warnings.join(" ");
    expect(w).toMatch(/only allows opening before she turns 10/);
    expect(w).toMatch(/1,50,000 yearly limit/);
  });

  it("deposits stop after 15 years", () => {
    expect(sukanyaDepositMonths(sukanyaTerms(account, DOB), "2026-11-10")).toBe(79);
  });

  it("handles 29 February", () => {
    expect(addYears("2016-02-29", 21)).toBe("2037-02-28");
  });
});

describe("sukanyaShareFor a goal", () => {
  const terms = sukanyaTerms(account, DOB);
  it.each([
    ["2040-01-01", "other", 1],
    ["2035-01-01", "marriage", 1],
    ["2033-03-31", "education", 0.5],
    ["2031-03-31", "education", 0],
    ["2035-01-01", "other", 0],
  ] as const)("goal on %s for %s → share %f", (date, purpose, share) => {
    expect(sukanyaShareFor(terms, date, purpose).share).toBe(share);
  });
});

describe("goalPurpose", () => {
  it.each([
    [{ name: "Riya Higher Education" }, "education"],
    [{ name: "Isha Marriage" }, "marriage"],
    [{ category: "Education", name: "College" }, "education"],
    [{ name: "Retirement" }, "other"],
  ])("%o → %s", (goal, purpose) => {
    expect(goalPurpose(goal)).toBe(purpose);
  });
});

describe("Sukanya in a goal's projection", async () => {
  const { AS_OF, AS_OF_INSTANT, household, ID } = await import("./__fixtures__/household");
  const { goals } = await import("./__fixtures__/screens");
  const { DEFAULT_PLAN_SETTINGS } = await import("./settings");
  const settings = { ...DEFAULT_PLAN_SETTINGS, birthDates: { Mira: "2014-02-10" } };
  const withGoal = (data: Record<string, any>) => household().map((r) => (r.id === ID.goalPastSalary ? { ...r, data: { ...r.data, ...data } } : r));
  const line = (records: ReturnType<typeof household>, id: string) => goals(records, AS_OF, AS_OF_INSTANT, undefined, settings).goals.find((g) => g.id === ID.goalPastSalary)!.p!.items.find((i) => i.id === id)!;

  it("counts all of it for her marriage once she is 18", () => {
    const i = line(household(), ID.sukanya);
    expect(i.fixedAtTarget).toBeUndefined();
    expect(i.atTarget).toBeGreaterThan(800000);
  });

  it("counts none of it for her education before she turns 18", () => {
    const i = line(withGoal({ security_name: "Mira Education", category: "Education", target_date: "2031-03-31" }), ID.sukanya);
    expect(i.atTarget).toBe(0);
    expect(i.basis).toMatch(/not counted: not available before she turns 18/);
  });

  it("counts half for her education after 18 but before maturity", () => {
    const records = withGoal({ security_name: "Mira Education", category: "Education", target_date: "2033-03-31" });
    const half = line(records, ID.sukanya), full = line(withGoal({ security_name: "Mira Wedding", target_date: "2033-03-31" }), ID.sukanya);
    expect(half.atTarget).toBeCloseTo(full.atTarget / 2, 0);
  });

  it("a planned Sukanya deposit stops after 15 years", () => {
    const records = withGoal({ target_date: "2050-01-01", planned_investments: [{ id: "s1", instrument: "sukanya", mode: "monthly", amount: 10000 }] });
    expect(line(records, "planned:s1").payMonths).toBe(180);
  });

  it("asks for her date of birth when it is missing", () => {
    const i = goals(household(), AS_OF, AS_OF_INSTANT).goals.find((g) => g.id === ID.goalPastSalary)!.p!.items.find((x) => x.id === ID.sukanya)!;
    expect(i.warning).toMatch(/add her date of birth/);
  });
});

describe("the Fixed Income record", async () => {
  const { fixedIncomeMaturityDate } = await import("../calculations");
  it("matures 21 years after opening even with no lock-in entered", () => {
    expect(fixedIncomeMaturityDate({ category: "Sukanya Samriddhi", purchase_date: "2018-06-01" })).toBe("2039-06-01");
  });
});
