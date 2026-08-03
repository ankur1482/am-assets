import { describe, expect, it } from "vitest";
import { calculateInsurance, normalizeInsurancePolicy, validateInsurancePolicy } from "./insurance";

describe("insurance calculations", () => {
  const today = new Date(2026, 5, 29);
  it("calculates term cover and monthly premium", () => {
    const result = calculateInsurance({category:"Term Plan",status:"Active",policy_start_date:"2024-01-01",sum_assured:10000000,additional_rider_cover:500000,premium_amount:2500,premium_frequency:"Monthly"}, today);
    expect(result.annualPremium).toBe(30000);
    expect(result.deathCover).toBe(10500000);
    expect(result.currentValue).toBe(0);
  });
  it("calculates health cover without asset value", () => {
    const result = calculateInsurance({category:"Health Insurance",status:"Active",base_health_cover:1000000,super_topup_cover:2000000,no_claim_bonus:200000}, today);
    expect(result.healthCover).toBe(3200000);
    expect(result.currentValue).toBe(0);
    expect(result.deathCover).toBe(0);
  });
  it("treats a single premium as one completed payment", () => {
    const result = calculateInsurance({category:"Term Plan",status:"Active",policy_start_date:"2026-01-01",sum_assured:50000000,premium_amount:1100000,premium_frequency:"Single",single_premium_paid:"Yes"}, today);
    expect(result.annualPremium).toBe(1100000);
    expect(result.premiumYearsPaid).toBe(1);
    expect(result.premiumsPaidTillDate).toBe(1100000);
    expect(result.premiumStatus).toBe("PAID_UP");
  });
  it("calculates endowment bonus, value and maturity", () => {
    const result = calculateInsurance({category:"Endowment / LIC",status:"Active",policy_start_date:"2020-01-01",sum_assured:1000000,maturity_sum_assured:1000000,bonus_rate:4,premium_amount:50000,premium_frequency:"Yearly",money_back_received:100000,final_additional_bonus:50000}, today);
    expect(result.bonusAccruedTillDate).toBe(240000);
    expect(result.currentValue).toBe(490000);
    expect(result.maturityValue).toBe(1190000);
    expect(result.deathCover).toBe(1240000);
  });
  it("maps legacy LIC Other records to endowment", () => {
    const normalized = normalizeInsurancePolicy({category:"Other",broker:"LIC",security_name:"Jeevan Anand",annual_premium:21000});
    expect(normalized.policy_type).toBe("ENDOWMENT");
    expect(normalized.premium_amount).toBe(21000);
  });
  it("validates required type-specific fields", () => {
    const errors = validateInsurancePolicy({account_name:"A",security_name:"Plan",category:"ULIP",broker:"Insurer",status:"Active"});
    expect(errors.join(" ")).toContain("fund value");
  });
});
