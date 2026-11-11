// How each screen works out its figures TODAY, reproduced from the component code with the
// same lib functions, so the agreement tests can compare one screen with another.
// Test-only. Delete with the superseded screen code in task 2.5 of the plan-engine brief.
//
// Sources (find by name; line numbers drift):
//   home()    AssetManagerApp.tsx homeTiles(): Loans tile, planningSnapshot cash flow and liquidity
//   planner() PredictivePlanner.tsx: OD spare cash, sourceTotal, monthlyAvailable, goalRows, NumberField values
//   goals()   AssetManagerApp.tsx goalFundingNow() + goalProjection() + goalStatus()
// Live prices are taken from the records themselves (live_price, latest_value); computeLiveRecord
// only differs from computeRecord when a live bullion quote is loaded, which the fixture has none of.
import { calculateIndianGratuity, computeRecord, computeTotals, num } from "../../calculations";
import { employmentFor, isEmploymentLinked, monthsUntilDate } from "../../employment";
import { cleanSources, goalFunding, isPrimaryResidence, type Holding } from "../../goals";
import { cleanPlanned, DEFAULT_GROWTH, holdingGrowth, holdingMonthly, plannedItems, projectGoal, type GrowthRates, type ProjectionItem } from "../../goalProjection";
import { insuranceKind } from "../../insurance";
import { pickedIds, pickedTotal, plannerSources, type CashField, type SourcePicks } from "../../plannerSources";
import { goalForecast, planningSnapshot, type PlanningRecord } from "../../predictions";
import { loansOf } from "../loans";
import { livedInHomes } from "../home";
import { DEFAULT_PLAN_SETTINGS, type PlanSettings } from "../settings";

const GOAL_ASSET_KEYS = ["fixedIncome", "stocks", "mutualFunds", "bullion", "property", "ulips", "nsel", "otherAssets", "insurance"];

/** Home screen: Loans tile, cash-flow details and "This month's cash". */
export function home(records: PlanningRecord[], asOf: string, picks: SourcePicks = {}) {
  const snapshot = planningSnapshot(records, asOf, picks);
  const loanRows = loansOf(records, asOf);
  return {
    loanCount: loanRows.length,
    emis: loanRows.reduce((s, l) => s + l.emi, 0),
    owed: loanRows.reduce((s, l) => s + l.netBalance, 0),
    surplus: snapshot.availableCashFlow,
    cashFlowEmis: snapshot.monthlyEmi,
    cashNow: snapshot.cashNow,
    canRedraw: snapshot.canRedraw,
    netWorth: computeTotals(records).net,
  };
}

/** Predictive Planner, with no boxes typed over (each box at its prefilled value). */
export function planner(records: PlanningRecord[], asOf: string, picks: SourcePicks = {}, goalCurrent: Record<string, { value: number }> = {}, annualReturn = 8) {
  const snapshot = planningSnapshot(records, asOf, picks);
  const spareOdCash = snapshot.odSpare;
  const baseSources = plannerSources(records, asOf);
  const sources = { ...baseSources, cash: [...baseSources.cash, ...(spareOdCash > 0 ? [{ id: "spare-od-cash", label: "Spare money in OD accounts (above the loan balance)", group: "Savings and cash", value: spareOdCash, defaultOn: true }] : [])] };
  const sourceTotal = (field: CashField) => pickedTotal(sources[field], picks[field]);
  const income = sourceTotal("income"), expenses = sourceTotal("expenses");
  const investing = sourceTotal("investment");
  const premiums = sourceTotal("insurance");
  const emis = snapshot.debts.reduce((sum, d) => sum + d.payment, 0);
  const goals = records.filter((r) => r.module_key === "goals").map((r) => {
    const linked = goalCurrent[r.id], current = linked ? linked.value : num(r.data.current_value);
    const committed = Math.max(0, num(r.data.monthly_contribution));
    return { id: r.id, current, forecast: goalForecast({ current, target: num(r.data.target_amount), targetDate: String(r.data.target_date || ""), monthly: committed, annualReturn, asOf }) };
  });
  return {
    loanCount: snapshot.debts.length,
    emis,
    surplus: income - emis - investing - expenses - premiums / 12,
    spareOdCash,
    openingCash: sourceTotal("cash"),
    goals,
    extraNeeded: goals.reduce((s, g) => s + (g.forecast?.required || 0), 0),
    // What each Cash flow box displays, next to what the calculation uses.
    boxes: {
      cash: { shown: sourceTotal("cash"), used: sourceTotal("cash") },
      income: { shown: income, used: income },
      expenses: { shown: expenses, used: expenses },
      investing: { shown: investing, used: investing },
      premiums: { shown: premiums, used: premiums },
    },
    picked: (field: CashField) => pickedIds(sources[field], picks[field]),
  };
}

/** Goals screen: funding today and the projection to each goal's date. */
export function goals(records: PlanningRecord[], asOf: string, asOfInstant: Date, rates: GrowthRates = DEFAULT_GROWTH, settings: PlanSettings = DEFAULT_PLAN_SETTINGS) {
  const home = livedInHomes(records, settings), countsAgainstGoals = (r: PlanningRecord) => settings.homeLoanAgainstPlan || !home.ids.has(r.id);
  const homeRecords = records.filter((r) => r.module_key === "property" && isPrimaryResidence(r.data));
  const homeValue = homeRecords.reduce((s, r) => s + num(computeRecord("property", r.data).latest), 0);
  const holdings: (Holding & { gross: number })[] = GOAL_ASSET_KEYS.flatMap((k) =>
    records
      .filter((r) => r.module_key === k && !(k === "property" && isPrimaryResidence(r.data)) && !(k === "insurance" && insuranceKind(r.data) === "protection"))
      .map((r) => {
        const gross = num(computeRecord(k, r.data).latest);
        if (k !== "property") return { id: r.id, moduleKey: k, label: r.id, value: gross, gross };
        const c = computeRecord("property", r.data);
        return { id: r.id, moduleKey: k, label: r.id, value: Math.max(0, num(c.realised_value)), gross };
      }),
  );
  const assetClasses = [...GOAL_ASSET_KEYS.map((k) => ({ key: k, label: k, value: holdings.filter((h) => h.moduleKey === k).reduce((s, h) => s + h.gross, 0) })), { key: "odSpare", label: "odSpare", value: records.filter((r) => r.module_key === "property" || r.module_key === "loans").reduce((s, r) => s + num(computeRecord(r.module_key, r.data).od_spare), 0) }];
  const sumBalance = (k: string) => records.filter((r) => r.module_key === k).reduce((s, r) => s + num(computeRecord(k, r.data).balance), 0);
  const propertyLoans = records.filter((r) => r.module_key === "property" && countsAgainstGoals(r)).map((r) => computeRecord("property", r.data)).filter((r) => num(r.loan_balance) > 0).reduce((s, r) => s + num(r.net_loan_balance), 0);
  const liabilityClasses = [
    { key: "loans", label: "Loans", value: sumBalance("loans") },
    { key: "propertyLoans", label: "Property loans", value: propertyLoans },
    { key: "borrowings", label: "Borrowings", value: sumBalance("borrowings") },
    { key: "builders", label: "Still to pay builders", value: records.filter((r) => r.module_key === "property" && countsAgainstGoals(r)).reduce((t, r) => t + num(computeRecord("property", r.data).construction_owed), 0) },
  ];
  const goalInputs = records.filter((r) => r.module_key === "goals").map((r) => ({
    id: r.id, name: String(r.data?.security_name || "Goal"), target: num(r.data?.target_amount),
    targetDate: r.data?.target_date ? String(r.data.target_date) : undefined, priority: r.data?.priority ? String(r.data.priority) : undefined,
    sources: cleanSources(r.data?.funding_sources),
  }));
  const protectionValue = records.filter((r) => r.module_key === "insurance" && insuranceKind(r.data) === "protection").reduce((t, r) => t + num(computeRecord("insurance", r.data).latest), 0);
  const f = goalFunding(assetClasses, liabilityClasses, goalInputs, asOfInstant, holdings);

  const itemFor = (h: Holding & { gross: number }, targetDate?: string): ProjectionItem => {
    const data = records.find((r) => r.id === h.id)?.data || {}, growth = holdingGrowth(h.moduleKey, data, rates);
    const item: ProjectionItem = { id: h.id, label: h.label, today: h.gross, deduct: h.gross - h.value, monthly: holdingMonthly(h.moduleKey, data), rate: growth.rate, basis: growth.basis };
    const linked = h.moduleKey === "fixedIncome" && isEmploymentLinked({ id: h.id, module_key: h.moduleKey, data });
    const job = linked ? employmentFor(records, String(data.account_name || ""), asOf) : null;
    if (job) {
      if (/gratuity/i.test(String(data.category || ""))) {
        const until = [job.endDate, targetDate].filter((d): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()[0];
        if (data.purchase_date && num(data.monthly_basic_salary) > 0 && until) {
          const at = calculateIndianGratuity({ dateOfJoining: data.purchase_date, calculationDate: until, monthlyBasicSalary: data.monthly_basic_salary, monthlyDA: data.monthly_da, coveredUnderAct: data.covered_under_gratuity_act });
          return { ...item, monthly: 0, fixedAtTarget: num(at.totalGratuity), rate: 0 };
        }
        return { ...item, monthly: 0, rate: 0 };
      }
      return { ...item, payMonths: job.employed ? monthsUntilDate(job.endDate, asOf) : 0 };
    }
    return item;
  };
  const rows = f.goals.map((g) => {
    const own = holdings.filter((h) => g.holdingIds.includes(h.id));
    let p = null as ReturnType<typeof projectGoal> | null;
    if (g.target && g.monthsLeft !== null) {
      let items: ProjectionItem[];
      if (g.funding === "selected") items = own.map((h) => itemFor(h, g.targetDate)).filter((i) => i.today - (i.deduct || 0) > 0 || i.monthly > 0);
      else {
        const pool = holdings.filter((h) => f.unclaimedIds.includes(h.id) && h.value > 0).map((h) => itemFor(h, g.targetDate));
        const weight = pool.reduce((t, i) => t + i.today - (i.deduct || 0), 0);
        const rate = weight > 0 ? pool.reduce((t, i) => t + i.rate * (i.today - (i.deduct || 0)), 0) / weight : 0;
        items = g.allocated > 0 ? [{ id: "shared", label: "shared", today: g.allocated, monthly: 0, rate, basis: "" }] : [];
      }
      items = [...items, ...plannedItems(cleanPlanned(records.find((r) => r.id === g.id)?.data?.planned_investments), rates)];
      p = projectGoal({ target: g.target, months: g.monthsLeft, items });
    }
    const share = p && g.target ? p.projected / g.target : 0;
    const status = !p ? "undated" : share >= 1 ? "on" : share >= 0.8 ? "close" : "off";
    return { id: g.id, target: g.target, months: g.monthsLeft, shownToday: g.value, holdingsToday: own.reduce((s, h) => s + h.value, 0), funding: g.funding, holdingIds: g.holdingIds, p, status };
  });
  return {
    netAvailable: f.netAvailable,
    homeValue,
    homeLoan: home.loan,
    protectionValue,
    goals: rows,
    /** What the Goals page hands the Planner as each goal's value today. */
    current: Object.fromEntries(f.goals.map((g) => [g.id, { value: g.value }])),
    extraNeeded: rows.reduce((s, g) => s + (g.p?.monthlyNeeded || 0), 0),
    /** The Home goals tile: every projection added together over every target. */
    homeTilePct: rows.reduce((s, g) => s + g.target, 0) ? (rows.reduce((s, g) => s + (g.p?.projected || 0), 0) / rows.reduce((s, g) => s + g.target, 0)) * 100 : 0,
  };
}

