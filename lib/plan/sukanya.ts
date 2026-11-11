// Sukanya Samriddhi Account rules, from the Sukanya Samriddhi Account Scheme, 2019 (Ministry of Finance
// notification of 12 Dec 2019, which replaced the 2016 rules). Paragraph numbers refer to that scheme.
//   3(1)  opened for a girl who is under 10 on the opening date; one account per girl (3(2)), two girls per family (3(4))
//   4(1)  at least ₹250 a financial year; 4(2) at most ₹1,50,000 a financial year
//   4(3)  deposits only until 15 years from opening
//   5     interest at the notified rate (8.2% since Jan 2024, unchanged for Oct–Dec 2026), credited yearly
//   8     from 18 (or passing class 10, if earlier) up to 50% of the balance at the end of the previous
//         financial year may be withdrawn for her education (once a year, at most five years)
//   9(1)  matures 21 years after opening; 9(2) may be closed early for her marriage if she is 18 or over
// The plan uses these to stop deposits after 15 years and to count, for each goal, only the share that
// can actually be taken out by the goal's date.
import { num } from "../calculations";
import { monthsBetween } from "./dates";
import { futureValue, type PlannedInvestment, type ProjectionItem } from "../goalProjection";

export const SUKANYA = { depositYears: 15, maturityYears: 21, maxPerYear: 150000, minPerYear: 250, openBeforeAge: 10, withdrawFromAge: 18, educationShare: 0.5 } as const;

export const isSukanya = (d: Record<string, any> | null | undefined) => /sukanya|^\s*ss[ay]\s*$/i.test(String(d?.category || ""));

const validDate = (s: unknown): s is string => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
/** The same day `years` later (29 Feb becomes 28 Feb in a non-leap year). */
export function addYears(date: string, years: number) {
  const y = Number(date.slice(0, 4)) + years, m = date.slice(5, 7), d = Number(date.slice(8, 10));
  const last = new Date(Date.UTC(y, Number(m), 0)).getUTCDate();
  return `${y}-${m}-${String(Math.min(d, last)).padStart(2, "0")}`;
}
/** Whole years from a date of birth to a day (both YYYY-MM-DD). */
export const ageOn = (dob: string, on: string) => Number(on.slice(0, 4)) - Number(dob.slice(0, 4)) - (on.slice(5) < dob.slice(5) ? 1 : 0);

export type GoalPurpose = "education" | "marriage" | "other";
/** What a goal is for, from its type and name: education, her marriage, or anything else. */
export function goalPurpose(goal: { category?: unknown; name?: unknown }): GoalPurpose {
  const text = `${goal.category || ""} ${goal.name || ""}`;
  if (/marri|wedding|shaadi/i.test(text)) return "marriage";
  if (/educat|college|universit|school|study|higher/i.test(text)) return "education";
  return "other";
}

export type SukanyaTerms = {
  opened: string | null;
  depositsUntil: string | null;
  maturity: string | null;
  /** Her 18th birthday, from when education withdrawals and marriage closure are allowed. */
  turns18: string | null;
  /** The names a date of birth was looked for under. */
  lookedUp?: string[];
  warnings: string[];
};

/** The dates that govern one Sukanya account, from its opening date and the girl's date of birth. */
export function sukanyaTerms(data: Record<string, any>, birthDate: string | null | undefined, opened?: string | null, lookedUp?: string[]): SukanyaTerms {
  const d = data || {}, open = opened ?? sukanyaOpened(d);
  const dob = validDate(birthDate) ? birthDate : null, girl = String(d.account_name || "the girl");
  const warnings: string[] = [];
  if (!open) warnings.push(`Sukanya for ${girl}: enter the date the account was opened, so its 15 years of deposits and 21-year maturity can be worked out.`);
  if (!dob) {
    const tried = lookedUp?.length ? ` No date of birth was found for ${lookedUp.map((n) => `"${n}"`).join(" or ")}.` : "";
    warnings.push(`Sukanya for ${girl}: add her date of birth to her account (Settings → Accounts), so the plan knows when the money can be taken out (half for her education from 18, all for her marriage at 18 or over, otherwise at 21 years from opening).${tried} The Sukanya record's Account should be the daughter herself.`);
  }
  if (open && dob && ageOn(dob, open) >= SUKANYA.openBeforeAge) warnings.push(`Sukanya for ${girl}: she was ${ageOn(dob, open)} when it was opened, but the scheme only allows opening before she turns 10. Check the dates.`);
  if (num(d.yearly_investment) > SUKANYA.maxPerYear) warnings.push(`Sukanya for ${girl}: ₹${num(d.yearly_investment).toLocaleString("en-IN")} a year is above the ₹1,50,000 yearly limit.`);
  return {
    opened: open,
    depositsUntil: open ? addYears(open, SUKANYA.depositYears) : null,
    maturity: open ? addYears(open, SUKANYA.maturityYears) : null,
    turns18: dob ? addYears(dob, SUKANYA.withdrawFromAge) : null,
    lookedUp: lookedUp || [],
    warnings,
  };
}

/** The account's opening date: the account creation date, else its start date. */
export const sukanyaOpened = (d: Record<string, any>) => [d?.account_creation_date, d?.purchase_date].find(validDate) ?? null;

const norm = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();
/** A date of birth by account name, ignoring capitals and extra spaces. */
export function birthDateOf(birthDates: Record<string, string>, name: string) {
  const want = norm(name);
  return want ? Object.entries(birthDates).find(([n]) => norm(n) === want)?.[1] ?? null : null;
}
/** Account names (with a date of birth) that appear as words in a goal's name, such as "Riya" in "Riya Higher Education". */
export function namesInGoal(goalName: unknown, birthDates: Record<string, string>) {
  const text = ` ${norm(String(goalName || "")).replace(/[^a-z0-9 ]/g, " ")} `;
  return Object.keys(birthDates).filter((n) => norm(n) && text.includes(` ${norm(n).replace(/[^a-z0-9 ]/g, " ")} `));
}
/**
 * The girl a Sukanya account belongs to: the first candidate whose date of birth fits the scheme (under 10
 * when it was opened, so a parent named on the record is passed over). Returns every name looked up.
 */
export function sukanyaGirl(candidates: string[], birthDates: Record<string, string>, opened: string | null) {
  const names = [...new Set(candidates.map((c) => String(c || "").trim()).filter(Boolean))];
  for (const name of names) {
    const dob = birthDateOf(birthDates, name);
    if (dob && (!opened || ageOn(dob, opened) < SUKANYA.openBeforeAge)) return { name, birthDate: dob, lookedUp: names };
  }
  // Nobody fits: use the first with a date of birth, so the "opened after she turned 10" check can say so.
  const any = names.find((n) => birthDateOf(birthDates, n));
  return { name: any || names[0] || "", birthDate: any ? birthDateOf(birthDates, any) : null, lookedUp: names };
}

/**
 * The share of a Sukanya account a goal can count by its date, and why.
 * At or after maturity: all of it. Before that, for her marriage at 18 or over: all of it (early closure).
 * For her education from 18: half (the most a partial withdrawal allows). Otherwise: none yet.
 */
export function sukanyaShareFor(terms: SukanyaTerms, goalDate: string, purpose: GoalPurpose): { share: number; reason: string } {
  if (terms.maturity && goalDate >= terms.maturity) return { share: 1, reason: `matures ${terms.maturity}` };
  if (terms.turns18 && goalDate >= terms.turns18) {
    if (purpose === "marriage") return { share: 1, reason: "can be closed for her marriage once she is 18" };
    if (purpose === "education") return { share: SUKANYA.educationShare, reason: "up to half can be withdrawn for her education from 18" };
  }
  if (!terms.maturity) return { share: 1, reason: "opening date not entered, so availability is not checked" };
  if (!terms.turns18 && purpose !== "other") {
    const who = terms.lookedUp?.length ? ` (looked for ${terms.lookedUp.map((n) => `"${n}"`).join(", ")})` : "";
    return { share: 1, reason: `no date of birth found for her${who}, so availability is not checked` };
  }
  return { share: 0, reason: purpose === "other" ? `not available before it matures (${terms.maturity})` : `not available before she turns 18 (${terms.turns18})` };
}

/** Months of deposits still to come before the 15-year deposit period ends. */
export function sukanyaDepositMonths(terms: SukanyaTerms, asOf: string) {
  if (!terms.depositsUntil) return null;

  return monthsBetween(asOf, terms.depositsUntil);
}

/**
 * Applies the scheme to one line of a goal's projection: deposits stop after 15 years, and only the share
 * that can be taken out by the goal's date counts. `opened` is given for a planned new account (opened now).
 */
export function sukanyaProjection<T extends { today: number; monthly: number; rate: number; basis: string; payMonths?: number | null; deduct?: number }>(
  item: T,
  input: { data: Record<string, any>; birthDate?: string | null; goalDate?: string; purpose: GoalPurpose; asOf: string; months: number; opened?: string; girl?: string; lookedUp?: string[] },
): T & { fixedAtTarget?: number; warning?: string } {
  const terms = sukanyaTerms(input.girl ? { ...input.data, account_name: input.girl } : input.data, input.birthDate, input.opened, input.lookedUp);
  const depositMonths = sukanyaDepositMonths(terms, input.asOf);
  const payMonths = depositMonths === null ? item.payMonths ?? input.months : Math.min(item.payMonths ?? input.months, depositMonths);
  const { share, reason } = input.goalDate ? sukanyaShareFor(terms, input.goalDate, input.purpose) : { share: 1, reason: "" };
  const deposits = terms.depositsUntil ? `; deposits until ${terms.depositsUntil}` : "";
  const out = { ...item, payMonths, basis: `${item.basis}${deposits}${reason ? `; ${share === 1 ? "" : share ? "half counted: " : "not counted: "}${reason}` : ""}` } as T & { fixedAtTarget?: number; warning?: string };
  if (share < 1) {
    // The value it reaches by the goal date, of which only `share` can be taken out then.
    const reached = futureValue(item.today, item.monthly, item.rate, input.months, payMonths);
    out.fixedAtTarget = Math.max(0, reached - Math.max(0, item.deduct || 0)) * share;
  }
  if (terms.warnings.length) out.warning = terms.warnings.join(" ");
  return out;
}

type GoalLineItem = ProjectionItem;
type Rec = { id: string; module_key: string; data: Record<string, any> | null };

/**
 * Applies the Sukanya rules to a goal's projection lines. The girl of a Sukanya holding is its record's
 * account holder; when that name has no date of birth that fits (a parent named on the record, say), a name
 * in the goal's own name is tried ("Riya" in "Riya Higher Education"). A planned Sukanya deposit is a new
 * account opened now, for the girl of the goal's existing Sukanya, else a name in the goal's name, else the
 * goal's owner.
 */
export function withSukanyaRules(
  items: GoalLineItem[],
  ctx: { records: Rec[]; planned: PlannedInvestment[]; goal: { targetDate?: string; category?: unknown; name?: unknown; owner?: string }; birthDates: Record<string, string>; asOf: string; months: number },
): GoalLineItem[] {
  const purpose = goalPurpose(ctx.goal), common = { goalDate: ctx.goal.targetDate, purpose, asOf: ctx.asOf, months: ctx.months };
  const inGoalName = namesInGoal(ctx.goal.name, ctx.birthDates);
  const sukanyaRecord = (id: string) => {
    const rec = ctx.records.find((r) => r.id === id);
    return rec?.module_key === "fixedIncome" && isSukanya(rec.data) ? rec : null;
  };
  const holders = items.map((i) => sukanyaRecord(i.id)).filter(Boolean).map((r) => String(r!.data?.account_name || ""));
  return items.map((item) => {
    const rec = sukanyaRecord(item.id);
    if (rec) {
      const data = rec.data || {}, girl = sukanyaGirl([String(data.account_name || ""), ...inGoalName], ctx.birthDates, sukanyaOpened(data));
      return sukanyaProjection(item, { ...common, data, birthDate: girl.birthDate, girl: girl.name, lookedUp: girl.lookedUp });
    }
    const plan = item.id.startsWith("planned:") ? ctx.planned.find((p) => `planned:${p.id}` === item.id) : undefined;
    if (plan?.instrument === "sukanya") {
      const girl = sukanyaGirl([...holders, ...inGoalName, String(ctx.goal.owner || "")], ctx.birthDates, ctx.asOf);
      const data = { account_name: girl.name, category: "Sukanya Samriddhi", yearly_investment: plan.mode === "monthly" ? plan.amount * 12 : plan.amount };
      const out = sukanyaProjection(item, { ...common, data, birthDate: girl.birthDate, girl: girl.name, lookedUp: girl.lookedUp, opened: ctx.asOf });
      // A planned account is opened now, so there is no opening date to ask for.
      const warning = sukanyaTerms(data, girl.birthDate, ctx.asOf, girl.lookedUp).warnings.filter((w) => !/enter the date/.test(w)).join(" ");
      return { ...out, warning: warning || undefined };
    }
    return item;
  });
}
