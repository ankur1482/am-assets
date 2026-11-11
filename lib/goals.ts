import { isRentedProperty } from "./calculations";
import { monthsBetween } from "./plan/dates";

// Goal funding: treat everything owned as if it were cash today, subtract
// everything owed, and measure what is left against the goal targets.
//
// A goal can name what pays for it ("funding sources"): a whole asset type
// ("type:stocks") or single holdings ("rec:<record id>"). Its current value is
// then the live value of those holdings. Goals without sources share whatever
// net worth is left after the named holdings are set aside.

export type ClassValue = { key: string; label: string; value: number };
export type Holding = { id: string; moduleKey: string; label: string; value: number };
export type GoalInput = {
  id: string;
  name: string;
  target: number;
  targetDate?: string;
  priority?: string;
  sources?: string[];
};
export type GoalFunding = GoalInput & {
  funding: "selected" | "shared";
  /** The holdings set aside for this goal (none when it shares net worth). */
  holdingIds: string[];
  /** The part of the target covered today (never more than the target). */
  allocated: number;
  /** Full value today of what pays for the goal, never capped (R10). A sharing goal's value is its share. */
  value: number;
  /** How much of `value` is above the target today. */
  surplusToday: number;
  gap: number;
  fundedPct: number;
  monthsLeft: number | null;
  monthlyRequired: number;
};

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/** The home you live in for good. Its value is never counted towards goals or retirement. */
/** A home you or your family live in, or will move into once built. One that is let out no longer counts. */
export const isPrimaryResidence = (data: Record<string, unknown> | null | undefined) =>
  !!data && /^(yes|true|1)$/i.test(String(data.primary_residence ?? "").trim()) && !isRentedProperty(data);

export const typeSource = (moduleKey: string) => `type:${moduleKey}`;
export const holdingSource = (recordId: string) => `rec:${recordId}`;

export function cleanSources(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((s): s is string => typeof s === "string" && /^(type|rec):.+/.test(s)))];
}

/** The holdings a goal's sources cover; a whole type covers every holding of that type. */
export function holdingsFor(sources: string[] | undefined, holdings: Holding[]): Holding[] {
  const list = cleanSources(sources);
  if (!list.length) return [];
  const types = new Set(list.filter((s) => s.startsWith("type:")).map((s) => s.slice(5)));
  const ids = new Set(list.filter((s) => s.startsWith("rec:")).map((s) => s.slice(4)));
  return holdings.filter((h) => types.has(h.moduleKey) || ids.has(h.id));
}

export function monthsUntil(targetDate: string | undefined, asOf: Date): number | null {
  if (!targetDate) return null;
  if (!/^\d{4}-\d{2}-\d{2}/.test(targetDate) || Number.isNaN(new Date(targetDate).getTime())) return null;
  // R7: the one month count, shared with the Planner.
  const from = `${asOf.getFullYear()}-${String(asOf.getMonth() + 1).padStart(2, "0")}-${String(asOf.getDate()).padStart(2, "0")}`;
  return monthsBetween(from, targetDate.slice(0, 10));
}

const byPriorityThenDate = (a: GoalInput, b: GoalInput) => {
  const pa = PRIORITY_RANK[String(a.priority || "").toLowerCase()] ?? 1;
  const pb = PRIORITY_RANK[String(b.priority || "").toLowerCase()] ?? 1;
  if (pa !== pb) return pa - pb;
  const time = (g: GoalInput) => {
    const t = g.targetDate ? new Date(g.targetDate).getTime() : Infinity;
    return Number.isNaN(t) ? Infinity : t;
  };
  return time(a) - time(b);
};

export function goalFunding(
  assets: ClassValue[],
  liabilities: ClassValue[],
  goals: GoalInput[],
  asOf: Date = new Date(),
  holdings: Holding[] = [],
) {
  const assetRows = assets.map((a) => ({ ...a, value: Math.max(0, n(a.value)) })).filter((a) => a.value > 0);
  const liabilityRows = liabilities.map((l) => ({ ...l, value: Math.max(0, n(l.value)) })).filter((l) => l.value > 0);
  const totalAssets = assetRows.reduce((s, a) => s + a.value, 0);
  const totalLiabilities = liabilityRows.reduce((s, l) => s + l.value, 0);
  const netAvailable = totalAssets - totalLiabilities;
  const target = goals.reduce((s, g) => s + Math.max(0, n(g.target)), 0);
  const gap = Math.max(0, target - netAvailable);
  const surplus = Math.max(0, netAvailable - target);
  const fundedPct = target > 0 ? Math.max(0, Math.min(100, (netAvailable / target) * 100)) : 0;

  // Holdings named by a goal are set aside for it. A holding named by two
  // goals goes to the higher-priority one, so nothing is counted twice.
  const ordered = [...goals].sort(byPriorityThenDate);
  const claimed = new Set<string>();
  const earmarked = new Map<string, number>(), ownIds = new Map<string, string[]>();
  for (const g of ordered) {
    const own = holdingsFor(g.sources, holdings).filter((h) => !claimed.has(h.id));
    if (!cleanSources(g.sources).length) continue;
    own.forEach((h) => claimed.add(h.id));
    ownIds.set(g.id, own.map((h) => h.id));
    earmarked.set(g.id, own.reduce((s, h) => s + Math.max(0, n(h.value)), 0));
  }
  const setAside = [...earmarked.values()].reduce((s, v) => s + v, 0);
  // What is left after the named holdings is shared by the other goals,
  // high priority first, then the earliest target date.
  let remaining = Math.max(0, netAvailable - setAside);

  const goalRows: GoalFunding[] = ordered.map((g) => {
    const goalTarget = Math.max(0, n(g.target));
    const own = earmarked.get(g.id);
    let allocated: number;
    if (own !== undefined) {
      allocated = Math.min(goalTarget, own);
    } else {
      allocated = Math.min(goalTarget, remaining);
      remaining -= allocated;
    }
    const goalGap = goalTarget - allocated;
    const monthsLeft = monthsUntil(g.targetDate, asOf);
    // R10: picked holdings count in full, so a surplus stays visible instead of disappearing at the target.
    const value = own !== undefined ? own : allocated;
    return {
      ...g,
      funding: own !== undefined ? "selected" : "shared",
      holdingIds: ownIds.get(g.id) || [],
      target: goalTarget,
      allocated,
      value,
      surplusToday: Math.max(0, value - goalTarget),
      gap: goalGap,
      fundedPct: goalTarget > 0 ? (allocated / goalTarget) * 100 : 0,
      monthsLeft,
      monthlyRequired: goalGap > 0 ? goalGap / Math.max(1, monthsLeft ?? 1) : 0,
    };
  });

  return {
    assets: assetRows.map((a) => ({ ...a, shareOfTarget: target > 0 ? (a.value / target) * 100 : 0 })),
    liabilities: liabilityRows,
    totalAssets,
    totalLiabilities,
    netAvailable,
    target,
    gap,
    surplus,
    fundedPct,
    setAside,
    /** Holdings not set aside for any goal, which the sharing goals draw on. */
    unclaimedIds: holdings.filter((h) => !claimed.has(h.id)).map((h) => h.id),
    goals: goalRows,
  };
}
