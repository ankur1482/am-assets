import { describe, expect, it } from "vitest";
import { calculateIndianGratuity, computeRecord, computeTotals, num } from "./calculations";

describe("financial calculations", () => {
  it("parses formatted Indian currency values", () => {
    expect(num("₹25,64,778")).toBe(2564778);
  });

  it("calculates bullion gain from current and invested values", () => {
    const result = computeRecord("bullion", {
      purchase_price: 559188,
      latest_value: 605122,
    });
    expect(result.invested).toBe(559188);
    expect(result.latest).toBe(605122);
    expect(result.gain).toBe(45934);
  });

  it("uses tracked bullion costs as the landed cost", () => {
    const result = computeRecord("bullion", {
      metal_cost: 100000,
      making_charges: 5000,
      gst_paid: 3150,
      other_costs: 850,
      latest_value: 120000,
    });
    expect(result.invested).toBe(109000);
    expect(result.gain).toBe(11000);
  });

  it("calculates stock gain from current price and purchase price", () => {
    const result = computeRecord("stocks", {
      quantity: 970,
      inv_price: 1075.8,
      live_price: 1029.3,
      investment_amount: 997160,
      latest_value: 998421,
    });

    expect(result.invested).toBe(1043526);
    expect(result.latest).toBe(998421);
    expect(result.gain).toBe(-45105);
  });

  it("reconciles portfolio totals", () => {
    const totals = computeTotals([
      {
        module_key: "bullion",
        data: { purchase_price: 559188, latest_value: 605122 },
      },
      {
        module_key: "bullion",
        data: { purchase_price: 2005590, latest_value: 4729483 },
      },
    ]);
    expect(totals.invested).toBe(2564778);
    expect(totals.assets).toBe(5334605);
    expect(totals.gain).toBe(2769827);
  });

  it("calculates Indian gratuity using completed service and the 15/26 basis", () => {
    const result = calculateIndianGratuity({
      dateOfJoining: "2017-02-14",
      calculationDate: "2026-06-29",
      monthlyBasicSalary: 566334,
      monthlyDA: 0,
    });
    expect(result).toMatchObject({
      serviceYears: 9,
      serviceMonths: 4,
      serviceDays: 15,
      eligibleYears: 9,
      salaryBasis: 566334,
      gratuityPerYear: 326731,
      totalGratuity: 2940580,
      taxExemptGratuity: 2000000,
      taxableGratuity: 940580,
      eligible: true,
    });
  });

  it("rounds service up only when the remainder exceeds six months", () => {
    expect(calculateIndianGratuity({dateOfJoining:"2020-01-01",calculationDate:"2026-07-01",monthlyBasicSalary:26000}).eligibleYears).toBe(6);
    expect(calculateIndianGratuity({dateOfJoining:"2020-01-01",calculationDate:"2026-07-02",monthlyBasicSalary:26000}).eligibleYears).toBe(7);
  });

  it("marks service below five years ineligible", () => {
    const result=calculateIndianGratuity({dateOfJoining:"2022-01-01",calculationDate:"2026-12-31",monthlyBasicSalary:50000});
    expect(result.eligibleYears).toBe(0);
    expect(result.totalGratuity).toBe(0);
    expect(result.eligibilityMessage).toContain("Not eligible");
  });

  it("validates gratuity inputs", () => {
    expect(()=>calculateIndianGratuity({dateOfJoining:"2027-01-01",calculationDate:"2026-01-01",monthlyBasicSalary:50000})).toThrow("cannot be after");
    expect(()=>calculateIndianGratuity({dateOfJoining:"2020-01-01",calculationDate:"2026-01-01",monthlyBasicSalary:0})).toThrow("greater than 0");
    expect(()=>calculateIndianGratuity({dateOfJoining:"2020-01-01",calculationDate:"2026-01-01",monthlyBasicSalary:50000,monthlyDA:-1})).toThrow("cannot be negative");
  });
});
