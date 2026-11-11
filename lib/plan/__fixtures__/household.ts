// A fictional household for the plan-engine tests. Every name and amount is invented.
// It is built to contain each situation the plan rules (PLAN_ENGINE_BRIEF section 3) must handle:
// payroll PF, balance-only PPF and Sukanya, two kinds of OD loan, a home being built with a
// future-dated payment, a lived-in home with its own loan, card rows among regular payments,
// and four goals (over-funded, under-funded, deposits past the salary end, no sources).
import type { PlanningRecord } from "../../predictions";

/** The day every plan test runs as (India time). */
export const AS_OF = "2026-11-10";
export const AS_OF_INSTANT = new Date("2026-11-10T12:00:00+05:30");

const row = (id: string, module_key: string, data: Record<string, any>): PlanningRecord => ({ id, module_key, data });

export const ID = {
  salary: "fx-salary",
  pf: "fx-company-pf",
  ppf: "fx-ppf",
  sukanya: "fx-sukanya",
  savingsHdfc: "fx-savings-hdfc",
  savingsIcici: "fx-savings-icici",
  cash: "fx-cash-home",
  odAbove: "fx-od-towers", // OD with more parked than the balance
  odZero: "fx-od-gardens", // OD with balance entered as 0 and money parked
  emiFlat: "fx-emi-residency", // standard EMI loan, rented flat
  building: "fx-building", // home being built
  home: "fx-home", // lived-in home with its own loan
  stockBig: "fx-stock-big",
  stockMid: "fx-stock-mid",
  stockSmall: "fx-stock-small",
  gold: "fx-gold",
  term: "fx-term",
  endowment: "fx-endowment",
  payments: "fx-payments",
  dividend: "fx-dividend-aug",
  goalOver: "fx-goal-retirement",
  goalUnder: "fx-goal-education",
  goalPastSalary: "fx-goal-wedding",
  goalNoSources: "fx-goal-reserve",
} as const;

export function household(): PlanningRecord[] {
  return [
    // Income and payroll
    row(ID.salary, "fixedIncome", { account_name: "Asha", category: "Salary", broker: "Example Bank", employee_contribution: 300000, purchase_date: "2012-04-01", currently_employed: "Yes", planned_employment_end: "2031-03-31" }),
    row(ID.pf, "fixedIncome", { account_name: "Asha", category: "Company PF", employee_contribution: 15000, company_contribution: 15000, interest_rate: 8.25, current_value_today: 2500000, purchase_date: "2012-04-01" }),

    // Balance-only savings schemes (no cost recorded)
    row(ID.ppf, "fixedIncome", { account_name: "Ravi", category: "PPF", broker: "Govt", current_value_today: 1200000, purchase_date: "2016-04-10", lock_in_years: 15 }),
    row(ID.sukanya, "fixedIncome", { account_name: "Mira", category: "Sukanya Samriddhi", broker: "Govt", current_value_today: 800000, purchase_date: "2018-06-01", lock_in_years: 21 }),

    // Cash
    row(ID.savingsHdfc, "fixedIncome", { account_name: "Asha", category: "Savings in Bank", broker: "HDFC Bank", current_value_today: 300000 }),
    row(ID.savingsIcici, "fixedIncome", { account_name: "Ravi", category: "Savings in Bank", broker: "ICICI Bank", current_value_today: 150000 }),
    row(ID.cash, "fixedIncome", { account_name: "Asha", category: "Cash at Home", current_value_today: 50000 }),

    // Property
    // OD: balance 40,00,000 with 42,00,000 parked → offset 40,00,000, spare 2,00,000 (R3).
    row(ID.odAbove, "property", { account_name: "Asha", security_name: "Residential", location: "Testville", broker: "Example Towers", purchase_price: 8000000, latest_value: 12000000, purchase_date: "2019-05-01", loan_structure: "Overdraft (OD)", loan_institution: "Example OD Bank", loan_amount: 5000000, loan_balance: 4000000, od_parked_balance: 4200000, loan_interest_rate: 8.5, loan_tenure_months: 240, loan_start_date: "2019-06-05", construction_status: "Ready", occupancy: "Rented", monthly_rent: 45000, rentee_name: "Test Tenant A" }),
    // OD: balance entered as 0 with 30,00,000 parked: ambiguous until the owner answers (R2, R3).
    row(ID.odZero, "property", { account_name: "Ravi", security_name: "Residential", location: "Hillside", broker: "Example Gardens", purchase_price: 6000000, latest_value: 9000000, purchase_date: "2021-11-01", loan_structure: "Overdraft (OD)", loan_institution: "Example OD Bank", loan_amount: 3000000, loan_balance: 0, od_parked_balance: 3000000, loan_interest_rate: 8.4, loan_tenure_months: 180, loan_start_date: "2022-01-05", construction_status: "Ready", occupancy: "Residing" }),
    // Standard EMI loan, balance left blank to be worked out; let out.
    row(ID.emiFlat, "property", { account_name: "Asha", security_name: "Residential", location: "Riverside", broker: "Example Residency", purchase_price: 5000000, latest_value: 7000000, purchase_date: "2021-01-15", loan_structure: "Standard EMI", loan_institution: "Example Home Finance", loan_amount: 4000000, loan_interest_rate: 8, loan_tenure_months: 240, loan_start_date: "2021-02-10", construction_status: "Ready", occupancy: "Rented", monthly_rent: 25000, rentee_name: "Test Tenant B" }),
    // Home being built: one past own-money payment, one past loan payment, one loan payment dated after AS_OF (R1).
    // No sanctioned loan amount is entered, so its loan exists only through the payments made "from the loan" (D10).
    row(ID.building, "property", { account_name: "Asha", security_name: "Residential", location: "New Town", broker: "Example Skyline", purchase_price: 10000000, latest_value: 4000000, purchase_date: "2025-02-01", construction_status: "Under Construction", possession_date: "2028-06-30", loan_structure: "Standard EMI", loan_institution: "Example Home Finance", loan_interest_rate: 8, loan_tenure_months: 240, loan_start_date: "2026-03-05", occupancy: "Residing",
      construction_payments: [
        { id: "cp1", date: "2025-03-01", amount: 2500000, from: "own" },
        { id: "cp2", date: "2026-02-01", amount: 1500000, from: "loan" },
        { id: "cp3", date: "2026-12-15", amount: 1000000, from: "loan" },
      ] }),
    // The home the family lives in, with its own loan (R4).
    row(ID.home, "property", { account_name: "Asha", security_name: "Residential", location: "Testville", broker: "Example Nest", purchase_price: 9000000, latest_value: 15000000, purchase_date: "2017-08-01", loan_structure: "Standard EMI", loan_institution: "Example Home Finance", loan_amount: 5000000, loan_balance: 3000000, emi_amount: 50000, loan_interest_rate: 8, loan_tenure_months: 240, loan_start_date: "2017-09-05", construction_status: "Ready", occupancy: "Residing", primary_residence: "Yes" }),

    // Shares: the first is about 69% of all shares held.
    row(ID.stockBig, "stocks", { account_name: "Asha", security_name: "Example Industries", ticker_symbol: "EXIND", exchange: "NSE", asset_type: "Stock", quantity: 1000, inv_price: 1000, live_price: 2000, purchase_date: "2018-01-15" }),
    row(ID.stockMid, "stocks", { account_name: "Ravi", security_name: "Example Bank Ltd", ticker_symbol: "EXBANK", exchange: "NSE", asset_type: "Stock", quantity: 500, inv_price: 800, live_price: 1000, purchase_date: "2020-06-10" }),
    row(ID.stockSmall, "stocks", { account_name: "Asha", security_name: "Example Power", ticker_symbol: "EXPWR", exchange: "NSE", asset_type: "Stock", quantity: 200, inv_price: 1500, live_price: 2000, purchase_date: "2022-09-01" }),

    // Gold
    row(ID.gold, "bullion", { account_name: "Asha", security_name: "Gold", quantity: 100, unit: "gms", purchase_price: 500000, latest_value: 750000, purchase_date: "2020-01-10" }),

    // Insurance: a term plan and an endowment with no surrender value entered.
    row(ID.term, "insurance", { account_name: "Asha", security_name: "Example Term", category: "Term Plan", broker: "Example Insurer", status: "Active", premium_amount: 24000, premium_frequency: "Yearly", sum_assured: 10000000, policy_start_date: "2020-01-01", policy_end_date: "2050-01-01", premium_due_date: "2027-01-15" }),
    row(ID.endowment, "insurance", { account_name: "Ravi", security_name: "Example Endowment", category: "Endowment / LIC", broker: "Example Life", status: "Active", premium_amount: 60000, premium_frequency: "Yearly", sum_assured: 1000000, bonus_rate: 4.5, policy_start_date: "2015-03-01", policy_end_date: "2035-03-01", premium_due_date: "2027-03-01" }),

    // Recurring payments: two fixed costs, a card bill saved as a regular payment, a card row,
    // a payment already on a card, and a background transfer.
    row(ID.payments, "monthlyPayment", { period: "recurring", items: [
      { id: "m1", label: "Society maintenance", amount: 8000, due_day: 5, via: "HDFC Bank", kind: "regular" },
      { id: "m2", label: "School fees", amount: 20000, due_day: 10, via: "HDFC Bank", kind: "regular" },
      { id: "m3", label: "Example credit card", amount: 90000, due_day: 18, via: "HDFC Bank", kind: "regular" },
      { id: "m4", label: "Other card", amount: 15000, due_day: 22, via: "ICICI Bank", kind: "card" },
      { id: "m5", label: "Mobile", amount: 1500, due_day: 4, via: "Card", kind: "on_card" },
      { id: "m6", label: "Move to OD", amount: 200000, due_day: 2, via: "HDFC Bank", to: "Example OD Bank", kind: "transfer" },
    ] }),

    // A dividend received earlier in the year, none this month (R5 trailing 12 months).
    row(ID.dividend, "dividendReceipt", { key: `asha|EXIND|2026-08-01`, status: "received", account_name: "Asha", security_name: "Example Industries", ticker_symbol: "EXIND", ex_date: "2026-08-01", payout_date: "2026-08-14", received_on: "2026-08-15", per_share: 12, quantity: 1000, amount: 12000, currency: "INR", credit_name: "" }),

    // Goals
    // Over-funded by picked holdings: today's holdings exceed the target.
    row(ID.goalOver, "goals", { account_name: "Asha", security_name: "Retirement", category: "Retirement", target_amount: 15000000, target_date: "2031-03-31", priority: "High", funding_sources: [`rec:${ID.odAbove}`, "type:stocks", `rec:${ID.pf}`] }),
    // Under-funded.
    row(ID.goalUnder, "goals", { account_name: "Asha", security_name: "Mira Education", category: "Education", target_amount: 5000000, target_date: "2033-06-30", priority: "High", funding_sources: [`rec:${ID.ppf}`] }),
    // Planned monthly deposits that run past the salary end date (2031-03-31).
    row(ID.goalPastSalary, "goals", { account_name: "Asha", security_name: "Kavi Wedding", category: "Other", target_amount: 4000000, target_date: "2038-12-01", priority: "Medium", funding_sources: [`rec:${ID.sukanya}`], planned_investments: [{ id: "pl1", instrument: "ppf", mode: "monthly", amount: 12500 }] }),
    // No sources: shares whatever net worth is left.
    row(ID.goalNoSources, "goals", { account_name: "Ravi", security_name: "Family Reserve", category: "Emergency Fund", target_amount: 1000000, target_date: "2028-12-31", priority: "Low" }),
  ];
}
