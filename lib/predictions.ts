import { isCashAtHome, isDividendIncome, isEarningRent, isOverdraftLoan, isRentedProperty, isSavingsAccount, occupiedShareOfMonth, num } from './calculations';
import { loansOf } from './plan/loans';
import { odPosition } from './plan/od';
import { isPaidFromPayroll } from './plan/contributions';
import { cardEstimate } from './plan/cards';
import { calculateInsurance, normalizeInsurancePolicy } from './insurance';
import { dividendsMonthlyAverage } from './dividends';
import { monthlyDirectExpenses } from './expenses';
import { isCardRow, monthlyRegularTotal, recurringPayments } from './monthlyPayments';
import { employmentOf } from './employment';

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, Number.isFinite(value) ? value : low));
export const indiaDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (name: string) => parts.find(p => p.type === name)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};
const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
export type PlanningRecord = { id: string; module_key: string; data: Record<string, any> };
/** One policy's premiums: `amount` every `everyMonths` months, first due in calendar month `dueMonth` (1-12), or spread evenly when the due date is unknown. */
export type PremiumDue = { id?: string; name: string; amount: number; everyMonths: number; dueMonth: number | null };
const PAYMENTS_PER_YEAR: Record<string, number> = { Monthly: 12, Quarterly: 4, 'Half-yearly': 2, Yearly: 1, Single: 1 };

/** Premium falling due in a calendar month ('YYYY-MM'). Policies with no due date are spread over the year. */
export function premiumsDueIn(schedule: PremiumDue[], month: string) {
  const m = Number(month.slice(5, 7));
  return schedule.reduce((sum, p) => {
    if (p.dueMonth === null) return sum + p.amount * (12 / p.everyMonths) / 12;
    return sum + ((((m - p.dueMonth) % p.everyMonths) + p.everyMonths) % p.everyMonths === 0 ? p.amount : 0);
  }, 0);
}
export type DebtInput = { id: string; name: string; balance: number; annualRate: number; payment: number; parked?: number; isOd?: boolean };

export function monthlyPayment(balance: number, annualRate: number, months: number) {
  if (balance <= 0 || months <= 0) return 0;
  const rate = Math.max(0, annualRate) / 1200;
  return rate ? balance * rate / (1 - Math.pow(1 + rate, -months)) : balance / months;
}

export function planningSnapshot(records: PlanningRecord[], asOf = indiaDate()) {
  let monthlySalary = 0, monthlyRent = 0, monthlyDividend = 0, savingsBalance = 0, cashAtHome = 0, odParked = 0, monthlyInvestment = 0, monthlyPayrollInvestment = 0, monthlyPremium = 0;
  const debts: DebtInput[] = [], warnings: string[] = [], rentals: Record<string, any>[] = [], premiumSchedule: PremiumDue[] = [], salaryEnds: { id: string; month: string; amount: number }[] = [];
  const propertyIds = new Set(records.filter(r => r.module_key === 'property').map(r => r.id));
  for (const record of records) {
    const d = record.data || {}, category = String(d.category || '').toLowerCase();
    if (record.module_key === 'fixedIncome' && isSavingsAccount(d)) {
      savingsBalance += Math.max(0, num(d.current_value_today));
    } else if (record.module_key === 'fixedIncome' && isCashAtHome(d)) {
      cashAtHome += Math.max(0, num(d.current_value_today));
    } else if (record.module_key === 'fixedIncome' && isDividendIncome(d)) {
      monthlyDividend += Math.max(0, num(d.employee_contribution));
    } else if (record.module_key === 'fixedIncome' && /^(salary|rental\s*income)$/.test(category)) {
      // Rent on a saved property is counted from the property itself, so its linked income row is skipped.
      if (category === 'salary') {
        // A salary counts while the person is employed, and stops after the day they plan to stop working.
        const job = employmentOf(record, asOf), amount = Math.max(0, num(d.employee_contribution));
        if (job.employed) { monthlySalary += amount; if (job.endDate) salaryEnds.push({ id: record.id, month: job.endDate.slice(0, 7), amount }); }
      }
      else if (!propertyIds.has(d.linked_property_id)) monthlyRent += Math.max(0, num(d.employee_contribution));
    } else if (['fixedIncome', 'stocks', 'mutualFunds', 'ulips', 'bullion', 'otherAssets'].includes(record.module_key)) {
      const amount = Math.max(0, num(d.monthly_contribution) || num(d.sip_amount) || num(d.monthly_investment) || (record.module_key === 'fixedIncome' ? num(d.employee_contribution) + num(d.company_contribution) + num(d.yearly_investment) / 12 : num(d.monthly_premium)));
      // Payroll contributions (Company PF, EPF) come out before take-home pay, so they are not taken from cash again (R5).
      if (record.module_key === 'fixedIncome' && isPaidFromPayroll(d)) monthlyPayrollInvestment += amount;
      else monthlyInvestment += amount;
    }
    if (record.module_key === 'property' && isRentedProperty(d)) {
      rentals.push(d);
      if (isEarningRent(d, asOf)) monthlyRent += Math.max(0, num(d.monthly_rent));
    }
    if (record.module_key === 'insurance') {
      const policy = calculateInsurance(d, new Date(`${asOf}T12:00:00`));
      if (policy.premiumStatus === 'PAYING' && !/^(closed|lapsed|paid-up|matured)$/i.test(String(d.status || ''))) {
        monthlyPremium += policy.annualPremium / 12;
        const perYear = PAYMENTS_PER_YEAR[normalizeInsurancePolicy(d).premium_frequency] || 1, due = String(policy.nextPremiumDueDate || '');
        if (policy.annualPremium > 0) premiumSchedule.push({ id: record.id, name: String(d.security_name || d.policy_name || 'Policy'), amount: policy.annualPremium / perYear, everyMonths: 12 / perYear, dueMonth: validDate(due) ? Number(due.slice(5, 7)) : null });
      }
    }
    if (['loans', 'property'].includes(record.module_key) && isOverdraftLoan(d)) odParked += Math.max(0, num(d.od_parked_balance));
  }
  // Loans come from the one loan list (R2), so every screen sees the same loans, balances and EMIs.
  for (const loan of loansOf(records, asOf)) {
    debts.push({ id: loan.id, name: loan.name, balance: loan.balance, annualRate: loan.annualRate, payment: loan.emi, parked: loan.parked, isOd: loan.isOd });
    if (!loan.emi && loan.parked < loan.balance) warnings.push(`${loan.name}: enter a monthly payment to estimate payoff.`);
  }
  const monthlyEmi = debts.reduce((sum, debt) => sum + debt.payment, 0);
  // Dividends confirmed as received in the last 12 months, as a monthly average (R5), count alongside any average entered by hand.
  monthlyDividend += dividendsMonthlyAverage(records, asOf);
  const monthlyIncome = monthlySalary + monthlyRent + monthlyDividend;
  const monthlyRegular = monthlyRegularTotal(recurringPayments(records));
  // R6: card bills are left out of regular payments; card spending is estimated from past bills instead.
  const card = cardEstimate(records, asOf), monthlyCardEstimate = card.monthly;
  if (recurringPayments(records).some(isCardRow)) {
    if (!card.months) warnings.push('No card spending recorded in the last 6 months, so card spending is left out of cash flow. Mark card bills paid on the Payments screen to build an estimate.');
    else if (card.rough) warnings.push(`Card spending is a rough estimate from only ${card.months} month${card.months === 1 ? '' : 's'} of bills.`);
  }
  const directExpenses = monthlyDirectExpenses(records, asOf.slice(0, 7));
  // A typical month carries a twelfth of the yearly premiums (R5); the 12-month forecast still takes each premium in its due month.
  const availableCashFlow = monthlyIncome - monthlyEmi - monthlyInvestment - monthlyRegular - monthlyCardEstimate - directExpenses - monthlyPremium;
  // R3: OD money above a loan's balance is your own cash; money up to the balance can be redrawn but adds
  // to the loan if used. The two are shown side by side and never added into one headline.
  const od = odPosition(records, asOf);
  const cashNow = savingsBalance + cashAtHome + od.spare, canRedraw = od.canRedraw;
  return { monthlyDirectExpenses: directExpenses, monthlyRegular, rentals, monthlySalary, monthlyRent, monthlyDividend, savingsBalance, cashAtHome, odParked, odSpare: od.spare, odAccounts: od.accounts, cashNow, canRedraw, liquidity: savingsBalance + cashAtHome + odParked, monthlyIncome, monthlyEmi, availableCashFlow, monthlyCardEstimate, cardMonths: card.months, cardRough: card.rough, monthlyInvestment, monthlyPayrollInvestment, monthlyPremium, annualPremium: monthlyPremium * 12, premiumSchedule, salaryEnds, debts, warnings };
}

export function projectWealth(input: { starting: number; years: number; annualReturn: number; inflation: number; monthly: number; annualStepUp: number; contributionYears: number; retirementMonthly: number }) {
  const years = Math.round(clamp(input.years, 1, 40)), rate = clamp(input.annualReturn, -50, 40) / 100;
  const monthlyRate = Math.pow(1 + rate, 1 / 12) - 1, inflation = clamp(input.inflation, 0, 20) / 100;
  let value = num(input.starting), contributed = 0, withdrawn = 0, depletedAt: number | null = value <= 0 ? 0 : null;
  const points = [{ year: 0, nominal: value, real: value, contributed, withdrawn }];
  const cutoff = Math.round(clamp(input.contributionYears, 0, years) * 12);
  for (let month = 1; month <= years * 12; month++) {
    // Negative net worth is held as debt; it does not earn investment returns.
    if (value > 0) value *= 1 + monthlyRate;
    const contribution = month <= cutoff ? Math.max(0, num(input.monthly)) * Math.pow(1 + clamp(input.annualStepUp, 0, 30) / 100, Math.floor((month - 1) / 12)) : 0;
    const withdrawal = month > cutoff ? Math.max(0, num(input.retirementMonthly)) * Math.pow(1 + inflation, month / 12) : 0;
    value += contribution - withdrawal;
    contributed += contribution; withdrawn += withdrawal;
    if (value <= 0 && depletedAt === null) depletedAt = month / 12;
    if (month % 12 === 0) points.push({ year: month / 12, nominal: value, real: value / Math.pow(1 + inflation, month / 12), contributed, withdrawn });
  }
  return { points, final: points[points.length - 1], depletedAt };
}

export function goalForecast(input: { current: number; target: number; targetDate: string; monthly: number; annualReturn: number; asOf?: string }) {
  const today = input.asOf || indiaDate();
  if (!validDate(input.targetDate) || !validDate(today) || num(input.target) <= 0) return null;
  const [year, month, day] = today.split('-').map(Number), [targetYear, targetMonth, targetDay] = input.targetDate.split('-').map(Number);
  const months = Math.max(0, (targetYear - year) * 12 + targetMonth - month + (targetDay > day ? 1 : 0));
  if (months > 1200) return null;
  const rate = Math.pow(1 + clamp(input.annualReturn, -50, 40) / 100, 1 / 12) - 1;
  const growth = Math.pow(1 + rate, months), annuity = rate ? (growth - 1) / rate : months;
  const target = Math.max(0, num(input.target)), current = Math.max(0, num(input.current));
  const required = months ? Math.max(0, (target - current * growth) / annuity) : 0;
  const projected = current * growth + Math.max(0, num(input.monthly)) * annuity;
  return { months, required, projected, gap: Math.max(0, target - projected), funded: projected >= target, overdue: months === 0 && current < target };
}

export function amortizeDebt(debt: DebtInput, extra = 0) {
  // Only the balance not covered by parked OD savings has to be repaid.
  let balance = Math.max(0, num(debt.balance) - Math.max(0, num(debt.parked))), interest = 0;
  const payment = Math.max(0, num(debt.payment)) + Math.max(0, num(extra)), rate = clamp(debt.annualRate, 0, 100) / 1200;
  if (!balance) return { months: 0, interest: 0, paidOff: true };
  if (payment <= balance * rate || !payment) return { months: null, interest: 0, paidOff: false };
  for (let month = 1; month <= 600; month++) {
    const charge = balance * rate;
    interest += charge; balance = Math.max(0, balance + charge - payment);
    if (balance < 0.005) return { months: month, interest, paidOff: true };
  }
  return { months: null, interest, paidOff: false };
}

export function projectCashFlow(input: { opening: number; income: number; expenses: number; investment: number; premiums: number; premiumSchedule?: PremiumDue[]; incomeEnds?: { month: string; amount: number }[]; debts: DebtInput[]; extraDebtId?: string; extraPayment?: number; sweepToOd?: boolean; rentals?: Record<string, any>[]; asOf?: string }) {
  const date = input.asOf || indiaDate(), [year, month] = date.split('-').map(Number);
  let cash = num(input.opening);
  const balances = input.debts.map(d => Math.max(0, d.balance)), parked = input.debts.map(d => Math.max(0, num(d.parked)));
  const sweepIndex = input.sweepToOd ? input.debts.findIndex(d => d.isOd) : -1;
  return Array.from({ length: 12 }, (_, index) => {
    let debtPayment = 0, interest = 0;
    input.debts.forEach((debt, i) => {
      const charge = Math.max(0, balances[i] - parked[i]) * clamp(debt.annualRate, 0, 100) / 1200;
      const planned = Math.max(0, debt.payment) + (debt.id === input.extraDebtId ? Math.max(0, input.extraPayment || 0) : 0);
      const payment = Math.min(Math.max(0, balances[i] - parked[i]) + charge, planned);
      balances[i] += charge - payment; debtPayment += payment; interest += charge;
    });
    const label = new Date(Date.UTC(year, month + index, 1)).toISOString().slice(0, 7);
    // Income reflects today's lettings, so adjust it for vacancies that start or end during the forecast.
    const rentChange = (input.rentals || []).reduce((sum, rental) => sum + Math.max(0, num(rental.monthly_rent)) * (occupiedShareOfMonth(rental, label) - (isEarningRent(rental, date) ? 1 : 0)), 0);
    // A salary is paid for its last month, then stops.
    const ended = (input.incomeEnds || []).reduce((sum, end) => sum + (label > end.month ? Math.max(0, end.amount) : 0), 0);
    const income = Math.max(0, Math.max(0, input.income) + rentChange - ended);
    // With a schedule, `premiums` is the yearly total and each policy is paid in its due month; otherwise it is a monthly amount.
    const schedule = input.premiumSchedule, scheduledYear = schedule ? schedule.reduce((sum, p) => sum + p.amount * (12 / p.everyMonths), 0) : 0;
    const premiums = !schedule ? Math.max(0, input.premiums) : scheduledYear > 0 ? premiumsDueIn(schedule, label) * Math.max(0, input.premiums) / scheduledYear : Math.max(0, input.premiums) / 12;
    const surplus = income - Math.max(0, input.expenses) - Math.max(0, input.investment) - premiums - debtPayment;
    if (sweepIndex >= 0 && surplus > 0) parked[sweepIndex] += surplus;
    else cash += surplus;
    // Parked OD money is available cash: a shortfall draws on it once other cash runs out.
    for (let i = 0; i < parked.length && cash < 0; i++) {
      const drawn = Math.min(parked[i], -cash);
      parked[i] -= drawn; cash += drawn;
    }
    const parkedTotal = parked.reduce((sum, value) => sum + value, 0);
    return { month: label, income, premiums, debtPayment, interest, surplus, closing: cash, parked: parkedTotal, liquidity: cash + parkedTotal };
  });
}

export type HistoryPoint = { date: string; value: number };
export function marketProjection(input: HistoryPoint[]) {
  const points = [...new Map(input.filter(p => validDate(p.date) && Number.isFinite(p.value) && p.value > 0).map(p => [p.date, p])).values()].sort((a, b) => a.date.localeCompare(b.date));
  if (points.length < 20) return null;
  const prices = points.map(p => p.value), last = prices[prices.length - 1];
  const returns = prices.slice(1).map((p, i) => Math.log(p / prices[i]));
  const drift = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - drift, 2), 0) / Math.max(1, returns.length - 1);
  const volatility = Math.sqrt(variance);
  let peak = prices[0], drawdown = 0;
  prices.forEach(price => { peak = Math.max(peak, price); drawdown = Math.min(drawdown, price / peak - 1); });
  const average = (n: number) => prices.slice(-n).reduce((s, p) => s + p, 0) / Math.min(n, prices.length);
  return { points, last, asOf: points[points.length - 1].date, observations: points.length, annualVolatility: volatility * Math.sqrt(252) * 100, drawdown: drawdown * 100, ma20: average(20), ma50: prices.length >= 50 ? average(50) : null,
    horizons: [5, 22, 66].map(days => ({ days, central: last * Math.exp(clamp(drift * days, -2, 2)), low: last * Math.exp(clamp(drift * days - volatility * Math.sqrt(days), -4, 4)), high: last * Math.exp(clamp(drift * days + volatility * Math.sqrt(days), -4, 4)) })) };
}
