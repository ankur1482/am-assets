// Goal funding: treat everything owned as if it were cash today, subtract
// everything owed, and measure what is left against the goal targets.

export type ClassValue = { key: string; label: string; value: number };
export type GoalInput = {
  id: string;
  name: string;
  target: number;
  targetDate?: string;
  priority?: string;
};
export type GoalFunding = GoalInput & {
  allocated: number;
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

export function monthsUntil(targetDate: string | undefined, asOf: Date): number | null {
  if (!targetDate) return null;
  const t = new Date(targetDate);
  if (Number.isNaN(t.getTime())) return null;
  const months = (t.getFullYear() - asOf.getFullYear()) * 12 + (t.getMonth() - asOf.getMonth());
  return Math.max(0, months);
}

export function goalFunding(
  assets: ClassValue[],
  liabilities: ClassValue[],
  goals: GoalInput[],
  asOf: Date = new Date(),
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

  // Hand the net amount to goals in order: High priority first, then the
  // earliest target date, so the most urgent goals are funded first.
  const ordered = [...goals].sort((a, b) => {
    const pa = PRIORITY_RANK[String(a.priority || "").toLowerCase()] ?? 1;
    const pb = PRIORITY_RANK[String(b.priority || "").toLowerCase()] ?? 1;
    if (pa !== pb) return pa - pb;
    const da = a.targetDate ? new Date(a.targetDate).getTime() : Infinity;
    const db = b.targetDate ? new Date(b.targetDate).getTime() : Infinity;
    return (Number.isNaN(da) ? Infinity : da) - (Number.isNaN(db) ? Infinity : db);
  });
  let remaining = Math.max(0, netAvailable);
  const goalRows: GoalFunding[] = ordered.map((g) => {
    const goalTarget = Math.max(0, n(g.target));
    const allocated = Math.min(goalTarget, remaining);
    remaining -= allocated;
    const goalGap = goalTarget - allocated;
    const monthsLeft = monthsUntil(g.targetDate, asOf);
    return {
      ...g,
      target: goalTarget,
      allocated,
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
    goals: goalRows,
  };
}
