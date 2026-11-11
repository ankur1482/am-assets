// Household planning settings (R19), saved in one `records` row with module_key 'planSettings' for the
// household (no schema change), so every login in the household sees the same assumptions.
// Phase 2 adds the rest of the assumptions and a form; birth dates are saved from each account's form.
// Each [DECISION] in the plan rulebook is a setting here, so Ankur can confirm or change it.

export const PLAN_SETTINGS_MODULE = "planSettings";

export type PlanSettings = {
  /** R4 [DECISION]: count the loan on the home you live in against goals. Default off: the home and its loan are both left out. */
  homeLoanAgainstPlan: boolean;
  /** Date of birth (YYYY-MM-DD) by account name, for every account holder. */
  birthDates: Record<string, string>;
};

export const DEFAULT_PLAN_SETTINGS: PlanSettings = {
  homeLoanAgainstPlan: false,
  birthDates: {},
};

type Rec = { id: string; module_key: string; data: Record<string, any> | null };

const validDate = (s: unknown): s is string => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

export function cleanPlanSettings(raw: unknown): PlanSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  const birthDates = Object.fromEntries(
    Object.entries(r.birth_dates && typeof r.birth_dates === "object" ? r.birth_dates : {}).filter(([name, date]) => name.trim() && validDate(date)),
  ) as Record<string, string>;
  return { homeLoanAgainstPlan: r.home_loan_against_plan === true, birthDates };
}

/** The household's settings record, if one has been saved. */
export const planSettingsRecord = (records: Rec[]) => records.find((r) => r.module_key === PLAN_SETTINGS_MODULE);
export const readPlanSettings = (records: Rec[]) => cleanPlanSettings(planSettingsRecord(records)?.data);

/** The saved form of the settings. */
export const planSettingsData = (s: PlanSettings) => ({ home_loan_against_plan: s.homeLoanAgainstPlan, birth_dates: s.birthDates });

/** Sets (or, with an empty date, clears) one person's date of birth; a renamed account keeps its date. */
export function withBirthDate(s: PlanSettings, name: string, date: string, previousName?: string): PlanSettings {
  const birthDates = { ...s.birthDates };
  if (previousName && previousName !== name) delete birthDates[previousName];
  if (validDate(date)) birthDates[name] = date;
  else delete birthDates[name];
  return { ...s, birthDates };
}
