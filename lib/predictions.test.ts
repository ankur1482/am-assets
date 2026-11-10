import { describe, expect, it } from 'vitest';
import { amortizeDebt, goalForecast, marketProjection, monthlyPayment, planningSnapshot, premiumsDueIn, projectCashFlow, projectWealth } from './predictions';

describe('predictive planning calculations', () => {
  it('stops contributions at retirement and applies inflation-adjusted withdrawals', () => {
    const p = projectWealth({ starting: 10000, years: 2, annualReturn: 0, inflation: 0, monthly: 1000, annualStepUp: 0, contributionYears: 1, retirementMonthly: 500 });
    expect(p.final.nominal).toBe(16000);
    expect(p.final.contributed).toBe(12000);
    expect(p.final.withdrawn).toBe(6000);
  });
  it('uses effective annual returns and discounts purchasing power', () => {
    const p = projectWealth({ starting: 10000, years: 1, annualReturn: 10, inflation: 10, monthly: 0, annualStepUp: 0, contributionYears: 1, retirementMonthly: 0 });
    expect(p.final.nominal).toBeCloseTo(11000);
    expect(p.final.real).toBeCloseTo(10000);
  });
  it('does not create positive investment returns on negative net worth', () => {
    const p = projectWealth({ starting: -10000, years: 1, annualReturn: 10, inflation: 0, monthly: 0, annualStepUp: 0, contributionYears: 1, retirementMonthly: 0 });
    expect(p.final.nominal).toBe(-10000);
  });
  it('raises contributions only after a completed year', () => {
    const p = projectWealth({ starting: 0, years: 2, annualReturn: 0, inflation: 0, monthly: 100, annualStepUp: 10, contributionYears: 2, retirementMonthly: 0 });
    expect(p.final.contributed).toBeCloseTo(2520);
  });
  it('calculates a zero-return goal funding gap and flags overdue goals', () => {
    const goal = goalForecast({ current: 1200, target: 2400, targetDate: '2027-01-01', asOf: '2026-01-01', monthly: 50, annualReturn: 0 });
    expect(goal).toMatchObject({ months: 12, required: 100, projected: 1800, gap: 600 });
    expect(goalForecast({ current: 0, target: 100, targetDate: '2025-01-01', asOf: '2026-01-01', monthly: 100, annualReturn: 8 })?.overdue).toBe(true);
    expect(goalForecast({ current: 0, target: 100, targetDate: '2026-02-30', monthly: 0, annualReturn: 8 })).toBeNull();
  });
  it('handles zero-interest payoff, extra payments and negative amortization', () => {
    const debt = { id: 'a', name: 'Loan', balance: 1000, annualRate: 0, payment: 100 };
    expect(monthlyPayment(1000, 0, 10)).toBe(100);
    expect(amortizeDebt(debt)).toMatchObject({ months: 10, interest: 0 });
    expect(amortizeDebt(debt, 100).months).toBe(5);
    expect(amortizeDebt({ ...debt, annualRate: 24, payment: 10 }).paidOff).toBe(false);
  });
  it('uses calendar months for goal dates instead of rounding a 31-day month to two', () => {
    expect(goalForecast({ current: 0, target: 1000, targetDate: '2026-02-01', asOf: '2026-01-01', monthly: 0, annualReturn: 0 })?.required).toBe(1000);
  });
  it('reduces interest and payoff time with extra repayments', () => {
    const debt = { id: 'a', name: 'Loan', balance: 100000, annualRate: 12, payment: monthlyPayment(100000, 12, 24) };
    const base = amortizeDebt(debt), extra = amortizeDebt(debt, 1000);
    expect(base.months).toBe(24);
    expect(extra.months!).toBeLessThan(base.months!);
    expect(extra.interest).toBeLessThan(base.interest);
  });
  it('releases cash after debt payoff and never overpays principal', () => {
    const p = projectCashFlow({ asOf: '2026-11-03', opening: 0, income: 100, expenses: 20, investment: 10, premiums: 0, debts: [{ id: 'a', name: 'Loan', balance: 50, annualRate: 0, payment: 100 }] });
    expect(p[0]).toMatchObject({ month: '2026-12', debtPayment: 50, surplus: 20, closing: 20 });
    expect(p[1]).toMatchObject({ month: '2027-01', debtPayment: 0, surplus: 70, closing: 90 });
  });
  it('preserves settled zero balances and separates income from investments', () => {
    const p = planningSnapshot([{ id: 'a', module_key: 'loans', data: { loan_balance: 0, loan_amount: 100000 } }, { id: 'b', module_key: 'fixedIncome', data: { category: 'Salary', employee_contribution: 50000 } }, { id: 'c', module_key: 'mutualFunds', data: { sip_amount: 1000 } }]);
    expect(p.debts).toEqual([]);
    expect(p.monthlyIncome).toBe(50000);
    expect(p.monthlyInvestment).toBe(1000);
  });
  it('adds salary and rent to available cash flow without double counting linked rent rows', () => {
    const p = planningSnapshot([
      { id: 'sal', module_key: 'fixedIncome', data: { category: 'Salary', employee_contribution: 200000 } },
      { id: 'home', module_key: 'property', data: { is_rented: 'Yes', monthly_rent: 65000, loan_balance: 1000000, loan_interest_rate: 0, monthly_emi: 50000 } },
      { id: 'linked', module_key: 'fixedIncome', data: { category: 'Rental Income', employee_contribution: 65000, linked_property_id: 'home' } },
      { id: 'other', module_key: 'fixedIncome', data: { category: 'Rental Income', employee_contribution: 10000 } },
    ], '2026-11-04');
    expect(p).toMatchObject({ monthlySalary: 200000, monthlyRent: 75000, monthlyIncome: 275000, monthlyEmi: 50000, availableCashFlow: 225000 });
  });
  it('earns no rent from a property under construction', () => {
    const p = planningSnapshot([{ id: 'new', module_key: 'property', data: { is_rented: 'Yes', monthly_rent: 40000, construction_status: 'Under Construction' } }], '2026-11-04');
    expect(p.monthlyRent).toBe(0);
  });
  it('treats savings and parked OD funds as liquidity and adds dividends to monthly inflows', () => {
    const p = planningSnapshot([
      { id: 'sal', module_key: 'fixedIncome', data: { category: 'Salary', employee_contribution: 100000 } },
      { id: 'div', module_key: 'fixedIncome', data: { category: 'Dividend Income', employee_contribution: 5000 } },
      { id: 'bank', module_key: 'fixedIncome', data: { category: 'Savings Account', current_value_today: 300000 } },
      { id: 'flat', module_key: 'property', data: { loan_structure: 'Overdraft (OD)', loan_balance: 8500000, od_parked_balance: 8500000, loan_interest_rate: 7.5, emis_left: 120 } },
    ], '2026-11-04');
    expect(p).toMatchObject({ monthlyDividend: 5000, monthlyIncome: 105000, savingsBalance: 300000, odParked: 8500000, liquidity: 8800000, monthlyInvestment: 0, availableCashFlow: 105000 });
  });
  it('counts bank savings and cash at home as separate parts of liquidity, not as investments', () => {
    const p = planningSnapshot([
      { id: 'bank', module_key: 'fixedIncome', data: { category: 'Savings in Bank', current_value_today: 300000 } },
      { id: 'old', module_key: 'fixedIncome', data: { category: 'Savings Account', current_value_today: 100000 } },
      { id: 'home', module_key: 'fixedIncome', data: { category: 'Cash at Home', current_value_today: 50000 } },
    ], '2026-11-04');
    expect(p).toMatchObject({ savingsBalance: 400000, cashAtHome: 50000, liquidity: 450000, monthlyInvestment: 0 });
  });
  it('draws on parked OD funds only after other cash runs out and raises interest when it does', () => {
    const debts = [{ id: 'a', name: 'Home', balance: 100000, annualRate: 12, payment: 0, parked: 100000, isOd: true }];
    const flow = { asOf: '2026-11-04', income: 0, expenses: 30000, investment: 0, premiums: 0, debts };
    const p = projectCashFlow({ ...flow, opening: 10000 });
    expect(p[0]).toMatchObject({ closing: 0, parked: 80000, liquidity: 80000, interest: 0 });
    expect(p[1].interest).toBeCloseTo(200);
    expect(projectCashFlow({ ...flow, opening: 50000 })[0]).toMatchObject({ closing: 20000, parked: 100000, liquidity: 120000 });
  });
  it('earns no rent while a let flat is vacant or the owner is residing', () => {
    const rent = (data: Record<string, any>) => planningSnapshot([{ id: 'flat', module_key: 'property', data: { monthly_rent: 40000, ...data } }], '2026-11-04').monthlyRent;
    expect(rent({ occupancy: 'Rented' })).toBe(40000);
    expect(rent({ occupancy: 'Residing' })).toBe(0);
    expect(rent({ occupancy: 'Rented', vacant_from: '2026-11-01' })).toBe(0);
    expect(rent({ occupancy: 'Rented', vacant_from: '2026-01-01', vacant_to: '2026-02-01' })).toBe(40000);
  });
  it('removes rent for vacant months in the forecast and resumes it afterwards', () => {
    const flow = { asOf: '2026-11-04', opening: 0, expenses: 0, investment: 0, premiums: 0, debts: [] };
    const upcoming = { occupancy: 'Rented', monthly_rent: 30000, vacant_from: '2027-01-01', vacant_to: '2027-01-31' };
    const before = projectCashFlow({ ...flow, income: 100000, rentals: [upcoming] });
    expect(before.map(p => p.income).slice(0, 3)).toEqual([100000, 70000, 100000]);
    const current = { occupancy: 'Rented', monthly_rent: 30000, vacant_from: '2026-11-01', vacant_to: '2026-12-31' };
    const during = projectCashFlow({ ...flow, income: 70000, rentals: [current] });
    expect(during.map(p => p.income).slice(0, 2)).toEqual([70000, 100000]);
  });
  it('stops counting salary after the last working date', () => {
    const p = planningSnapshot([{ id: 'sal', module_key: 'fixedIncome', data: { category: 'Salary', employee_contribution: 100, last_working_date: '2026-01-31' } }], '2026-11-04');
    expect(p.monthlySalary).toBe(0);
  });
  it('charges OD interest only on the balance not covered by parked savings', () => {
    const standard = amortizeDebt({ id: 'a', name: 'Home', balance: 1000000, annualRate: 12, payment: 50000 });
    const od = amortizeDebt({ id: 'a', name: 'Home', balance: 1000000, annualRate: 12, payment: 50000, parked: 600000, isOd: true });
    expect(od.interest).toBeLessThan(standard.interest);
    expect(od.months!).toBeLessThan(standard.months!);
    expect(amortizeDebt({ id: 'a', name: 'Home', balance: 1000000, annualRate: 12, payment: 5000, parked: 600000, isOd: true }).months).not.toBeNull();
  });
  it('asks nothing of a fully parked OD loan in cash flow or payoff', () => {
    const p = planningSnapshot([{ id: 'flat', module_key: 'property', data: { loan_structure: 'Overdraft (OD)', loan_amount: 8500000, loan_balance: 8500000, od_parked_balance: 8500000, loan_interest_rate: 7.5, loan_tenure_months: 240 } }], '2026-11-04');
    expect(p.monthlyEmi).toBe(0);
    expect(p.warnings).toEqual([]);
    expect(amortizeDebt(p.debts[0])).toMatchObject({ months: 0, interest: 0, paidOff: true });
    expect(projectCashFlow({ asOf: '2026-11-04', opening: 0, income: 100, expenses: 0, investment: 0, premiums: 0, debts: p.debts })[0]).toMatchObject({ debtPayment: 0, interest: 0, surplus: 100 });
  });
  it('saves interest by parking surplus in the OD account and draws on it for deficits', () => {
    const debts = [{ id: 'a', name: 'Home', balance: 1000000, annualRate: 12, payment: 20000, parked: 0, isOd: true }];
    const flow = { asOf: '2026-11-04', opening: 0, income: 120000, expenses: 0, investment: 0, premiums: 0, debts };
    const kept = projectCashFlow(flow), swept = projectCashFlow({ ...flow, sweepToOd: true });
    expect(swept[0].parked).toBe(100000 - kept[0].interest + swept[0].interest);
    expect(swept[0].closing).toBe(0);
    expect(swept[11].interest).toBeLessThan(kept[11].interest);
    const deficit = projectCashFlow({ ...flow, income: 0, opening: 5000, debts: [{ ...debts[0], payment: 20000, parked: 15000 }], sweepToOd: true });
    expect(deficit[0]).toMatchObject({ parked: 0, closing: 0 });
  });
  it('requires sufficient history and rejects missing or nonpositive prices', () => {
    expect(marketProjection([{ date: '2026-01-01', value: 100 }])).toBeNull();
    const points = Array.from({ length: 30 }, (_, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, value: 100 }));
    const result = marketProjection([...points, { date: '2026-02-01', value: 0 }])!;
    expect(result.observations).toBe(30);
    expect(result.annualVolatility).toBe(0);
    expect(result.horizons[0]).toMatchObject({ central: 100, low: 100, high: 100 });
    expect(result.ma50).toBeNull();
  });
});

describe('insurance as a yearly expense', () => {
  it('builds a schedule from each policy, paid in the month it falls due', () => {
    const p = planningSnapshot([
      { id: 't', module_key: 'insurance', data: { security_name: 'Term', category: 'Term Plan', status: 'Active', premium_amount: 24000, premium_frequency: 'Yearly', premium_due_date: '2027-01-15', policy_start_date: '2020-01-15', policy_end_date: '2050-01-15' } },
      { id: 'h', module_key: 'insurance', data: { security_name: 'Health', category: 'Health Insurance', status: 'Active', premium_amount: 3000, premium_frequency: 'Quarterly', premium_due_date: '2026-12-01', policy_start_date: '2024-12-01', policy_end_date: '2040-12-01' } },
    ], '2026-11-10');
    expect(p.annualPremium).toBe(36000);
    expect(p.premiumSchedule).toEqual([
      { id: 't', name: 'Term', amount: 24000, everyMonths: 12, dueMonth: 1 },
      { id: 'h', name: 'Health', amount: 3000, everyMonths: 3, dueMonth: 12 },
    ]);
    expect(premiumsDueIn(p.premiumSchedule, '2027-01')).toBe(24000);
    expect(premiumsDueIn(p.premiumSchedule, '2027-03')).toBe(3000);
    expect(premiumsDueIn(p.premiumSchedule, '2026-12')).toBe(3000);
    expect(premiumsDueIn(p.premiumSchedule, '2027-02')).toBe(0);
  });

  it('charges the yearly total in due months, scaled when the total is edited', () => {
    const premiumSchedule = [{ name: 'Term', amount: 24000, everyMonths: 12, dueMonth: 1 }];
    const flow = { asOf: '2026-11-10', opening: 0, income: 50000, expenses: 0, investment: 0, debts: [], premiumSchedule };
    const points = projectCashFlow({ ...flow, premiums: 24000 });
    expect(points.map(p => p.premiums)).toEqual([0, 24000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(points[1]).toMatchObject({ month: '2027-01', surplus: 26000 });
    expect(projectCashFlow({ ...flow, premiums: 12000 })[1].premiums).toBe(12000);
    // No policies saved: a yearly amount typed in is spread evenly.
    expect(projectCashFlow({ ...flow, premiumSchedule: [], premiums: 12000 })[0].premiums).toBe(1000);
  });
});
