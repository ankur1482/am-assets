// Employment drives salary, Company PF contributions and gratuity. Each Salary record says whether
// that person is still employed and, if so, until when they plan to work. When employment ends,
// salary stops, PF contributions stop (interest continues) and gratuity freezes at the last day.

import { monthsBetween } from "./plan/dates";

type Rec = { id: string; module_key: string; data?: Record<string, any> | null };

const typeOf = (d: Record<string, any>) => String(d?.category || "").trim().toLowerCase();
export const isSalaryRecord = (r: Rec) => r.module_key === "fixedIncome" && /^salary$/.test(typeOf(r.data || {}));
export const isEmploymentLinked = (r: Rec) =>
  r.module_key === "fixedIncome" && (/gratuity/.test(typeOf(r.data || {})) || /^epf$|^pf$|company\s*pf|provident/.test(typeOf(r.data || {})));
const validDate = (s: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

export type Employment<T extends Rec = Rec> = { account: string; salary: T; employed: boolean; endDate: string | null; planned: boolean };

/** Employment for one Salary record: ended (last working day) or still employed until the planned date, if any. */
export function employmentOf<T extends Rec>(salary: T, asOf: string): Employment<T> {
  const d = salary.data || {};
  const lastDay = validDate(d.last_working_date) ? String(d.last_working_date) : null;
  const saidNo = /^no$/i.test(String(d.currently_employed || "").trim());
  const ended = saidNo || (lastDay !== null && lastDay < asOf);
  if (ended) return { account: String(d.account_name || ""), salary, employed: false, endDate: lastDay || asOf, planned: false };
  const plannedEnd = validDate(d.planned_employment_end) ? String(d.planned_employment_end) : null;
  return { account: String(d.account_name || ""), salary, employed: true, endDate: plannedEnd, planned: plannedEnd !== null };
}

/** The employment that a PF or gratuity record depends on: the same person's Salary record. */
export function employmentFor<T extends Rec>(records: T[], account: string, asOf: string): Employment<T> | null {
  const salaries = records.filter((r) => isSalaryRecord(r) && String(r.data?.account_name || "") === String(account || ""));
  if (!salaries.length) return null;
  // With more than one salary for a person, the one still running decides.
  const all = salaries.map((s) => employmentOf(s, asOf));
  return all.find((e) => e.employed) || all[0];
}

/** Whole months from asOf until the date (0 if it has passed), for stopping contributions in projections. */
export function monthsUntilDate(date: string | null, asOf: string): number | null {
  if (!date) return null;
  return monthsBetween(asOf, date); // R7: the one month count
}

/** Salary records whose person has not yet answered "Are you still employed?" this month. */
export function employmentChecksDue<T extends Rec>(records: T[], asOf: string): Employment<T>[] {
  const month = asOf.slice(0, 7);
  return records
    .filter(isSalaryRecord)
    .map((r) => employmentOf(r, asOf))
    .filter((e) => e.employed && String(e.salary.data?.employment_confirmed_month || "") !== month);
}

/** The records to update when someone says they are no longer employed: their salary, PF and gratuity. */
export function recordsEndedBy<T extends Rec>(records: T[], account: string): T[] {
  return records.filter((r) => String(r.data?.account_name || "") === String(account || "") && (isSalaryRecord(r) || isEmploymentLinked(r)));
}
