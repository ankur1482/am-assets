import { describe, expect, it } from "vitest";
import { cleanPicks, pickedIds, pickedTotal, plannerSources } from "./plannerSources";
import { planningSnapshot } from "./predictions";

const asOf = "2026-11-10";
const records = [
  { id: "sal", module_key: "fixedIncome", data: { category: "Salary", employee_contribution: 200000, account_name: "Asha" } },
  { id: "oldjob", module_key: "fixedIncome", data: { category: "Salary", employee_contribution: 90000, last_working_date: "2025-01-31" } },
  { id: "bank", module_key: "fixedIncome", data: { category: "Savings in Bank", current_value_today: 500000, broker: "HDFC Bank" } },
  { id: "home", module_key: "fixedIncome", data: { category: "Cash at Home", current_value_today: 20000 } },
  { id: "ppf", module_key: "fixedIncome", data: { category: "PPF", yearly_investment: 150000, current_value_today: 900000 } },
  { id: "mf", module_key: "mutualFunds", data: { security_name: "Index Fund", sip_amount: 10000 } },
  { id: "flat", module_key: "property", data: { occupancy: "Rented", monthly_rent: 40000, construction_status: "Ready" } },
  { id: "term", module_key: "insurance", data: { security_name: "Term", category: "Term Plan", status: "Active", premium_amount: 24000, premium_frequency: "Yearly", policy_start_date: "2020-01-15", policy_end_date: "2050-01-15" } },
  { id: "lic", module_key: "insurance", data: { security_name: "LIC", category: "Endowment / LIC", status: "Active", premium_amount: 5000, premium_frequency: "Quarterly", policy_start_date: "2020-01-15", policy_end_date: "2040-01-15" } },
  { id: "pay", module_key: "monthlyPayment", data: { period: "recurring", items: [
    { id: "m", label: "Maintenance", amount: 2500, due_day: null, via: "", kind: "regular" },
    { id: "c", label: "Mobile on card", amount: 2000, due_day: 4, via: "Card", kind: "on_card" },
  ] } },
];

describe("plannerSources", () => {
  const s = plannerSources(records, asOf), snap = planningSnapshot(records, asOf);

  it("adds up to the planner's prefilled amounts with the default ticks", () => {
    expect(pickedTotal(s.cash, undefined)).toBe(snap.savingsBalance + snap.cashAtHome);
    expect(pickedTotal(s.income, undefined)).toBe(snap.monthlyIncome);
    expect(pickedTotal(s.expenses, undefined)).toBe(snap.monthlyRegular);
    expect(pickedTotal(s.investment, undefined)).toBeCloseTo(snap.monthlyInvestment);
    expect(pickedTotal(s.insurance, undefined)).toBeCloseTo(snap.annualPremium);
  });

  it("offers other fixed income as cash, unticked, and an ended salary as zero", () => {
    expect(s.cash.find((i) => i.id === "ppf")).toMatchObject({ value: 900000, defaultOn: false });
    expect(s.income.find((i) => i.id === "oldjob")).toMatchObject({ value: 0, defaultOn: false });
    expect(s.expenses.map((i) => i.label)).toEqual(["Maintenance"]);
  });

  it("groups insurance into money-back and family protection", () => {
    expect(s.insurance.map((i) => [i.id, i.group])).toEqual([
      ["term", "Family protection (term, health)"],
      ["lic", "Pays money back (LIC, endowment, ULIP)"],
    ]);
  });

  it("uses a saved choice, ignoring ids that no longer exist", () => {
    expect(pickedIds(s.cash, ["bank", "ppf", "gone"])).toEqual(["bank", "ppf"]);
    expect(pickedTotal(s.cash, ["bank", "ppf"])).toBe(1_400_000);
    expect(pickedTotal(s.cash, [])).toBe(0);
  });

  it("cleans a saved choice", () => {
    expect(cleanPicks({ cash: ["a", "a", 3], nope: ["x"], income: "bad" })).toEqual({ cash: ["a"] });
    expect(cleanPicks(null)).toEqual({});
  });
});
