// Dates for the plan engine (R1, R7). Engine functions take an `asOf` date; only callers at the edge
// (screens) read the clock, through indiaToday().

/** Today's date in India as YYYY-MM-DD. */
export function indiaToday(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (name: string) => parts.find((p) => p.type === name)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** R7: whole calendar months from `from` to `to` (both YYYY-MM-DD), never negative. The day of the month is ignored. */
export function monthsBetween(from: string, to: string) {
  const months = (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7));
  return Number.isFinite(months) ? Math.max(0, months) : 0;
}
