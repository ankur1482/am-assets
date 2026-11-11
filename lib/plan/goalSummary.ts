// R17: goals are never added into one percentage, because a surplus in one goal would hide a shortfall
// in another and amounts at different dates would be added together. The summary counts goals by
// status (On track at 100%+, Close at 80%+, else Needs work, as on the Goals page), names the weakest
// goal and totals the extra needed each month.

export type GoalLine = { name: string; target: number; projected: number | null; monthlyNeeded: number };

export function goalsSummary(goals: GoalLine[]) {
  const dated = goals.filter((g) => g.projected !== null && g.target > 0).map((g) => ({ ...g, share: (g.projected as number) / g.target }));
  const weakest = dated.length ? dated.reduce((a, b) => (b.share < a.share ? b : a)) : null;
  return {
    total: goals.length,
    onTrack: dated.filter((g) => g.share >= 1).length,
    close: dated.filter((g) => g.share >= 0.8 && g.share < 1).length,
    needsWork: dated.filter((g) => g.share < 0.8).length,
    undated: goals.length - dated.length,
    weakest: weakest ? { name: weakest.name, pct: Math.round(weakest.share * 100) } : null,
    extraMonthly: goals.reduce((s, g) => s + Math.max(0, g.monthlyNeeded || 0), 0),
  };
}
