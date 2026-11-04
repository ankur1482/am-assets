import { describe, expect, it } from "vitest";
import { calculateIndianGratuity, computeRecord, computeTotals, formatDate, formatDateTime, formatDateValue, formatMonth, isEarningRent, isRentedProperty, loanPosition, num, occupancyOf, occupiedShareOfMonth, PROPERTY_LOAN_FIELDS, propertyGroupTotals } from "./calculations";

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

  it("nets savings parked against an overdraft home loan", () => {
    const loan = { loan_structure: "Overdraft (OD)", loan_balance: 7300000, od_parked_balance: 3000000, loan_interest_rate: 7.5, emis_left: 240, purchase_price: 10000000, latest_value: 17000000 };
    const od = computeRecord("property", loan), standard = computeRecord("property", { ...loan, loan_structure: "Standard EMI" });
    expect(od.loan_balance).toBe(7300000);
    expect(od.net_loan_balance).toBe(4300000);
    expect(od.od_monthly_interest).toBeCloseTo(4300000 * 7.5 / 1200);
    expect(od.emiFuture).toBeLessThan(standard.emiFuture);
    expect(od.monthly_emi).toBeCloseTo(standard.monthly_emi * 4300000 / 7300000);
    expect(standard.net_loan_balance).toBe(7300000);
    expect(computeTotals([{ module_key: "property", data: loan }]).liabilities).toBe(4300000);
  });

  describe("loan position", () => {
    const asOf = new Date(2026, 10, 15);
    const names = PROPERTY_LOAN_FIELDS;

    it("derives the EMI from the original terms for a new loan", () => {
      const loan = loanPosition({ loan_amount: 8000000, loan_interest_rate: 7.5, loan_tenure_months: 240 }, names, asOf);
      expect(loan.emi).toBeCloseTo(64447, -1);
      expect(loan.balance).toBe(8000000);
      expect(loan.monthsLeft).toBe(240);
    });
    it("derives balance, paid amounts and months left from the EMI start date", () => {
      const loan = loanPosition({ loan_amount: 1000000, loan_interest_rate: 12, loan_tenure_months: 120, loan_start_date: "2026-05-15" }, names, asOf);
      expect(loan.balance).toBeLessThan(1000000);
      expect(loan.monthsLeft).toBe(113);
      expect(loan.principalPaid).toBeCloseTo(1000000 - loan.balance);
      expect(loan.interestPaid + loan.principalPaid).toBeCloseTo(loan.emi * 7);
    });
    it("works out months left from an entered balance and EMI", () => {
      const loan = loanPosition({ loan_amount: 8000000, loan_balance: 7300000, loan_interest_rate: 7.5, loan_tenure_months: 240, emi_amount: 64447 }, names, asOf);
      expect(loan.monthsLeft).toBeGreaterThan(180);
      expect(loan.monthsLeft).toBeLessThan(200);
      expect(loan.principalPaid).toBe(700000);
      expect(loan.nextInterest).toBeCloseTo(7300000 * 7.5 / 1200);
      expect(loan.nextPrincipal).toBeCloseTo(64447 - loan.nextInterest);
    });
    it("works out the EMI from an entered balance and months left", () => {
      const loan = loanPosition({ loan_balance: 4327016, loan_interest_rate: 7.35, emis_left: 39 }, names, asOf);
      expect(loan.emi).toBeCloseTo(125065, -2);
      expect(loan.monthsLeft).toBe(39);
    });
    it("uses the original EMI when only the balance is entered", () => {
      expect(loanPosition({ loan_amount: 8000000, loan_balance: 7300000, loan_interest_rate: 7.5, loan_tenure_months: 240 }, names, asOf).emi).toBeCloseTo(64447, -1);
    });
    it("handles an interest-free loan", () => {
      expect(loanPosition({ loan_balance: 1000, emi_amount: 100 }, names, asOf)).toMatchObject({ monthsLeft: 10, futureInterest: 0 });
    });
    it("clears sooner on an OD loan while the EMI stays the same", () => {
      const terms = { loan_amount: 8000000, loan_balance: 7300000, loan_interest_rate: 7.5, emi_amount: 64447 };
      const od = loanPosition({ ...terms, loan_structure: "Overdraft (OD)", od_parked_balance: 3000000 }, names, asOf), standard = loanPosition(terms, names, asOf);
      expect(od.emi).toBe(standard.emi);
      expect(od.monthsLeft!).toBeLessThan(standard.monthsLeft!);
      expect(od.futureInterest).toBeLessThan(standard.futureInterest);
    });
    it("owes nothing on an OD loan fully covered by parked savings", () => {
      const loan = loanPosition({ loan_structure: "Overdraft (OD)", loan_amount: 8500000, loan_balance: 8500000, od_parked_balance: 8500000, loan_interest_rate: 7.5, loan_tenure_months: 240 }, names, asOf);
      expect(loan).toMatchObject({ emi: 0, netBalance: 0, nextInterest: 0, monthsLeft: 0, totalPayable: 0, futureInterest: 0, clearsOn: "Covered by OD savings", warnings: [] });
    });
    it("sets a partly covered OD EMI on the uncovered balance over the remaining term", () => {
      const terms = { loan_structure: "Overdraft (OD)", loan_amount: 8000000, loan_balance: 7300000, loan_interest_rate: 7.5, emis_left: 180 };
      const loan = loanPosition({ ...terms, od_parked_balance: 7200000 }, names, asOf);
      expect(loan.netBalance).toBe(100000);
      expect(loan.emi).toBeCloseTo(loanPosition({ loan_balance: 100000, loan_interest_rate: 7.5, emis_left: 180 }, names, asOf).emi);
      expect(loan.monthsLeft).toBe(180);
    });
    it("counts down the remaining term for an OD EMI from the first EMI date", () => {
      const loan = loanPosition({ loan_structure: "Overdraft (OD)", loan_amount: 1000000, loan_balance: 1000000, od_parked_balance: 500000, loan_interest_rate: 12, loan_tenure_months: 120, loan_start_date: "2026-05-15" }, names, asOf);
      expect(loan.monthsLeft).toBe(113);
    });
    it("keeps an EMI the user entered even on a fully covered OD loan", () => {
      expect(loanPosition({ loan_structure: "Overdraft (OD)", loan_balance: 100, od_parked_balance: 100, loan_interest_rate: 8, emi_amount: 50 }, names, asOf)).toMatchObject({ emi: 50, monthsLeft: 0 });
    });
    it("warns when the figures cannot all be true", () => {
      const warn = (data: any) => loanPosition(data, names, asOf).warnings.join(" ");
      expect(warn({ loan_balance: 1000000, loan_interest_rate: 12, emi_amount: 5000 })).toContain("never clear");
      expect(warn({ loan_amount: 100, loan_balance: 200, loan_interest_rate: 8, emis_left: 10 })).toContain("higher than the loan amount");
      expect(warn({ loan_balance: 1000000, loan_interest_rate: 12, emi_amount: 50000, emis_left: 200 })).toContain("EMIs left says 200");
      expect(warn({ loan_amount: 8000000, loan_balance: 7300000, loan_interest_rate: 7.5, loan_tenure_months: 240, emis_left: 240 })).toContain("full 240-month tenure");
      expect(warn({ loan_amount: 8000000, loan_balance: 4327016, loan_interest_rate: 7.35, loan_tenure_months: 240, emis_left: 39 })).toContain("well above");
      expect(warn({ loan_balance: 1000 })).toContain("Enter the monthly EMI");
      expect(warn({ loan_amount: 8000000, loan_balance: 7300000, loan_interest_rate: 7.5, loan_tenure_months: 240, emi_amount: 64447 })).toBe("");
    });
  });

  it("combines units in a community without adding EMIs left or the interest rate", () => {
    const flat = (data: any) => computeRecord("property", { purchase_price: 10000000, latest_value: 17000000, ...data });
    const one = flat({ security_name: "Residential", is_rented: "Yes", monthly_rent: 65000, rentee_name: "A", loan_amount: 8000000, loan_balance: 7300000, loan_interest_rate: 7.5, emis_left: 240 });
    const two = flat({ security_name: "Residential", is_rented: "Yes", monthly_rent: 62000, rentee_name: "B", loan_amount: 8000000, loan_balance: 4327016, loan_interest_rate: 7.35, emis_left: 39 });
    const group = propertyGroupTotals([one, two]);
    expect(group.emis_left).toBe(240);
    expect(group.loan_balance).toBe(11627016);
    expect(group.monthly_emi).toBeCloseTo(one.monthly_emi + two.monthly_emi);
    expect(group.loan_interest_rate).toBeGreaterThan(7.35);
    expect(group.loan_interest_rate).toBeLessThan(7.5);
    expect(group.monthly_rent).toBe(127000);
    expect(group.rentee_name).toBe("A, B");
    expect(group.security_name).toBe("Residential");
    expect(group.latest).toBe(34000000);
    expect(propertyGroupTotals([one])).toBe(one);
  });
  it("ignores rent from an unrented or unfinished unit when combining a community", () => {
    const group = propertyGroupTotals([
      computeRecord("property", { is_rented: "No", monthly_rent: 5000, loan_structure: "Overdraft (OD)" }),
      computeRecord("property", { is_rented: "Yes", monthly_rent: 7000, construction_status: "Under Construction", loan_structure: "Standard EMI" }),
    ]);
    expect(group.monthly_rent).toBe(0);
    expect(group.is_rented).toBe("No");
    expect(group.loan_structure).toBe("Overdraft (OD) + Standard");
  });

  it("reads occupancy from the new answer, then from the older Yes/No answer", () => {
    expect(occupancyOf({ occupancy: "Rented" })).toBe("Rented");
    expect(occupancyOf({ occupancy: "Residing", is_rented: "Yes" })).toBe("Residing");
    expect(occupancyOf({ is_rented: "Yes" })).toBe("Rented");
    expect(occupancyOf({})).toBe("Residing");
    expect(isRentedProperty({ occupancy: "Rented", construction_status: "Under Construction" })).toBe(false);
  });
  it("tracks a vacancy between two dates and an open-ended one", () => {
    const flat = { occupancy: "Rented", vacant_from: "2026-11-16", vacant_to: "2026-12-31" };
    expect(isEarningRent(flat, "2026-11-15")).toBe(true);
    expect(isEarningRent(flat, "2026-11-16")).toBe(false);
    expect(isEarningRent(flat, "2026-12-31")).toBe(false);
    expect(isEarningRent(flat, "2027-01-01")).toBe(true);
    expect(isEarningRent({ occupancy: "Rented", vacant_from: "2026-11-16" }, "2030-01-01")).toBe(false);
    expect(occupiedShareOfMonth(flat, "2026-11")).toBeCloseTo(0.5);
    expect(occupiedShareOfMonth(flat, "2026-12")).toBe(0);
    expect(occupiedShareOfMonth(flat, "2027-01")).toBe(1);
  });

  it("formats dates as dd-MMM-yyyy", () => {
    expect(formatDate("2026-11-04")).toBe("04-Nov-2026");
    expect(formatDate("2027-01-31")).toBe("31-Jan-2027");
    expect(formatDate("2026-11-04T08:46:07.034Z")).toBe("04-Nov-2026");
    expect(formatDate("2026-11-04T20:00:00.000Z")).toBe("05-Nov-2026");
    expect(formatDateTime("2026-11-04T08:46:07.034Z")).toBe("04-Nov-2026 14:16");
    expect(formatMonth("2026-11")).toBe("Nov-2026");
    expect(formatMonth("2026-11-01")).toBe("Nov-2026");
  });
  it("leaves non-dates alone and tolerates empty or bad values", () => {
    expect(formatDate("")).toBe("");
    expect(formatDate(null)).toBe("");
    expect(formatDate("Add first EMI date")).toBe("Add first EMI date");
    expect(formatDate("2026-13-01")).toBe("2026-13-01");
    expect(formatDateTime("nonsense")).toBe("nonsense");
    for (const value of ["453000", "Residential", "2026", "Covered by OD savings"]) expect(formatDateValue(value)).toBe(value);
    expect(formatDateValue("2026-11-04")).toBe("04-Nov-2026");
    expect(formatDateValue("2037-03")).toBe("Mar-2037");
    expect(formatDateValue("2026-11-04T08:46:07.034Z")).toBe("04-Nov-2026 14:16");
  });
  it("keeps salary and rent out of assets and net worth", () => {
    for (const category of ["Salary", "Rental Income"]) {
      const data = { category, employee_contribution: 100000, purchase_date: "2020-01-01" };
      expect(computeRecord("fixedIncome", data)).toMatchObject({ latest: 0, invested: 0, gain: 0 });
      expect(computeTotals([{ module_key: "fixedIncome", data }])).toMatchObject({ assets: 0, invested: 0, gain: 0, net: 0 });
    }
  });
  it("does not project a yearly total from a single salary credit", () => {
    expect(computeRecord("fixedIncome", { category: "Salary", employee_contribution: 453000 }).yearly_total_value).toBe("");
  });
  it("keeps dividend income out of assets and counts a savings balance as cash with no gain", () => {
    const dividend = { category: "Dividend Income", employee_contribution: 5000, purchase_date: "2020-01-01" };
    expect(computeRecord("fixedIncome", dividend)).toMatchObject({ latest: 0, invested: 0, gain: 0, yearly_total_value: 60000 });
    expect(computeTotals([{ module_key: "fixedIncome", data: dividend }]).assets).toBe(0);
    const savings = { category: "Savings Account", current_value_today: 250000, purchase_date: "2020-01-01" };
    expect(computeRecord("fixedIncome", savings)).toMatchObject({ latest: 250000, invested: 250000, gain: 0 });
    expect(computeTotals([{ module_key: "fixedIncome", data: savings }]).assets).toBe(250000);
    const renamed = { category: "Savings in Bank", current_value_today: 90000 };
    expect(computeRecord("fixedIncome", renamed)).toMatchObject({ latest: 90000, gain: 0 });
    const home = { category: "Cash at Home", current_value_today: 40000, purchase_date: "2020-01-01" };
    expect(computeRecord("fixedIncome", home)).toMatchObject({ latest: 40000, invested: 40000, gain: 0 });
    expect(computeTotals([{ module_key: "fixedIncome", data: home }]).assets).toBe(40000);
  });

  it("does not treat parked savings beyond the balance as a negative liability", () => {
    const c = computeRecord("loans", { loan_structure: "Overdraft (OD)", loan_balance: 100, od_parked_balance: 500, interest_rate: 8 });
    expect(c.balance).toBe(0);
    expect(c.od_monthly_interest).toBe(0);
  });

  it("ignores parked savings on a standard loan", () => {
    expect(computeRecord("loans", { loan_balance: 100, od_parked_balance: 50, interest_rate: 8 }).balance).toBe(100);
  });

  it("projects a property loan from the EMIs left rather than the original tenure", () => {
    const c = computeRecord("property", { loan_balance: 4327016, loan_interest_rate: 7.35, loan_tenure_months: 240, emis_left: 39 });
    expect(c.emis_left).toBe(39);
    expect(c.emiFuture).toBeCloseTo(4877555, -2);
  });
});
