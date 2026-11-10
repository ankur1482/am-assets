"use client";

import { useEffect, useId, useRef, useState } from 'react';
import OneRowTabs, { usePhoneTabs } from '@/components/OneRowTabs';
import { Activity, Download, Flag, TrendingUp, Wallet } from 'lucide-react';
import { fmt, formatDate, formatMonth, num } from '@/lib/calculations';
import { pickedIds, pickedTotal, plannerSources, type CashField, type SourceItem, type SourcePicks } from '@/lib/plannerSources';
import { amortizeDebt, goalForecast, indiaDate, marketProjection, planningSnapshot, projectCashFlow, projectWealth, type DebtInput, type HistoryPoint, type PlanningRecord } from '@/lib/predictions';

export type ForecastTab = 'wealth' | 'goals' | 'cash' | 'market';
/** goalCurrent: each goal's value today, worked out on the Goals page from the holdings chosen for it (or its share of net worth). */
type Props = { records: PlanningRecord[]; netWorth: number; accessToken: string; initialTab?: ForecastTab; goalCurrent?: Record<string, { value: number; funding: 'selected' | 'shared' }>; homeValue?: number; protectionValue?: number; picks?: SourcePicks; onPicksChange?: (picks: SourcePicks) => void };
const tabs = [{ id: 'wealth', title: 'Wealth & retirement', short: 'Wealth', icon: TrendingUp }, { id: 'goals', title: 'Goal readiness', short: 'Goals', icon: Flag }, { id: 'cash', title: 'Cash flow & loans', short: 'Cash & loans', icon: Wallet }, { id: 'market', title: 'Market trends', short: 'Market', icon: Activity }] as const;

function NumberField({ label, value, onChange, min = 0, max = 1e15, step = 'any', hint }: { label: string; value: string; onChange: (v: string) => void; min?: number; max?: number; step?: string; hint?: string }) {
  const id = useId();
  return <div className="forecast-field"><label htmlFor={id}>{label}</label><input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={value} onChange={e => onChange(e.target.value)} onBlur={() => { if (value !== '') onChange(String(Math.min(max, Math.max(min, num(value))))); }} />{hint && <small>{hint}</small>}</div>;
}

/** A dropdown of the records a Cash flow box adds up; ticking one recomputes the box. */
function SourcePicker({ items, picked, unit, onChange }: { items: SourceItem[]; picked: string[]; unit: string; onChange: (ids: string[]) => void }) {
  if (!items.length) return null;
  const groups = [...new Set(items.map(i => i.group))];
  return <details className="relative mt-1 text-xs">
    <summary className="cursor-pointer select-none rounded-lg border border-[#d9e2ec] bg-white px-2 py-1 font-semibold text-[#0071e3]">Choose from your records ({picked.length} of {items.length})</summary>
    <div className="absolute left-0 z-20 mt-1 max-h-80 w-[min(22rem,calc(100vw-2rem))] overflow-auto rounded-xl border border-[#d9e2ec] bg-white p-2 shadow-lg">
      {groups.map(g => <fieldset key={g} className="mb-2"><legend className="px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">{g}</legend>
        {items.filter(i => i.group === g).map(i => <label key={i.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-1 hover:bg-[#f3f7fb]">
          <input type="checkbox" className="mt-0.5" checked={picked.includes(i.id)} onChange={() => onChange(picked.includes(i.id) ? picked.filter(x => x !== i.id) : [...picked, i.id])} />
          <span className="flex-1">{i.label}</span><span className="tabular-nums text-gray-600">{fmt(i.value)}{unit}</span>
        </label>)}
      </fieldset>)}
    </div>
  </details>;
}
function Stat({ label, value, note, danger = false }: { label: string; value: string; note?: string; danger?: boolean }) {
  return <div className={`forecast-stat ${danger ? 'forecast-danger' : ''}`}><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>;
}

function ScenarioChart({ scenarios, real }: { scenarios: { name: string; color: string; points: { year: number; nominal: number; real: number }[] }[]; real: boolean }) {
  const values = scenarios.flatMap(s => s.points.map(p => real ? p.real : p.nominal));
  const low = Math.min(0, ...values), high = Math.max(1, ...values), span = high - low;
  const x = (year: number) => 85 + year / Math.max(1, scenarios[0].points.length - 1) * 690;
  const y = (value: number) => 245 - (value - low) / span * 215;
  return <><div className="forecast-chart"><svg viewBox="0 0 800 285" role="img" aria-label={`Lower, base and higher return wealth scenarios, ${real ? 'in today’s purchasing power' : 'in future rupees'}`}>
    {[0, 0.25, 0.5, 0.75, 1].map(f => <g key={f}><line x1="85" x2="775" y1={y(low + span * f)} y2={y(low + span * f)} stroke="#e2e8f0" /><text x="78" y={y(low + span * f) + 4} textAnchor="end" fill="#64748b" fontSize="11">{compactMoney(low + span * f)}</text></g>)}
    {scenarios.map(s => <polyline key={s.name} points={s.points.map(p => `${x(p.year)},${y(real ? p.real : p.nominal)}`).join(' ')} fill="none" stroke={s.color} strokeWidth="3" strokeDasharray={s.name === 'Base' ? undefined : '7 5'} />)}
    {[0, Math.floor((scenarios[0].points.length - 1) / 2), scenarios[0].points.length - 1].map((year, i) => <text key={i} x={x(year)} y="270" textAnchor="middle" fill="#64748b" fontSize="12">{year === 0 ? 'Today' : `Year ${year}`}</text>)}
  </svg></div><div className="forecast-legend">{scenarios.map(s => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}</div></>;
}

/** The same loan as if nothing were parked against it, when that loan can be paid off at all. */
function payoff0(debt: DebtInput) {
  const result = amortizeDebt({ ...debt, parked: 0 });
  return result.paidOff ? result : null;
}

function compactMoney(value: number) {
  const abs = Math.abs(value), unit = abs >= 1e7 ? 1e7 : abs >= 1e5 ? 1e5 : abs >= 1e3 ? 1e3 : 1;
  return `${value < 0 ? '-' : ''}₹${(abs / unit).toFixed(unit === 1 ? 0 : 1)}${unit === 1e7 ? 'Cr' : unit === 1e5 ? 'L' : unit === 1e3 ? 'K' : ''}`;
}

export default function PredictivePlanner({ records, netWorth, accessToken, initialTab = 'wealth', goalCurrent = {}, homeValue = 0, protectionValue = 0, picks = {}, onPicksChange }: Props) {
  const snapshot = planningSnapshot(records);
  // Money parked in an OD account beyond what its loan needs is ordinary spendable cash, so it is
  // one of the tickable cash items rather than being added on silently.
  const spareOdCash = Math.max(0, snapshot.odParked - snapshot.debts.reduce((sum, d) => sum + (d.parked || 0), 0));
  const baseSources = plannerSources(records, indiaDate());
  const sources = { ...baseSources, cash: [...baseSources.cash, ...(spareOdCash > 0 ? [{ id: 'spare-od-cash', label: 'Spare money parked in OD (above the loan balance)', group: 'Savings and cash', value: spareOdCash, defaultOn: true }] : [])] };
  const picked = (field: CashField) => pickedIds(sources[field], picks[field]), sourceTotal = (field: CashField) => pickedTotal(sources[field], picks[field]);
  // The home you live in for good is never sold for retirement, and term/health cover only pays if
  // something happens, so projections start without either.
  const retirementBase = netWorth - Math.max(0, homeValue) - Math.max(0, protectionValue);
  const [tab, setTab] = useState<ForecastTab>(initialTab);
  const [years, setYears] = useState('20'), [annualReturn, setAnnualReturn] = useState('8'), [spread, setSpread] = useState('4'), [inflation, setInflation] = useState('5');
  const [monthly, setMonthly] = useState(''), [stepUp, setStepUp] = useState('0'), [age, setAge] = useState('35'), [retirementAge, setRetirementAge] = useState('60'), [retirementSpend, setRetirementSpend] = useState('0'), [real, setReal] = useState(false);
  const [goalMonthly, setGoalMonthly] = useState<Record<string, string>>({});
  const [income, setIncome] = useState(''), [expenses, setExpenses] = useState(''), [cash, setCash] = useState(''), [cashInvesting, setCashInvesting] = useState(''), [premiums, setPremiums] = useState(''), [extra, setExtra] = useState('0'), [debtId, setDebtId] = useState('');
  const [payments, setPayments] = useState<Record<string, string>>({}), [sweepToOd, setSweepToOd] = useState(false);
  const [market, setMarket] = useState('shares-history'), [history, setHistory] = useState<HistoryPoint[]>([]), [marketStatus, setMarketStatus] = useState(''), [marketBusy, setMarketBusy] = useState(false), [historyLabel, setHistoryLabel] = useState('');
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  const horizon = Math.round(Math.min(40, Math.max(1, num(years)))), baseRate = Math.min(40, Math.max(-50, num(annualReturn)));
  const inflationRate = Math.min(20, Math.max(0, num(inflation))), scenarioSpread = Math.min(15, Math.max(0, num(spread)));
  const monthlyAmount = monthly === '' ? snapshot.monthlyInvestment : Math.max(0, num(monthly));
  const until = Math.min(horizon, Math.max(0, num(retirementAge) - num(age)));
  const scenarioInputs = { starting: retirementBase, years: horizon, inflation: inflationRate, monthly: monthlyAmount, annualStepUp: num(stepUp), contributionYears: until, retirementMonthly: num(retirementSpend) };
  const scenarios = [{ name: 'Lower', color: '#b45309', rate: Math.max(-50, baseRate - scenarioSpread) }, { name: 'Base', color: '#0071e3', rate: baseRate }, { name: 'Higher', color: '#059669', rate: Math.min(40, baseRate + scenarioSpread) }].map(s => ({ ...s, ...projectWealth({ ...scenarioInputs, annualReturn: s.rate }) }));
  const base = scenarios[1];
  const debtInputs = snapshot.debts.map(d => ({ ...d, payment: payments[d.id] === undefined ? d.payment : Math.max(0, num(payments[d.id])) }));
  const selectedDebt = debtInputs.find(d => d.id === debtId) || debtInputs[0];
  const extraAmount = Math.max(0, num(extra));
  const incomeAmount = income === '' ? sourceTotal('income') : num(income), premiumAmount = premiums === '' ? sourceTotal('insurance') : Math.max(0, num(premiums));
  const pickedPolicies = new Set(picked('insurance')), premiumSchedule = snapshot.premiumSchedule.filter(p => !p.id || pickedPolicies.has(p.id));
  const cashInvestment = cashInvesting === '' ? (picks.investment ? sourceTotal('investment') : monthlyAmount) : num(cashInvesting);
  // Parked funds above a loan's balance do not reduce it, so they count as ordinary spendable cash.
  const defaultCash = sourceTotal('cash');
  const openingCash = cash === '' ? defaultCash : num(cash);
  const expenseAmount = expenses === '' ? sourceTotal('expenses') : num(expenses);
  const cashInputs = { rentals: snapshot.rentals, opening: openingCash, income: incomeAmount, expenses: expenseAmount, investment: cashInvestment, premiums: premiumAmount, premiumSchedule, debts: debtInputs, extraDebtId: selectedDebt?.id, extraPayment: extraAmount };
  const cashPoints = projectCashFlow({ ...cashInputs, sweepToOd });
  const hasOdLoan = debtInputs.some(d => d.isOd), totalInterest = (points: { interest: number }[]) => points.reduce((sum, point) => sum + point.interest, 0);
  const sweepSaving = hasOdLoan ? Math.max(0, totalInterest(projectCashFlow(cashInputs)) - totalInterest(projectCashFlow({ ...cashInputs, sweepToOd: true }))) : 0;
  const parkedInterestSaved = selectedDebt?.parked && payoff0(selectedDebt) ? payoff0(selectedDebt)!.interest - amortizeDebt(selectedDebt).interest : 0;
  const totalEmi = debtInputs.reduce((sum, debt) => sum + debt.payment, 0);
  const shortfall = cashPoints.find(p => p.liquidity < 0), nextPremium = cashPoints.find(p => p.premiums > 0);
  const monthlyAvailable = incomeAmount - totalEmi - cashInvestment - expenseAmount;
  const payoff = selectedDebt ? amortizeDebt(selectedDebt, extraAmount) : null, originalPayoff = selectedDebt ? amortizeDebt(selectedDebt) : null;
  const goalRows = records.filter(r => r.module_key === 'goals').map(r => {
    const committed = Math.max(0, num(goalMonthly[r.id] ?? r.data.monthly_contribution));
    const linked = goalCurrent[r.id], current = linked ? linked.value : num(r.data.current_value);
    return { record: r, committed, current, linked, forecast: goalForecast({ current, target: num(r.data.target_amount), targetDate: String(r.data.target_date || ''), monthly: committed, annualReturn: baseRate }) };
  });
  const requiredForGoals = goalRows.reduce((s, g) => s + (g.forecast?.required || 0), 0), allocatedToGoals = goalRows.reduce((s, g) => s + g.committed, 0);
  const stockOptions = [...new Map(records.filter(r => ['stocks', 'watchlist'].includes(r.module_key) && r.data.ticker_symbol).map(r => [`${r.data.exchange || 'NSE'}:${r.data.ticker_symbol}`, r])).values()].slice(0, 50);
  const marketOptions = [{ value: 'shares-history', label: 'NIFTY 50 · index points' }, { value: 'gold-history', label: 'Gold ETF proxy · INR per unit' }, { value: 'silver', label: 'Silver futures estimate · INR/kg' }, { value: 'crude', label: 'WTI crude futures · USD/barrel' }, ...stockOptions.map(r => ({ value: `stock:${r.id}`, label: `${r.data.security_name || r.data.ticker_symbol} · ${r.data.exchange || 'NSE'} native price` }))];
  const marketResult = marketProjection(history);

  async function loadMarket() {
    requestRef.current?.abort();
    const controller = new AbortController(); requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 30000);
    setMarketBusy(true); setMarketStatus(''); setHistory([]);
    try {
      const stock = market.startsWith('stock:') ? stockOptions.find(r => `stock:${r.id}` === market) : null;
      if (market.startsWith('stock:') && !stock) throw new Error('Choose a holding from the current household.');
      if (stock && !accessToken) throw new Error('Sign in again to load holding history.');
      const to = indiaDate(), fromDate = new Date(`${to}T00:00:00Z`); fromDate.setUTCDate(fromDate.getUTCDate() - 180);
      const response = stock ? await fetch('/api/investment-history', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ from: fromDate.toISOString().slice(0, 10), to, holdings: [{ id: stock.id, kind: 'stock', ticker: stock.data.ticker_symbol, exchange: stock.data.exchange || 'NSE', quantity: 1 }] }), signal: controller.signal }) : await fetch(`/api/market-trend?asset=${encodeURIComponent(market)}&range=6mo&historyOnly=1`, { signal: controller.signal });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Market history is unavailable.');
      if (stock && json.series?.[0]?.error) throw new Error(json.series[0].error);
      const points = (stock ? json.series?.[0]?.points : json.points) || [];
      if (!marketProjection(points)) throw new Error('At least 20 valid daily observations are needed.');
      if (requestRef.current !== controller || controller.signal.aborted) return;
      setHistory(points); setHistoryLabel(marketOptions.find(o => o.value === market)?.label || market);
    } catch (error: any) {
      if (requestRef.current === controller) setMarketStatus(controller.signal.aborted ? 'History request stopped or timed out. Try again.' : error.message || 'Could not load history.');
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) setMarketBusy(false);
    }
  }

  function exportForecast() {
    const payload = { format: 'asset-manager-predictive-plan', version: 1, asOf: indiaDate(), assumptions: { ...scenarioInputs, annualReturn: baseRate, scenarioSpread }, scenarios: scenarios.map(s => ({ name: s.name, rate: s.rate, points: s.points })), goals: goalRows.map(g => ({ name: g.record.data.security_name, targetDate: g.record.data.target_date, monthly: g.committed, forecast: g.forecast })), cashFlow: { opening: openingCash, income: incomeAmount, expenses: expenseAmount, investment: cashInvestment, premiums: premiumAmount, debts: debtInputs, extraDebtId: selectedDebt?.id, extraPayment: extraAmount, points: cashPoints }, market: marketResult ? { label: historyLabel, ...marketResult } : null, note: 'Illustrative scenarios, not calibrated probabilities or guaranteed outcomes. Assumptions are session-only.' };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `predictive-plan-${indiaDate()}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const sectionId = useId();
  const phone = usePhoneTabs();
  return <section className="forecast-planner" aria-label="Predictive planner">
    <header className="forecast-heading"><div><span className="forecast-eyebrow">Plan ahead</span><h3>Predictive Planner</h3><p>Explore your next move with your household’s saved records and editable assumptions.</p></div><button type="button" className="btn" onClick={exportForecast}><Download size={16} /> Export plan</button></header>
    {phone ? <OneRowTabs label="Forecast type" tabs={tabs.map(t => ({ id: t.id, label: t.short, fullName: t.title, active: tab === t.id, onSelect: () => setTab(t.id) }))} /> : <div className="forecast-tabs" role="tablist" aria-label="Forecast type" onKeyDown={event => {
      const index = tabs.findIndex(t => t.id === tab);
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
      if (next >= 0) { event.preventDefault(); setTab(tabs[next].id); event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus(); }
    }}>{tabs.map(t => <button type="button" key={t.id} id={`${sectionId}-${t.id}`} role="tab" tabIndex={tab === t.id ? 0 : -1} aria-selected={tab === t.id} aria-controls={`${sectionId}-panel`} onClick={() => setTab(t.id)}><t.icon size={16} />{t.title}</button>)}</div>}
    <div role="tabpanel" id={`${sectionId}-panel`} {...(phone ? { 'aria-label': tabs.find(t => t.id === tab)?.title } : { 'aria-labelledby': `${sectionId}-${tab}` })}>
      {(tab === 'wealth' || tab === 'goals') && <div className="forecast-assumptions"><NumberField label="Base annual return (%)" value={annualReturn} onChange={setAnnualReturn} min={-50} max={40} /><NumberField label="Inflation (%)" value={inflation} onChange={setInflation} max={20} hint="Used to show wealth in today’s rupees." /><p>Example assumptions are editable. Returns are effective annual rates; contributions arrive at month end. Goal values come from the Goals page.</p></div>}
      {tab === 'wealth' && <div className="forecast-stack">
        <div className="forecast-stats"><Stat label="Net worth for retirement" value={fmt(retirementBase)} note={homeValue > 0 || protectionValue > 0 ? [homeValue > 0 && `Leaves out the home you live in (${fmt(homeValue)})`, protectionValue > 0 && `family protection policies (${fmt(protectionValue)})`].filter(Boolean).join(' and ') : 'All assets minus all loans'} /><Stat label={`Base in ${horizon} years`} value={fmt(real ? base.final.real : base.final.nominal)} note={real ? 'Today’s purchasing power' : 'Future rupees'} /><Stat label="New contributions" value={fmt(base.final.contributed)} note="Over the selected horizon" /><Stat label="Retirement withdrawals" value={fmt(base.final.withdrawn)} /></div>
        <div className="forecast-card"><div className="forecast-row"><h4>A range of possible paths</h4><label className="forecast-check"><input type="checkbox" checked={real} onChange={e => setReal(e.target.checked)} /> Show today’s rupees</label></div><ScenarioChart scenarios={scenarios} real={real} /><p className="forecast-note">The paths compare fixed return assumptions. They are scenario estimates, not confidence intervals. The same rate is applied to net worth; asset classes, taxes, fees and loan interest are not separately modelled here.</p></div>
        <div className="forecast-inputs"><NumberField label="Forecast horizon (years)" value={years} onChange={setYears} min={1} max={40} step="1" /><NumberField label="Monthly investment (₹)" value={monthly === '' ? String(Math.round(snapshot.monthlyInvestment)) : monthly} onChange={setMonthly} hint="Prefilled from saved recurring contributions, including employer PF." /><NumberField label="Annual contribution increase (%)" value={stepUp} onChange={setStepUp} max={30} /><NumberField label="Scenario spread (percentage points)" value={spread} onChange={setSpread} max={15} /><NumberField label="Current age" value={age} onChange={setAge} max={100} /><NumberField label="Retirement age" value={retirementAge} onChange={setRetirementAge} max={100} /><NumberField label="Retirement spending / month (₹ today)" value={retirementSpend} onChange={setRetirementSpend} hint="Starts after retirement and rises with inflation. Zero means no withdrawals." /></div>
        {num(retirementAge) < num(age) && <p className="forecast-alert">Retirement age is before your current age: contributions stop now and retirement spending begins immediately.</p>}
        <div className="forecast-table"><table><caption>Scenario outcomes after {horizon} years</caption><thead><tr><th>Scenario</th><th>Annual return</th><th>Future value</th><th>Today’s rupees</th><th>First depletion</th></tr></thead><tbody>{scenarios.map(s => <tr key={s.name}><th scope="row">{s.name}</th><td>{s.rate.toFixed(1)}%</td><td>{fmt(s.final.nominal)}</td><td>{fmt(s.final.real)}</td><td>{s.depletedAt === null ? 'Not within horizon' : s.depletedAt === 0 ? 'Already nonpositive' : `Year ${s.depletedAt.toFixed(1)}`}</td></tr>)}</tbody></table></div>
      </div>}
      {tab === 'goals' && <div className="forecast-stack"><div className="forecast-stats"><Stat label="Saved goals" value={String(goalRows.length)} /><Stat label="Monthly funding needed" value={fmt(requiredForGoals)} note="Sum for goals with a valid future date" /><Stat label="Monthly funding assigned" value={fmt(allocatedToGoals)} note="Separate allocations for each goal" /><Stat label="Available investment plan" value={fmt(monthlyAmount)} /></div>
        {allocatedToGoals > monthlyAmount && <p className="forecast-alert">Goal allocations exceed your wealth plan’s monthly investment by {fmt(allocatedToGoals - monthlyAmount)}. Adjust the allocations or increase your planned investment.</p>}
        {!goalRows.length && <div className="forecast-card"><h4>Add your first goal</h4><p>Create a goal with a target amount, current savings and target date in Goals. It will appear here automatically.</p></div>}
        {goalRows.map(({ record: r, forecast: f, committed, current, linked }) => <article className="forecast-card" key={r.id}><div className="forecast-row"><div><h4>{r.data.security_name || 'Goal'}</h4><p>Target: {fmt(r.data.target_amount)} · {r.data.target_date ? formatDate(r.data.target_date) : 'Date missing'}</p></div><span className={`forecast-badge ${f?.funded ? 'forecast-positive' : ''}`}>{!f ? 'Set a valid target date' : f.overdue ? 'Due now / overdue' : f.funded ? 'On track in base scenario' : 'Funding gap'}</span></div><div className="forecast-stats"><Stat label="Value today" value={fmt(current)} note={linked ? (linked.funding === 'selected' ? 'From the holdings chosen on the Goals page' : 'Its share of your net worth, from the Goals page') : 'Current value saved on the goal'} /><Stat label="Projected at target" value={f ? fmt(f.projected) : '—'} /><Stat label="Monthly amount needed" value={f?.overdue ? 'Immediate funding needed' : f ? fmt(f.required) : '—'} /><Stat label="Projected shortfall" value={f ? fmt(f.gap) : '—'} danger={!!f?.gap} /></div><NumberField label={`Monthly allocation for ${r.data.security_name || 'goal'} (₹)`} value={goalMonthly[r.id] ?? String(committed)} onChange={v => setGoalMonthly(prev => ({ ...prev, [r.id]: v }))} hint="An allocation from your investment budget, not an additional contribution." /></article>)}
        <p className="forecast-note">Each goal's value today comes from the Goals page: the holdings you chose for it, or else its share of your net worth after loans. A holding chosen for two goals counts only once. Target amounts are not automatically increased for inflation.</p>
      </div>}
      {tab === 'cash' && <div className="forecast-stack"><p className="forecast-note">A monthly budget for the next 12 full months. Enter take-home income and expenses to make the estimate useful. Investing, insurance and loan payments are separate outflows, and insurance is a yearly cost taken in the month each premium is due; exclude them from living expenses to avoid double counting.</p><div className="forecast-inputs"><div><NumberField label="Cash outside OD accounts (₹)" value={cash === '' ? String(Math.round(defaultCash)) : cash} onChange={setCash} min={-1e12} hint="Adds up only what is ticked below: savings, cash at home, spare money parked in an OD account, and any fixed income you would draw on." /><SourcePicker items={sources.cash} picked={picked('cash')} unit={''} onChange={ids => { setCash(''); onPicksChange?.({ ...picks, cash: ids }); }} /></div><div><NumberField label="Take-home income / month (₹)" value={income === '' ? String(Math.round(snapshot.monthlyIncome)) : income} onChange={setIncome} hint="Adds up the salary, rent and dividends ticked below." /><SourcePicker items={sources.income} picked={picked('income')} unit={'/month'} onChange={ids => { setIncome(''); onPicksChange?.({ ...picks, income: ids }); }} /></div><div><NumberField label="Living expenses / month (₹)" value={expenses === '' ? String(Math.round(snapshot.monthlyRegular)) : expenses} onChange={setExpenses} hint="Adds up the regular payments ticked below. Type a figure to add anything else you spend." /><SourcePicker items={sources.expenses} picked={picked('expenses')} unit={'/month'} onChange={ids => { setExpenses(''); onPicksChange?.({ ...picks, expenses: ids }); }} /></div><div><NumberField label="Cash-funded investments / month (₹)" value={cashInvesting === '' ? String(Math.round(monthlyAmount)) : cashInvesting} onChange={setCashInvesting} hint="Adds up the SIPs and deposits ticked below. Untick employer PF or anything already taken out of take-home pay." /><SourcePicker items={sources.investment} picked={picked('investment')} unit={'/month'} onChange={ids => { setCashInvesting(''); onPicksChange?.({ ...picks, investment: ids }); }} /></div><div><NumberField label="Insurance premiums / year (₹)" value={premiums === '' ? String(Math.round(snapshot.annualPremium)) : premiums} onChange={setPremiums} hint="Adds up the policies ticked below. Each premium is taken in the month it falls due, not every month." /><SourcePicker items={sources.insurance} picked={picked('insurance')} unit={'/year'} onChange={ids => { setPremiums(''); onPicksChange?.({ ...picks, insurance: ids }); }} /></div></div>
        {(income === '' && !snapshot.monthlyIncome || !expenseAmount) && <p className="forecast-alert">Income or expenses are incomplete. The projection below is provisional until you fill them in.</p>}
        <div className="forecast-stats"><Stat label="Savings and cash" value={fmt(openingCash)} note={`${fmt(snapshot.savingsBalance)} in bank · ${fmt(snapshot.cashAtHome)} at home`} /><Stat label="Parked in OD" value={fmt(debtInputs.reduce((sum, d) => sum + (d.parked || 0), 0))} note="Withdrawable, but raises interest if used" /><Stat label="Liquidity today" value={fmt(openingCash + debtInputs.reduce((sum, d) => sum + (d.parked || 0), 0))} /></div>
        <div className="forecast-stats"><Stat label="Salary in" value={fmt(snapshot.monthlySalary)} note="From Salary records" /><Stat label="Rent in" value={fmt(snapshot.monthlyRent)} note="Rented properties, excluding vacant ones" /><Stat label="Dividends in" value={fmt(snapshot.monthlyDividend)} note="From Dividend Income records" /><Stat label="Loan EMIs" value={fmt(totalEmi)} /><Stat label="Available cash flow / month" value={fmt(monthlyAvailable)} note="After EMIs, investments and expenses" danger={monthlyAvailable < 0} /><Stat label="Insurance this year" value={fmt(premiumAmount)} note={nextPremium ? `Next due ${formatMonth(nextPremium.month)}: ${fmt(nextPremium.premiums)}` : 'None due in the next 12 months'} /></div>
        {hasOdLoan && <div className="forecast-card"><div className="forecast-row"><h4>Overdraft home loan</h4><label className="forecast-check"><input type="checkbox" checked={sweepToOd} onChange={e => setSweepToOd(e.target.checked)} /> Park monthly surplus in the OD account</label></div><p>Interest is charged only on the balance not covered by savings parked in the OD account. Parked money counts as liquidity: a shortfall draws on it once other cash runs out, which raises the interest charged.</p><div className="forecast-stats"><Stat label="Parked after 12 months" value={fmt(cashPoints[11].parked)} /><Stat label="12-month interest saved by parking surplus" value={fmt(sweepSaving)} /></div></div>}
        <div className="forecast-stats"><Stat label="First month surplus" value={fmt(cashPoints[0].surplus)} danger={cashPoints[0].surplus < 0} /><Stat label="Liquidity after 12 months" value={fmt(cashPoints[11].liquidity)} danger={cashPoints[11].liquidity < 0} /><Stat label="First cash shortfall" value={shortfall ? formatMonth(shortfall.month) : 'None in horizon'} danger={!!shortfall} /></div>
        <div className="forecast-card"><h4>Loan payoff explorer</h4><p>Saved balances and rates are used; payments are estimated from remaining tenure where available. Override each payment below. The extra payment applies to one selected loan.</p>{!debtInputs.length ? <p>No outstanding loans found in the visible household records.</p> : <><div className="forecast-inputs">{debtInputs.map(d => <NumberField key={d.id} label={`${d.name} payment / month (₹)`} value={payments[d.id] ?? String(Math.round(d.payment))} onChange={v => setPayments(prev => ({ ...prev, [d.id]: v }))} hint={`${fmt(d.balance)} balance${d.parked ? ` · ${fmt(d.parked)} parked` : ''} · ${d.annualRate}% annual interest`} />)}<label className="forecast-field">Loan receiving extra payment<select value={selectedDebt?.id || ''} onChange={e => setDebtId(e.target.value)}>{debtInputs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label><NumberField label="Extra payment / month (₹)" value={extra} onChange={setExtra} /></div><div className="forecast-stats"><Stat label="Selected loan payoff" value={payoff?.paidOff ? `${payoff.months} months` : 'Not paid off within 50 years'} /><Stat label="Interest with extra payments" value={payoff?.paidOff ? fmt(payoff.interest) : '—'} /><Stat label="Interest saved" value={payoff?.paidOff && originalPayoff?.paidOff ? fmt(Math.max(0, originalPayoff.interest - payoff.interest)) : '—'} />{parkedInterestSaved > 0 && <Stat label="Lifetime interest saved by parked savings" value={fmt(parkedInterestSaved)} />}</div>{!payoff?.paidOff && <p className="forecast-alert">Increase the selected loan’s payment. It may not cover interest or may extend beyond the calculation horizon.</p>}</>}{snapshot.warnings.map(w => <p key={w} className="forecast-note">{w}</p>)}</div>
        <div className="forecast-table"><table><caption>Cash forecast · constant income and expenses · loan payments stop at payoff</caption><thead><tr><th>Month</th><th>Loan payments</th><th>Surplus</th><th>Savings</th>{hasOdLoan && <th>Parked in OD</th>}<th>Liquidity</th></tr></thead><tbody>{cashPoints.map(p => <tr key={p.month}><th scope="row">{formatMonth(p.month)}</th><td>{fmt(p.debtPayment)}</td><td>{fmt(p.surplus)}</td><td>{fmt(p.closing)}</td>{hasOdLoan && <td>{fmt(p.parked)}</td>}<td className={p.liquidity < 0 ? 'forecast-negative' : ''}>{fmt(p.liquidity)}</td></tr>)}</tbody></table></div><p className="forecast-note">Yearly tax, one-off bills, bonuses, maturity receipts and changing rates are not included. Confirm property loans are not also entered separately under Loans.</p>
      </div>}
      {tab === 'market' && <div className="forecast-stack"><div className="forecast-row"><label className="forecast-field">Instrument<select value={market} onChange={e => { requestRef.current?.abort(); requestRef.current = null; setMarketBusy(false); setMarket(e.target.value); setHistory([]); setMarketStatus(''); }}>{marketOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label><button type="button" className="btn-primary" disabled={marketBusy} onClick={loadMarket}>{marketBusy ? 'Loading history…' : 'Load trend estimate'}</button></div><p className="forecast-note">Uses about six months of daily prices. Saved stocks and watchlist instruments are available alongside broad market proxies. Loading is on demand.</p>{marketStatus && <p role="alert" className="forecast-alert">{marketStatus}</p>}
        {!marketResult && !marketBusy && !marketStatus && <div className="forecast-card"><h4>Explore a historical trend</h4><p>Select an instrument and load its history to see momentum, volatility and illustrative future ranges.</p></div>}
        {marketResult && <><div className="forecast-row"><h4>{historyLabel}</h4><span className="forecast-badge">Latest observation: {formatDate(marketResult.asOf)}</span></div>{Date.parse(indiaDate()) - Date.parse(marketResult.asOf) > 7 * 86400000 && <p className="forecast-alert">This history is more than seven days old. Estimates may not reflect recent market conditions.</p>}<div className="forecast-stats"><Stat label="Last price / index" value={marketResult.last.toLocaleString('en-IN', { maximumFractionDigits: 2 })} /><Stat label="Annualized daily volatility" value={`${marketResult.annualVolatility.toFixed(1)}%`} /><Stat label="Worst observed drawdown" value={`${marketResult.drawdown.toFixed(1)}%`} /><Stat label="20 / 50 day average" value={`${marketResult.ma20.toFixed(2)} / ${marketResult.ma50?.toFixed(2) || 'N/A'}`} /></div><div className="forecast-table"><table><caption>Trend extrapolation · values in the selected instrument’s displayed units</caption><thead><tr><th>Trading days ahead</th><th>Lower illustration</th><th>Central trend</th><th>Higher illustration</th></tr></thead><tbody>{marketResult.horizons.map(h => <tr key={h.days}><th scope="row">{h.days}</th><td>{h.low.toFixed(2)}</td><td>{h.central.toFixed(2)}</td><td>{h.high.toFixed(2)}</td></tr>)}</tbody></table></div><p className="forecast-note">Method: average daily log return with ± one historical standard deviation scaled by the square root of trading days; extreme extrapolations are bounded. Based on {marketResult.observations} observations. These are illustrative ranges, not calibrated probabilities or buy/sell signals. Futures, ETF and index proxies may differ from physical or spot prices; commodity INR history uses the existing feed’s FX conversion.</p></>}
      </div>}
    </div><footer className="forecast-footer">As of {formatDate(indiaDate())} · Uses records you can currently access · Assumptions stay in this session and reset when you change households · Estimates exclude unrecorded activity.</footer>
  </section>;
}
