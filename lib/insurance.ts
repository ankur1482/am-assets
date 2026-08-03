export const INSURANCE_POLICY_TYPES = {
  TERM_PLAN: "Term Plan",
  HEALTH_INSURANCE: "Health Insurance",
  LIFE_INSURANCE: "Life Insurance",
  ENDOWMENT: "Endowment / LIC",
  MONEY_BACK: "Money Back",
  ULIP: "ULIP",
  ACCIDENT_COVER: "Accident Cover",
  CRITICAL_ILLNESS: "Critical Illness",
  OTHER: "Other",
} as const;

export const INSURANCE_STATUSES = {
  ACTIVE: "Active",
  LAPSED: "Lapsed",
  CLOSED: "Closed",
  PAID_UP: "Paid-up",
  MATURED: "Matured",
} as const;

export type InsurancePolicyType = keyof typeof INSURANCE_POLICY_TYPES;

const n = (value: any) => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(String(value).replace(/[,₹%\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};
const text = (value: any) => String(value || "").trim();
const yes = (value: any) => value === true || /^(yes|true|1)$/i.test(text(value));
const key = (value: any) => text(value).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
const validDate = (value: any) => {
  const raw = text(value).slice(0, 10);
  if (!raw) return null;
  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};
const completedYears = (startValue: any, today: Date) => {
  const start = validDate(startValue);
  if (!start || start > today) return 0;
  let years = today.getFullYear() - start.getFullYear();
  if (today.getMonth() < start.getMonth() || (today.getMonth() === start.getMonth() && today.getDate() < start.getDate())) years--;
  return Math.max(0, years);
};

export function insurancePolicyType(value: any, insurer?: any): InsurancePolicyType {
  const raw = key(value);
  const aliases: Record<string, InsurancePolicyType> = {
    TERM: "TERM_PLAN", TERM_PLAN: "TERM_PLAN", HEALTH: "HEALTH_INSURANCE",
    HEALTH_INSURANCE: "HEALTH_INSURANCE", LIFE: "LIFE_INSURANCE", LIFE_INSURANCE: "LIFE_INSURANCE",
    ENDOWMENT: "ENDOWMENT", ENDOWMENT_LIC: "ENDOWMENT", LIC: "ENDOWMENT",
    MONEY_BACK: "MONEY_BACK", MONEYBACK: "MONEY_BACK", ULIP: "ULIP",
    ACCIDENT: "ACCIDENT_COVER", ACCIDENT_COVER: "ACCIDENT_COVER",
    CRITICAL_ILLNESS: "CRITICAL_ILLNESS", OTHER: "OTHER",
  };
  if ((raw === "OTHER" || !raw) && /\blic\b|life insurance corporation/i.test(text(insurer))) return "ENDOWMENT";
  return aliases[raw] || "OTHER";
}

function statusKey(value: any) {
  const raw = key(value);
  if (raw === "GRACE_PERIOD") return "LAPSED";
  return ["ACTIVE", "LAPSED", "CLOSED", "PAID_UP", "MATURED"].includes(raw) ? raw : "ACTIVE";
}

function frequencyKey(value: any) {
  const raw = key(value);
  return ["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY", "SINGLE"].includes(raw) ? raw : "YEARLY";
}

export function normalizeInsurancePolicy(policy: any) {
  const insurer = text(policy.insurer || policy.broker),
    type = insurancePolicyType(policy.policy_type || policy.category, insurer),
    frequency = frequencyKey(policy.premium_frequency || policy.premiumFrequency || "YEARLY"),
    frequencyLabels: Record<string,string> = {MONTHLY:"Monthly",QUARTERLY:"Quarterly",HALF_YEARLY:"Half-yearly",YEARLY:"Yearly",SINGLE:"Single"};
  return {
    ...policy,
    account_name: text(policy.account_name || policy.accountName || policy.life_insured || policy.lifeInsured),
    life_insured: text(policy.life_insured || policy.lifeInsured || policy.account_name || policy.accountName),
    security_name: text(policy.security_name || policy.securityName || policy.policy_name || policy.policyName),
    policy_type: type,
    category: INSURANCE_POLICY_TYPES[type],
    insurer,
    broker: insurer,
    insurance_broker: text(policy.insurance_broker || policy.agent || policy.platform),
    status: INSURANCE_STATUSES[statusKey(policy.status) as keyof typeof INSURANCE_STATUSES],
    premium_amount: n(policy.premium_amount ?? policy.premiumAmount ?? policy.annual_premium ?? policy.annualPremium),
    premium_frequency: frequencyLabels[frequency],
    premium_years_paid: policy.premium_years_paid ?? policy.premiumYearsPaid ?? policy.policy_years_paid,
    premium_due_date: text(policy.premium_due_date || policy.next_premium_due_date || policy.nextPremiumDueDate),
    current_value: n(policy.current_value ?? policy.currentValue ?? policy.dashboard_current_value ?? policy.current_value_including_bonus),
    sum_assured: n(policy.sum_assured ?? policy.sumAssured),
    death_cover_after_premium_closure: policy.death_cover_after_premium_closure ?? policy.deathCoverAfterPremiumClosure ?? policy.death_cover_after_closure,
  };
}

export function calculateInsurance(policyInput: any, todayInput = new Date()) {
  const policy = normalizeInsurancePolicy(policyInput), type = policy.policy_type as InsurancePolicyType,
    today = new Date(todayInput.getFullYear(), todayInput.getMonth(), todayInput.getDate()),
    status = statusKey(policy.status), frequency = frequencyKey(policy.premium_frequency),
    annualMultiplier: Record<string, number> = { MONTHLY: 12, QUARTERLY: 4, HALF_YEARLY: 2, YEARLY: 1, SINGLE: 1 },
    annualPremium = n(policy.premium_amount) * annualMultiplier[frequency], completedPolicyYears = completedYears(policy.policy_start_date, today),
    manualYears = text(policy.premium_years_paid) !== "" ? Math.max(0, n(policy.premium_years_paid)) : null,
    calculatedYears = frequency === "SINGLE" ? 1 : completedPolicyYears + (validDate(policy.policy_start_date) ? 1 : 0),
    premiumYearsPaid = Math.min(manualYears ?? calculatedYears, n(policy.premium_paying_years) || Number.MAX_SAFE_INTEGER),
    premiumsPaidTillDate = frequency === "SINGLE" ? n(policy.premium_amount) : annualPremium * premiumYearsPaid,
    sumAssured = n(policy.sum_assured), rider = n(policy.additional_rider_cover), moneyBackReceived = n(policy.money_back_received),
    bonusRate = n(policy.bonus_rate), annualBonus = sumAssured * bonusRate / 100,
    bonusAccruedTillDate = text(policy.bonus_accrued_till_date) !== "" ? n(policy.bonus_accrued_till_date) : text(policy.lic_bonus) !== "" ? n(policy.lic_bonus) : annualBonus * completedPolicyYears,
    explicitCurrent = n(policy.current_value), surrenderValue = n(policy.surrender_value),
    maturitySumAssured = n(policy.maturity_sum_assured) || sumAssured, finalAdditionalBonus = n(policy.final_additional_bonus);
  let currentValue = 0, deathCover = 0, healthCover = 0, criticalIllnessCover = 0, maturityValue = 0;
  if (type === "TERM_PLAN") {
    deathCover = sumAssured + rider;
    if (yes(policy.return_of_premium)) currentValue = maturityValue = premiumsPaidTillDate;
  } else if (type === "HEALTH_INSURANCE") {
    healthCover = n(policy.base_health_cover) + n(policy.super_topup_cover) + n(policy.no_claim_bonus);
  } else if (["LIFE_INSURANCE", "ENDOWMENT", "MONEY_BACK"].includes(type)) {
    currentValue = surrenderValue || explicitCurrent || Math.max(0, premiumsPaidTillDate + bonusAccruedTillDate - moneyBackReceived);
    maturityValue = Math.max(0, maturitySumAssured + bonusAccruedTillDate + finalAdditionalBonus - moneyBackReceived);
    deathCover = sumAssured + bonusAccruedTillDate + (type === "MONEY_BACK" ? 0 : rider);
  } else if (type === "ULIP") {
    const fundValue = n(policy.units) && n(policy.nav) ? n(policy.units) * n(policy.nav) : n(policy.fund_value) || explicitCurrent;
    currentValue = maturityValue = fundValue;
    deathCover = Math.max(sumAssured, fundValue);
  } else if (type === "ACCIDENT_COVER") deathCover = n(policy.accidental_death_cover);
  else if (type === "CRITICAL_ILLNESS") criticalIllnessCover = n(policy.critical_illness_cover);
  else {
    currentValue = explicitCurrent || n(policy.payout_value);
    deathCover = sumAssured;
    maturityValue = n(policy.maturity_value);
  }
  if (status === "CLOSED") {
    currentValue = 0;
    if (!yes(policy.death_cover_after_premium_closure)) deathCover = 0;
  }
  const policyEnd = validDate(policy.policy_end_date || policy.cover_end_date), premiumEnd = validDate(policy.premium_end_date);
  const premiumStatus = status === "CLOSED" ? "CLOSED" : policyEnd && today > policyEnd ? (["LIFE_INSURANCE", "ENDOWMENT", "MONEY_BACK", "ULIP"].includes(type) ? "MATURED" : "EXPIRED") : frequency === "SINGLE" || premiumEnd && today > premiumEnd ? "PAID_UP" : "PAYING";
  return {
    policyType: type, policyTypeLabel: INSURANCE_POLICY_TYPES[type], annualPremium: Math.round(annualPremium),
    premiumsPaidTillDate: Math.round(premiumsPaidTillDate), completedPolicyYears, premiumYearsPaid,
    bonusAccruedTillDate: Math.round(bonusAccruedTillDate), currentValue: Math.round(currentValue),
    deathCover: Math.round(deathCover), healthCover: Math.round(healthCover), criticalIllnessCover: Math.round(criticalIllnessCover),
    maturityValue: Math.round(maturityValue), moneyBackReceived: Math.round(moneyBackReceived),
    nextPremiumDueDate: policy.premium_due_date, premiumStatus,
  };
}

export function validateInsurancePolicy(policyInput: any) {
  const policy = normalizeInsurancePolicy(policyInput), result = calculateInsurance(policy), errors: string[] = [], type = result.policyType;
  if (!policy.account_name && !policy.life_insured) errors.push("Account or life insured is required.");
  if (!policy.security_name) errors.push("Policy name is required.");
  if (!policyInput.category && !policyInput.policy_type) errors.push("Policy type is required.");
  if (!policy.insurer) errors.push("Insurer is required.");
  if (!policyInput.status) errors.push("Status is required.");
  if (type === "TERM_PLAN" && !n(policy.sum_assured)) errors.push("Sum assured is required for a Term Plan.");
  if (["TERM_PLAN", "HEALTH_INSURANCE", "LIFE_INSURANCE", "ENDOWMENT"].includes(type) && !n(policy.premium_amount)) errors.push("Premium amount is required.");
  if (type === "TERM_PLAN" && !policy.policy_end_date && !policy.cover_end_date) errors.push("Policy or cover end date is required.");
  if (type === "HEALTH_INSURANCE" && (!n(policy.base_health_cover) || !policy.policy_end_date)) errors.push("Base health cover and policy end date are required.");
  if (["LIFE_INSURANCE", "ENDOWMENT"].includes(type) && (!n(policy.sum_assured) || !policy.policy_start_date || !policy.policy_end_date)) errors.push("Sum assured, start date and end date are required.");
  if (type === "MONEY_BACK" && !n(policy.sum_assured)) errors.push("Sum assured is required for a Money Back policy.");
  if (type === "ULIP" && !(n(policy.fund_value) || (n(policy.units) && n(policy.nav)))) errors.push("Enter fund value or both units and NAV.");
  if (type === "ACCIDENT_COVER" && !n(policy.accidental_death_cover)) errors.push("Accidental death cover is required.");
  if (type === "CRITICAL_ILLNESS" && !n(policy.critical_illness_cover)) errors.push("Critical illness cover is required.");
  return errors;
}
