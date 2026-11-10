// Notified interest rates for government small-savings schemes and provident funds.
// Used to prefill new Fixed Income records and planned investments, and as the growth
// rate for a saved record that has no interest rate of its own.

export const FIXED_INCOME_RATE_SOURCE = {
  source: "Department of Economic Affairs, Small Savings Interest Rates",
  sourceUrl: "https://dea.gov.in/budget-division/475",
  circularUrl: "https://dea.gov.in/files/budget_division_documents/RoI_Q1_2627.pdf",
  period: "Q1 FY 2026-27",
};

export type FixedIncomeDefault = { rate: number | string; lockInYears: number | string; label: string; notes: string };

export const FIXED_INCOME_DEFAULTS: Record<string, FixedIncomeDefault> = {
  fd: { rate: 7.5, lockInYears: 5, label: "5 Year Time Deposit / FD", notes: "Government small-savings 5 year time deposit rate. Bank FDs vary by bank and tenure." },
  recurringdeposit: { rate: 6.7, lockInYears: 5, label: "5 Year Recurring Deposit", notes: "Post Office 5 year recurring deposit." },
  ppf: { rate: 7.1, lockInYears: 15, label: "Public Provident Fund", notes: "PPF account maturity is 15 years." },
  sukanyasamriddhi: { rate: 8.2, lockInYears: 21, label: "Sukanya Samriddhi Account", notes: "SSA maturity is 21 years from account opening, subject to scheme rules." },
  nsc: { rate: 7.7, lockInYears: 5, label: "National Savings Certificate", notes: "NSC VIII issue maturity is 5 years." },
  kvp: { rate: 7.5, lockInYears: 115 / 12, label: "Kisan Vikas Patra", notes: "KVP matures in 115 months at the current notified rate." },
  epf: { rate: 8.25, lockInYears: "", label: "Employees Provident Fund", notes: "EPF rate is annual and retirement/withdrawal rules depend on employment status." },
  companypf: { rate: 8.25, lockInYears: "", label: "Company PF", notes: "Using current EPF-style provident fund rate. Confirm the applicable employer scheme terms." },
  pf: { rate: 8.25, lockInYears: "", label: "Company PF", notes: "Legacy PF entry mapped to Company PF using the current EPF-style provident fund rate." },
  gratuity: { rate: "", lockInYears: 5, label: "Gratuity", notes: "Gratuity eligibility generally starts after 5 years of qualifying continuous service; value depends on salary and service." },
};

export const fixedIncomeKey = (value: string) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

/** The notified rate for a fixed income type ("Sukanya Samriddhi", "PPF", "RD"…), or null when there is none. */
export function notifiedRate(category: string): number | null {
  const k = fixedIncomeKey(category);
  const entry = FIXED_INCOME_DEFAULTS[k] || (k === "rd" ? FIXED_INCOME_DEFAULTS.recurringdeposit : k === "vpf" ? FIXED_INCOME_DEFAULTS.epf : undefined);
  return entry && typeof entry.rate === "number" ? entry.rate : null;
}
