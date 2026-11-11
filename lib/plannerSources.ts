// The records behind each Cash flow & loans box in the Predictive Planner, so
// the user can tick exactly which ones each box adds up. With the default ticks
// every box matches planningSnapshot's prefilled amount.
import { isCashAtHome, isDividendIncome, isEarningRent, isRentedProperty, isSavingsAccount, num } from "./calculations";
import { dividendsMonthlyAverage } from "./dividends";
import { calculateInsurance, insuranceKind } from "./insurance";
import { isCardRow, recurringPayments } from "./monthlyPayments";
import { cardEstimate } from "./plan/cards";
import { employmentOf } from "./employment";
import { isPaidFromPayroll } from "./plan/contributions";
import type { PlanningRecord } from "./predictions";

export type CashField = "cash" | "income" | "expenses" | "investment" | "insurance";
export const CASH_FIELDS: CashField[] = ["cash", "income", "expenses", "investment", "insurance"];
/** One record a box can add up. `value` is monthly, except cash (a balance) and insurance (per year). */
export type SourceItem = { id: string; label: string; group: string; value: number; defaultOn: boolean };
export type SourcePicks = Partial<Record<CashField, string[]>>;

const who = (d: Record<string, any>) => (d.account_name ? ` — ${d.account_name}` : "");
const join = (...parts: unknown[]) => parts.map((p) => String(p ?? "").trim()).filter(Boolean).join(" · ");

export function plannerSources(records: PlanningRecord[], asOf: string): Record<CashField, SourceItem[]> {
  const out: Record<CashField, SourceItem[]> = { cash: [], income: [], expenses: [], investment: [], insurance: [] };
  const propertyIds = new Set(records.filter((r) => r.module_key === "property").map((r) => r.id));
  for (const r of records) {
    const d = r.data || {}, category = String(d.category || "").trim(), lower = category.toLowerCase();
    if (r.module_key === "fixedIncome") {
      if (isSavingsAccount(d)) {
        out.cash.push({ id: r.id, label: join("Savings account", d.broker) + who(d), group: "Savings and cash", value: Math.max(0, num(d.current_value_today)), defaultOn: true });
      } else if (isCashAtHome(d)) {
        out.cash.push({ id: r.id, label: "Cash at home" + who(d), group: "Savings and cash", value: Math.max(0, num(d.current_value_today)), defaultOn: true });
      } else if (isDividendIncome(d)) {
        out.income.push({ id: r.id, label: "Dividend income" + who(d), group: "Dividends", value: Math.max(0, num(d.employee_contribution)), defaultOn: true });
      } else if (lower === "salary") {
        const ended = !employmentOf(r, asOf).employed;
        out.income.push({ id: r.id, label: join("Salary", d.broker) + who(d) + (ended ? " (ended)" : ""), group: "Salary", value: ended ? 0 : Math.max(0, num(d.employee_contribution)), defaultOn: !ended });
      } else if (lower === "rental income") {
        // Rent on a saved property is counted from the property itself, so its linked income row stays unticked.
        const linked = propertyIds.has(d.linked_property_id);
        out.income.push({ id: r.id, label: join("Rental income", d.broker) + who(d) + (linked ? " (also on the property)" : ""), group: "Rent", value: Math.max(0, num(d.employee_contribution)), defaultOn: !linked });
      } else {
        // Other fixed income can be drawn on as cash if the user chooses (not ticked by default).
        const value = Math.max(0, num(d.current_value_today) || num(d.latest_value));
        if (value) out.cash.push({ id: r.id, label: join(category || "Fixed income", d.broker) + who(d), group: "Other fixed income (if you would use it)", value, defaultOn: false });
      }
    }
    if (["fixedIncome", "stocks", "mutualFunds", "ulips", "bullion", "otherAssets"].includes(r.module_key) && !(r.module_key === "fixedIncome" && (isSavingsAccount(d) || isCashAtHome(d) || isDividendIncome(d) || /^(salary|rental\s*income)$/.test(lower)))) {
      const monthly = Math.max(0, num(d.monthly_contribution) || num(d.sip_amount) || num(d.monthly_investment) || (r.module_key === "fixedIncome" ? num(d.employee_contribution) + num(d.company_contribution) + num(d.yearly_investment) / 12 : num(d.monthly_premium)));
      // Payroll contributions come out before take-home pay, so they start unticked (R5).
      const payroll = r.module_key === "fixedIncome" && isPaidFromPayroll(d);
      if (monthly) out.investment.push({ id: r.id, label: join(d.security_name || category || r.module_key, d.broker) + who(d) + (payroll ? " (from payroll, already out of take-home pay)" : ""), group: { fixedIncome: "Fixed income", stocks: "Stocks", mutualFunds: "Mutual funds (SIP)", ulips: "ULIPs", bullion: "Gold & silver", otherAssets: "Other" }[r.module_key] || "Other", value: monthly, defaultOn: !payroll });
    }
    if (r.module_key === "property" && isRentedProperty(d)) {
      const earning = isEarningRent(d, asOf);
      out.income.push({ id: r.id, label: join("Rent", d.security_name, d.location || d.broker) + (earning ? "" : " (vacant)"), group: "Rent", value: earning ? Math.max(0, num(d.monthly_rent)) : 0, defaultOn: earning });
    }
    if (r.module_key === "insurance") {
      const policy = calculateInsurance(d, new Date(`${asOf}T12:00:00`));
      if (policy.premiumStatus === "PAYING" && !/^(closed|lapsed|paid-up|matured)$/i.test(String(d.status || "")) && policy.annualPremium > 0) {
        const kind = insuranceKind(d);
        out.insurance.push({ id: r.id, label: join(d.security_name || d.policy_name || policy.policyTypeLabel, policy.policyTypeLabel) + who(d), group: kind === "returns" ? "Pays money back (LIC, endowment, ULIP)" : "Family protection (term, health)", value: policy.annualPremium, defaultOn: true });
      }
    }
  }
  // A monthly average of the last 12 months (R5). The id is kept from when this was "this month only", so saved ticks still apply.
  const dividends = dividendsMonthlyAverage(records, asOf);
  if (dividends) out.income.push({ id: "dividends-this-month", label: "Dividends received in the last 12 months, monthly average", group: "Dividends", value: dividends, defaultOn: true });
  for (const item of recurringPayments(records)) {
    // Card spends and transfers are already inside another payment, so they never add to expenses.
    // A card bill is a way of paying, not a cost: card spending is estimated from past bills below (R6).
    if (item.kind === "on_card" || item.kind === "transfer" || isCardRow(item)) continue;
    out.expenses.push({ id: `payment:${item.id}`, label: item.label || "Payment", group: "Regular payments", value: Math.max(0, num(item.amount)), defaultOn: true });
  }
  const card = cardEstimate(records, asOf);
  if (card.months) out.expenses.push({ id: "card-estimate", label: `Card spending, average of the last ${card.months} month${card.months === 1 ? "" : "s"}${card.rough ? " (rough)" : ""}`, group: "Card spending", value: card.monthly, defaultOn: true });
  return out;
}

/** Ticked ids for a box: the saved choice, or the default ticks when nothing has been chosen. */
export function pickedIds(items: SourceItem[], saved: string[] | undefined) {
  return saved ? items.filter((i) => saved.includes(i.id)).map((i) => i.id) : items.filter((i) => i.defaultOn).map((i) => i.id);
}

export function pickedTotal(items: SourceItem[], saved: string[] | undefined) {
  const ids = new Set(pickedIds(items, saved));
  return items.filter((i) => ids.has(i.id)).reduce((s, i) => s + i.value, 0);
}

export function cleanPicks(raw: unknown): SourcePicks {
  if (!raw || typeof raw !== "object") return {};
  const out: SourcePicks = {};
  for (const field of CASH_FIELDS) {
    const list = (raw as Record<string, unknown>)[field];
    if (Array.isArray(list)) out[field] = [...new Set(list.filter((x): x is string => typeof x === "string"))];
  }
  return out;
}
