// Where the holdings chosen for a goal are likely to be by its target date:
// each grows at a rate suited to its type (past 10-year trends for shares, gold
// and silver; an assumed rate for property; the saved interest rate for fixed
// income), and regular investments into it keep going until the target date.
import { isCashAtHome, isSavingsAccount, num } from "./calculations";

export type GrowthRates = { shares: number; gold: number; silver: number; property: number; fixedIncome: number; insurance: number; other: number };
export const DEFAULT_GROWTH: GrowthRates = { shares: 11, gold: 12, silver: 9, property: 4, fixedIncome: 7, insurance: 5, other: 0 };

export type Growth = { rate: number; basis: string };

/** Yearly growth rate for one holding, and where that rate comes from. */
export function holdingGrowth(moduleKey: string, data: Record<string, any>, rates: GrowthRates): Growth {
  const d = data || {};
  if (["stocks", "mutualFunds", "ulips", "nsel"].includes(moduleKey)) return { rate: rates.shares, basis: "Shares (NIFTY 50 trend)" };
  if (moduleKey === "bullion") {
    const silver = /silver/i.test(String(d.security_name || d.category || d.name || ""));
    return silver ? { rate: rates.silver, basis: "Silver (10-year trend)" } : { rate: rates.gold, basis: "Gold (10-year trend)" };
  }
  if (moduleKey === "property") return { rate: rates.property, basis: "Property appreciation" };
  if (moduleKey === "fixedIncome") {
    if (isCashAtHome(d)) return { rate: 0, basis: "Cash does not grow" };
    const saved = num(d.interest_rate);
    if (saved > 0) return { rate: saved, basis: "Its interest rate" };
    return isSavingsAccount(d) ? { rate: 3, basis: "Savings account interest" } : { rate: rates.fixedIncome, basis: "Typical fixed income rate" };
  }
  if (moduleKey === "insurance") return { rate: rates.insurance, basis: "Money-back policy growth" };
  return { rate: rates.other, basis: "Assumed" };
}

/** Regular amount still being put into a holding each month (SIP, PPF/Sukanya deposits, PF). */
export function holdingMonthly(moduleKey: string, data: Record<string, any>) {
  const d = data || {}, category = String(d.category || "").trim().toLowerCase();
  if (moduleKey === "fixedIncome" && (isSavingsAccount(d) || isCashAtHome(d) || /^(salary|rental\s*income|dividend\s*income)$/.test(category))) return 0;
  if (!["fixedIncome", "stocks", "mutualFunds", "ulips", "bullion", "otherAssets"].includes(moduleKey)) return 0;
  return Math.max(0, num(d.monthly_contribution) || num(d.sip_amount) || num(d.monthly_investment) ||
    (moduleKey === "fixedIncome" ? num(d.employee_contribution) + num(d.company_contribution) + num(d.yearly_investment) / 12 : num(d.monthly_premium)));
}

const monthlyRate = (yearlyPct: number) => Math.pow(1 + Math.max(-50, Math.min(40, yearlyPct)) / 100, 1 / 12) - 1;

/** Value after `months`: today's amount grows, and each month-end payment grows from when it is made. */
export function futureValue(today: number, monthly: number, yearlyPct: number, months: number) {
  const n = Math.max(0, Math.round(months)), i = monthlyRate(yearlyPct), growth = Math.pow(1 + i, n);
  return Math.max(0, today) * growth + Math.max(0, monthly) * (i ? (growth - 1) / i : n);
}

/** Extra monthly amount, growing at `yearlyPct`, that closes `gap` in `months`. */
export function monthlyToClose(gap: number, yearlyPct: number, months: number) {
  if (gap <= 0) return 0;
  const n = Math.max(1, Math.round(months)), i = monthlyRate(yearlyPct);
  return gap / (i ? (Math.pow(1 + i, n) - 1) / i : n);
}

export type ProjectionItem = { id: string; label: string; today: number; monthly: number; rate: number; basis: string; deduct?: number };
export type ProjectedItem = ProjectionItem & { atTarget: number };

/**
 * Projects a goal's holdings to its target date. `deduct` (a property's loan) is
 * taken off at the end as it stands today, which is cautious because loans shrink.
 */
export function projectGoal(input: { target: number; months: number | null; items: ProjectionItem[] }) {
  const months = Math.max(0, input.months ?? 0);
  const items: ProjectedItem[] = input.items.map((item) => ({
    ...item,
    atTarget: Math.max(0, futureValue(item.today, item.monthly, item.rate, months) - Math.max(0, item.deduct || 0)),
  }));
  const projected = items.reduce((s, i) => s + i.atTarget, 0);
  const weight = items.reduce((s, i) => s + Math.max(0, i.today - (i.deduct || 0)) + i.monthly, 0);
  const blendedRate = weight > 0 ? items.reduce((s, i) => s + i.rate * (Math.max(0, i.today - (i.deduct || 0)) + i.monthly), 0) / weight : 0;
  const gap = Math.max(0, input.target - projected);
  return {
    months,
    items,
    projected,
    blendedRate,
    gap,
    surplus: Math.max(0, projected - input.target),
    // Extra needed each month, invested at the goal's own blended rate.
    monthlyNeeded: monthlyToClose(gap, blendedRate, months),
    onTrack: projected >= input.target,
  };
}
