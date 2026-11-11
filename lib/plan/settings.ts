// Household planning settings (R19). Phase 2 saves these in one `planSettings` record per household
// and adds a form to change them; until then every screen uses these defaults.
// Each [DECISION] in the plan rulebook is a setting here, so Ankur can confirm or change it.

export type PlanSettings = {
  /** R4 [DECISION]: count the loan on the home you live in against goals. Default off: the home and its loan are both left out. */
  homeLoanAgainstPlan: boolean;
};

export const DEFAULT_PLAN_SETTINGS: PlanSettings = {
  homeLoanAgainstPlan: false,
};
