// Where the holdings chosen for a goal are likely to be by its target date:
// each grows at a rate suited to its type (past 10-year trends for shares, gold
// and silver; an assumed rate for property; the saved interest rate for fixed
// income), and regular investments into it keep going until the target date.
import { isCashAtHome, isSavingsAccount, num } from "./calculations";
import { notifiedRate } from "./fixedIncomeRates";

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
    if (isSavingsAccount(d)) return { rate: 3, basis: "Savings account interest" };
    // No rate saved: a Sukanya, PPF, NSC… record grows at the scheme's notified rate.
    const notified = notifiedRate(String(d.category || ""));
    return notified !== null ? { rate: notified, basis: "Notified scheme rate" } : { rate: rates.fixedIncome, basis: "Typical fixed income rate" };
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

export const GROWTH_LABELS: Record<keyof GrowthRates, string> = {
  shares: "Shares & funds",
  gold: "Gold",
  silver: "Silver",
  property: "Property",
  fixedIncome: "Fixed income (when no rate is saved)",
  insurance: "Money-back insurance",
  other: "Other assets",
};

/** Saved growth rates, keeping only known categories with sensible numbers. */
export function cleanGrowth(raw: unknown): Partial<GrowthRates> {
  if (!raw || typeof raw !== "object") return {};
  const out: Partial<GrowthRates> = {};
  for (const key of Object.keys(DEFAULT_GROWTH) as (keyof GrowthRates)[]) {
    const value = Number((raw as Record<string, unknown>)[key]);
    if ((raw as Record<string, unknown>)[key] !== "" && (raw as Record<string, unknown>)[key] !== null && Number.isFinite(value)) out[key] = Math.max(-20, Math.min(40, value));
  }
  return out;
}

export type PricePoint = { date: string; value: number };
/** % change for each calendar year, from the last price of one year to the last of the next. The latest year is year-to-date. */
export function yearlyReturns(points: PricePoint[] | undefined) {
  const lastByYear = new Map<number, number>();
  for (const p of [...(points || [])].filter((p) => p && Number.isFinite(p.value) && p.value > 0).sort((a, b) => a.date.localeCompare(b.date)))
    lastByYear.set(Number(p.date.slice(0, 4)), p.value);
  const years = [...lastByYear.keys()].sort((a, b) => a - b);
  return years.slice(1).map((year, i) => ({ year, pct: (lastByYear.get(year)! / lastByYear.get(years[i])! - 1) * 100 }));
}

/** An investment the user plans to make for a goal: every month from now, or once now. */
export type PlannedInvestment = { id: string; type: keyof GrowthRates; instrument?: string; rate?: number; mode: "monthly" | "once"; amount: number; note?: string };

/**
 * What can be planned for a goal. Government schemes carry their notified rate (see
 * fixedIncomeRates); market types use the saved growth rate for their category.
 */
export const PLANNED_INSTRUMENTS: { id: string; label: string; type: keyof GrowthRates; group: string; scheme?: string; match?: RegExp }[] = [
  { id: "sukanya", label: "Sukanya Samriddhi", type: "fixedIncome", group: "Government savings", scheme: "Sukanya Samriddhi", match: /sukanya|\bssy\b|\bssa\b/i },
  { id: "ppf", label: "PPF", type: "fixedIncome", group: "Government savings", scheme: "PPF", match: /\bppf\b|provident fund \(public\)/i },
  { id: "nsc", label: "NSC", type: "fixedIncome", group: "Government savings", scheme: "NSC", match: /\bnsc\b/i },
  { id: "kvp", label: "Kisan Vikas Patra", type: "fixedIncome", group: "Government savings", scheme: "KVP", match: /\bkvp\b|kisan/i },
  { id: "td", label: "Post Office time deposit (5 year)", type: "fixedIncome", group: "Government savings", scheme: "FD", match: /time deposit|post office/i },
  { id: "rd", label: "Recurring deposit (5 year)", type: "fixedIncome", group: "Government savings", scheme: "Recurring Deposit", match: /\brd\b|recurring/i },
  { id: "epf", label: "EPF / VPF", type: "fixedIncome", group: "Government savings", scheme: "EPF", match: /\bepf\b|\bvpf\b/i },
  { id: "bankfd", label: "Bank FD", type: "fixedIncome", group: "Bank deposits", match: /\bfd\b|fixed deposit/i },
  { id: "sip", label: "Mutual fund SIP or shares", type: "shares", group: "Market", match: /\bsip\b|mutual|shares?|equity|index/i },
  { id: "gold", label: "Gold", type: "gold", group: "Market", match: /gold/i },
  { id: "silver", label: "Silver", type: "silver", group: "Market", match: /silver/i },
  { id: "property", label: "Property (being built or planned)", type: "property", group: "Other", match: /property|flat|plot|house|home/i },
  { id: "insurance", label: "Money-back insurance", type: "insurance", group: "Other", match: /\blic\b|endowment|money ?back|ulip/i },
  { id: "other", label: "Something else", type: "other", group: "Other" },
];

/** Default yearly rate for a planned instrument: the scheme's notified rate, else its category's growth rate. */
export function plannedDefaultRate(instrumentId: string, rates: GrowthRates) {
  const inst = PLANNED_INSTRUMENTS.find((i) => i.id === instrumentId);
  if (!inst) return rates.other;
  const notified = inst.scheme ? notifiedRate(inst.scheme) : null;
  return notified ?? rates[inst.type];
}

export function cleanPlanned(raw: unknown): PlannedInvestment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && typeof p === "object")
    .map((p: any) => {
      const note = p.note ? String(p.note).slice(0, 80) : undefined;
      // Plans saved before instruments existed are recognised from their name (e.g. "sukanya", "ppf").
      const instrument = PLANNED_INSTRUMENTS.some((i) => i.id === p.instrument)
        ? String(p.instrument)
        : note ? PLANNED_INSTRUMENTS.find((i) => i.match?.test(note))?.id : undefined;
      const type = instrument
        ? PLANNED_INSTRUMENTS.find((i) => i.id === instrument)!.type
        : ((Object.keys(DEFAULT_GROWTH).includes(p.type) ? p.type : "other") as keyof GrowthRates);
      return {
        id: String(p.id || ""),
        type,
        instrument,
        rate: p.rate !== undefined && p.rate !== null && p.rate !== "" && Number.isFinite(Number(p.rate)) ? Math.max(-20, Math.min(40, Number(p.rate))) : undefined,
        mode: p.mode === "once" ? ("once" as const) : ("monthly" as const),
        amount: Math.max(0, num(p.amount)),
        note,
      };
    })
    .filter((p) => p.id && p.amount > 0);
}

export const plannedName = (p: PlannedInvestment) =>
  p.note || PLANNED_INSTRUMENTS.find((i) => i.id === p.instrument)?.label || GROWTH_LABELS[p.type];

/** Yearly rate used for a planned investment, and where it comes from. */
export function plannedRate(p: PlannedInvestment, rates: GrowthRates): Growth {
  if (p.rate !== undefined) return { rate: p.rate, basis: "Rate you set" };
  const inst = PLANNED_INSTRUMENTS.find((i) => i.id === p.instrument);
  if (inst?.scheme && notifiedRate(inst.scheme) !== null) return { rate: notifiedRate(inst.scheme)!, basis: "Notified scheme rate" };
  return { rate: rates[p.type], basis: `${GROWTH_LABELS[p.type]} rate` };
}

/** Planned investments as projection lines, at the rate set for them, else the instrument's or category's default. */
export function plannedItems(planned: PlannedInvestment[], rates: GrowthRates): ProjectionItem[] {
  return planned.map((p) => {
    const growth = plannedRate(p, rates);
    return {
      id: `planned:${p.id}`,
      label: `Planned: ${plannedName(p)}${p.mode === "once" ? " (one-off)" : ""}`,
      today: p.mode === "once" ? p.amount : 0,
      monthly: p.mode === "monthly" ? p.amount : 0,
      rate: growth.rate,
      basis: growth.basis,
    };
  });
}
