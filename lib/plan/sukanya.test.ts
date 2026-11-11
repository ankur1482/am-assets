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

// Finding the girl's date of birth when names do not match exactly (reported 11 Nov 2026: the date of
// birth was entered on the account but the goal said it was not entered).
describe("finding her date of birth", async () => {
  const { birthDateOf, namesInGoal, sukanyaGirl } = await import("./sukanya");
  const { AS_OF, AS_OF_INSTANT, household, ID } = await import("./__fixtures__/household");
  const { goals } = await import("./__fixtures__/screens");
  const { DEFAULT_PLAN_SETTINGS } = await import("./settings");
  const dates = { "Riya ": "2014-02-10", Asha: "1985-07-01" };

  it("ignores capitals and extra spaces", () => {
    expect(birthDateOf(dates, "riya")).toBe("2014-02-10");
  });

  it("finds an account name inside the goal's name", () => {
    expect(namesInGoal("Riya Higher Education", dates)).toEqual(["Riya "]);
    expect(namesInGoal("Retirement", dates)).toEqual([]);
  });

  it("passes over a parent named on the record and takes the girl from the goal's name", () => {
    expect(sukanyaGirl(["Asha", "Riya"], dates, "2018-06-01")).toMatchObject({ name: "Riya", birthDate: "2014-02-10" });
  });

  it("a goal whose Sukanya is in a parent's name still finds the girl through the goal's name", () => {
    const records = household().map((r) =>
      r.id === ID.sukanya ? { ...r, data: { ...r.data, account_name: "Asha" } }
      : r.id === ID.goalPastSalary ? { ...r, data: { ...r.data, security_name: "Mira Education", category: "Education", target_date: "2031-03-31" } } : r);
    const settings = { ...DEFAULT_PLAN_SETTINGS, birthDates: { Asha: "1985-07-01", Mira: "2014-02-10" } };
    const line = goals(records, AS_OF, AS_OF_INSTANT, undefined, settings).goals.find((g) => g.id === ID.goalPastSalary)!.p!.items.find((i) => i.id === ID.sukanya)!;
    expect(line.basis).toMatch(/not available before she turns 18 \(2032-02-10\)/);
    expect(line.warning).toBeUndefined();
  });

  it("when nothing is found, says which names were looked for", () => {
    const line = goals(household(), AS_OF, AS_OF_INSTANT).goals.find((g) => g.id === ID.goalPastSalary)!.p!.items.find((i) => i.id === ID.sukanya)!;
    expect(line.basis).toMatch(/no date of birth found for her \(looked for "Mira"\)/);
    expect(line.warning).toMatch(/No date of birth was found for "Mira"/);
  });

  it("a planned Sukanya finds the girl of the goal's existing Sukanya, not the goal's owner", () => {
    const records = household().map((r) => (r.id === ID.goalPastSalary ? { ...r, data: { ...r.data, planned_investments: [{ id: "s1", instrument: "sukanya", mode: "monthly", amount: 10000 }] } } : r));
    const settings = { ...DEFAULT_PLAN_SETTINGS, birthDates: { Asha: "1985-07-01", Mira: "2020-05-05" } };
    const line = goals(records, AS_OF, AS_OF_INSTANT, undefined, settings).goals.find((g) => g.id === ID.goalPastSalary)!.p!.items.find((i) => i.id === "planned:s1")!;
    expect(line.warning).toBeUndefined();
    expect(line.basis).not.toMatch(/no date of birth/);
  });
});

// Fixed Income is the source for Sukanya accounts: their dates and the scheme checks are worked out
// there, from the opening date and the girl's date of birth, and goals read the same facts.
describe("Sukanya facts for the Fixed Income page", async () => {
  const { sukanyaFacts, sukanyaSaveCheck } = await import("./sukanya");
  const dates = { Mira: "2014-02-10", Asha: "1985-07-01", Riya: "2010-03-01" };
  const rec = (data: Record<string, any>) => ({ account_name: "Mira", category: "Sukanya Samriddhi", purchase_date: "2018-06-01", ...data });

  it("works out her age at opening, deposit end, education and marriage dates, maturity and status", () => {
    expect(sukanyaFacts(rec({ yearly_investment: 150000 }), dates, "2026-11-10")).toMatchObject({
      girl: "Mira", birthDate: "2014-02-10", ageAtOpening: 4, ageToday: 12,
      depositsUntil: "2033-06-01", depositYearsLeft: 6, educationFrom: "2032-02-10", marriageFrom: "2032-02-10", maturity: "2039-06-01",
      status: "Deposits open", withinYearlyLimit: true,
    });
  });

  it("knows when deposits have closed and when it has matured", () => {
    expect(sukanyaFacts(rec({ purchase_date: "2005-01-01", account_name: "Riya" }), dates, "2026-11-10").status).toBe("Matured");
    expect(sukanyaFacts(rec({ purchase_date: "2010-06-01", account_name: "Riya" }), dates, "2026-11-10").status).toBe("Deposits closed, still earning interest");
  });

  describe("saving applies the scheme rules", () => {
    it("accepts a valid account and fills in the 21-year term and the notified rate", () => {
      const r = sukanyaSaveCheck(rec({}), dates, []);
      expect(r.errors).toEqual([]);
      expect(r.data).toMatchObject({ lock_in_years: 21, interest_rate: 8.2, maturity_date: "2039-06-01" });
    });

    it("refuses an account in a parent's name", () => {
      expect(sukanyaSaveCheck(rec({ account_name: "Asha" }), dates, []).errors.join(" ")).toMatch(/in the girl's own name/);
    });

    it("refuses opening after she turned 10", () => {
      expect(sukanyaSaveCheck(rec({ account_name: "Riya", purchase_date: "2021-01-01" }), dates, []).errors.join(" ")).toMatch(/before she turns 10/);
    });

    it("refuses more than ₹1,50,000 a year", () => {
      expect(sukanyaSaveCheck(rec({ yearly_investment: 200000 }), dates, []).errors.join(" ")).toMatch(/1,50,000/);
    });

    it("refuses a second account for the same girl", () => {
      expect(sukanyaSaveCheck(rec({}), dates, [{ id: "other", data: rec({}) }]).errors.join(" ")).toMatch(/only one Sukanya account/);
    });

    it("needs her date of birth and the opening date", () => {
      const errors = sukanyaSaveCheck(rec({ account_name: "Kavi", purchase_date: "" }), dates, []).errors.join(" ");
      expect(errors).toMatch(/date of birth/);
      expect(errors).toMatch(/opened/);
    });
  });
});

describe("Fixed Income value of a Sukanya record", async () => {
  const { computeRecord } = await import("../calculations");
  it("counts deposits for 15 years only", async () => {
    const { vi } = await import("vitest");
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-10T12:00:00+05:30"));
    const c = computeRecord("fixedIncome", { category: "Sukanya Samriddhi", purchase_date: "2005-01-01", yearly_investment: 100000, interest_rate: 8.2 });
    vi.useRealTimers();
    expect(c.invested).toBe(1500000);
  });
});
