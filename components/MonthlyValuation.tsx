"use client";

import { useMemo, useState } from 'react';
import { fmt, num } from '@/lib/calculations';
import { financialYearMonths, financialYearOf, financialYearTotal, isFlow, isYearlyRow, ledgerTable, netCashFlow, netWorthOn, sumCells, yearlyLedgerTable, yearlyPeriodFor, type LedgerField, type LedgerRow, type MonthData } from '@/lib/monthlyValuation';

type Measure = 'both' | 'start' | 'end' | 'change' | 'gain';
type Cadence = 'monthly' | 'yearly';
type Props = { months: MonthData[]; currentMonth: string; canEdit: boolean; onSave: (period: string, row: LedgerRow, field: LedgerField, value: number | null) => Promise<boolean> };
const monthLabel = (month: string) => new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const yearLabel = (year: number) => `FY ${year}-${String(year + 1).slice(2)}`;
const signed = (value: number | null | undefined) => value === null || value === undefined ? '—' : `${value > 0 ? '+' : ''}${fmt(value)}`;
const tone = (value: number | null | undefined) => num(value) > 0 ? 'mom-up' : num(value) < 0 ? 'mom-down' : '';

export default function MonthlyValuation({ months, currentMonth, canEdit, onSave }: Props) {
  const thisYear = financialYearOf(currentMonth);
  const years = useMemo(() => [...new Set([thisYear, ...months.map(month => financialYearOf(month.period))])].filter(year => year <= thisYear).sort((a, b) => b - a), [months, thisYear]);
  const [cadence, setCadence] = useState<Cadence>('monthly'), [year, setYear] = useState(thisYear), [measure, setMeasure] = useState<Measure>('both'), [account, setAccount] = useState('All');
  const [editing, setEditing] = useState<{ rowId: string; column: string; field: LedgerField; text: string } | null>(null), [saving, setSaving] = useState(false);
  const yearly = cadence === 'yearly';
  const measures: { id: Measure; title: string }[] = [{ id: 'both', title: 'Start & End' }, { id: 'start', title: yearly ? 'Start of year' : 'Start of month' }, { id: 'end', title: yearly ? 'End of year' : 'End of month' }, { id: 'change', title: yearly ? 'Change in year' : 'Change in month' }, { id: 'gain', title: 'Gain vs purchase' }];
  const columns = useMemo(() => yearly
    ? [...years].sort((a, b) => a - b).map(value => ({ key: String(value), title: yearLabel(value), current: value === thisYear }))
    : financialYearMonths(year, currentMonth).map(period => ({ key: period, title: monthLabel(period), current: period === currentMonth })), [yearly, years, thisYear, year, currentMonth]);
  const table = useMemo(() => yearly ? yearlyLedgerTable(months, years, currentMonth) : ledgerTable(months, columns.map(column => column.key)), [yearly, months, years, currentMonth, columns]);
  const accounts = useMemo(() => ['All', ...new Set(table.rows.map(row => row.account))], [table]);
  const allRows = account === 'All' ? table.rows : table.rows.filter(row => row.account === account);
  const rows = allRows.filter(row => isYearlyRow(row) === yearly);
  const groups = table.groups.filter(group => rows.some(row => row.group === group));
  const trackedAssets = rows.filter(row => row.side === 'asset');

  async function commit(row: LedgerRow) {
    if (!editing || saving) return;
    const { column, field, text } = editing, value = text.trim() === '' ? null : num(text), held = row.cells[column];
    // A yearly figure is stored in the month it came from.
    const period = !yearly ? column : (field === 'start' ? held?.startPeriod : held?.endPeriod) || yearlyPeriodFor(Number(column), field, currentMonth);
    setSaving(true);
    try { if (await onSave(period, row, field, value)) setEditing(null); } finally { setSaving(false); }
  }

  function figure(row: LedgerRow, column: { key: string; title: string }, field: LedgerField, value: number | null, edited: boolean, caption?: string) {
    if (editing?.rowId === row.id && editing.column === column.key && editing.field === field) {
      return <input autoFocus className="mom-input" inputMode="decimal" aria-label={`${row.label}, ${column.title}, ${field}`} value={editing.text} disabled={saving} onChange={event => setEditing({ ...editing, text: event.target.value })} onBlur={() => void commit(row)} onKeyDown={event => { if (event.key === 'Enter') void commit(row); if (event.key === 'Escape') setEditing(null); }} />;
    }
    const content = <>{caption && <small>{caption}</small>}<span>{value === null ? '—' : fmt(value)}</span>{edited && <i title="Edited by hand. Clear the amount to undo." aria-label="edited" />}</>;
    if (!canEdit) return <span className="mom-figure">{content}</span>;
    return <button type="button" className="mom-figure" title={edited ? 'Edited by hand. Clear the amount to undo.' : 'Click to edit'} onClick={() => setEditing({ rowId: row.id, column: column.key, field, text: value === null ? '' : String(Math.round(value)) })}>{content}</button>;
  }

  function cell(row: LedgerRow, column: { key: string; title: string }) {
    const data = row.cells[column.key];
    if (isFlow(row.side)) {
      if (measure === 'change') return <span className={tone(data?.change)}>{signed(data?.change)}</span>;
      if (measure === 'gain') return '—';
      return figure(row, column, 'amount', data?.amount ?? null, !!data?.amountEdited);
    }
    if (measure === 'change') return <span className={tone(data?.change)}>{signed(data?.change)}</span>;
    if (measure === 'gain') return <span className={tone(data?.gain)}>{signed(data?.gain)}</span>;
    const start = figure(row, column, 'start', data?.start ?? null, !!data?.startEdited, measure === 'both' ? 'Start' : undefined);
    const end = figure(row, column, 'end', data?.end ?? null, !!data?.endEdited, measure === 'both' ? 'End' : undefined);
    return measure === 'start' ? start : measure === 'end' ? end : <div className="mom-pair">{start}{end}</div>;
  }

  function groupTotal(groupRows: LedgerRow[], key: string) {
    if (isFlow(groupRows[0].side)) return measure === 'change' ? signed(sumCells(groupRows, key, 'change')) : measure === 'gain' ? '—' : fmt(sumCells(groupRows, key, 'amount'));
    if (measure === 'change') return signed(sumCells(groupRows, key, 'change'));
    if (measure === 'gain') return signed(sumCells(groupRows, key, 'gain'));
    if (measure === 'start') return fmt(sumCells(groupRows, key, 'start'));
    if (measure === 'end') return fmt(sumCells(groupRows, key, 'end'));
    return <div className="mom-pair"><span className="mom-figure"><small>Start</small><span>{fmt(sumCells(groupRows, key, 'start'))}</span></span><span className="mom-figure"><small>End</small><span>{fmt(sumCells(groupRows, key, 'end'))}</span></span></div>;
  }

  return <section className="mom" aria-label="Month on month valuation">
    <div className="mom-toolbar">
      <div className="mom-measures" role="group" aria-label="Monthly or yearly items">{(['monthly', 'yearly'] as const).map(option => <button key={option} type="button" aria-pressed={cadence === option} onClick={() => { setCadence(option); setEditing(null); }}>{option === 'monthly' ? 'Monthly items' : 'Yearly items'}</button>)}</div>
      {!yearly && <label>Financial year<select value={year} onChange={event => { setYear(Number(event.target.value)); setEditing(null); }}>{years.map(value => <option key={value} value={value}>{yearLabel(value)}</option>)}</select></label>}
      <label>Account<select value={account} onChange={event => setAccount(event.target.value)}>{accounts.map(value => <option key={value}>{value}</option>)}</select></label>
      <div className="mom-measures" role="group" aria-label="What to show">{measures.map(option => <button key={option.id} type="button" aria-pressed={measure === option.id} onClick={() => setMeasure(option.id)}>{option.title}</button>)}</div>
    </div>
    <p className="mom-note">{yearly ? 'Property, loan balances, insurance, PPF, Sukanya, FDs and other long-term deposits, by financial year (April to March). Each year opens at the previous year\'s close.' : 'Stocks, funds, gold, savings, salary, rent, dividends and loan EMIs. Each month opens at the previous month\'s close. The current month updates when the app is open and is fixed when the month ends.'}{canEdit ? ' Click any figure to edit it, including past periods; clear it to undo. An orange dot marks an edited figure.' : ''}</p>
    {!rows.length && <p className="mom-note">Nothing recorded yet. Values are saved automatically from this month onward.</p>}
    {!!rows.length && <div className="mom-scroll" tabIndex={0} role="region" aria-label={yearly ? 'Yearly table' : 'Month on month table'}><table>
      <thead><tr><th scope="col" className="mom-sticky">Item</th><th scope="col">Purchase</th>{columns.map(column => <th scope="col" key={column.key}>{column.title}{column.current && <small>so far</small>}</th>)}{!yearly && <th scope="col">FY total<small>after March</small></th>}</tr></thead>
      <tbody>
        {groups.flatMap(group => {
          const groupRows = rows.filter(row => row.group === group);
          return [
            <tr key={group} className="mom-group"><th scope="rowgroup" className="mom-sticky">{group}</th><td>{isFlow(groupRows[0].side) ? '' : fmt(groupRows.reduce((sum, row) => sum + num(row.purchase), 0))}</td>{columns.map(column => <td key={column.key}>{groupTotal(groupRows, column.key)}</td>)}{!yearly && <td />}</tr>,
            ...groupRows.map(row => <tr key={row.id}><th scope="row" className="mom-sticky"><span>{row.label}</span><small>{row.account}</small></th><td>{row.purchase === null ? '—' : fmt(row.purchase)}</td>{columns.map(column => <td key={column.key}>{cell(row, column)}</td>)}{!yearly && <td>{isFlow(row.side) && financialYearTotal(row, year) !== null ? fmt(financialYearTotal(row, year)) : '—'}</td>}</tr>),
          ];
        })}
      </tbody>
      <tfoot>
        {yearly ? <>
          <tr><th scope="row" className="mom-sticky">Net worth (start of year)</th><td />{columns.map(column => <td key={column.key}>{fmt(netWorthOn(allRows, column.key, 'start'))}</td>)}</tr>
          <tr><th scope="row" className="mom-sticky">Net worth (end of year)</th><td />{columns.map(column => <td key={column.key}>{fmt(netWorthOn(allRows, column.key, 'end'))}</td>)}</tr>
        </> : <>
          <tr><th scope="row" className="mom-sticky">Monthly investments (start)</th><td />{columns.map(column => <td key={column.key}>{fmt(sumCells(trackedAssets, column.key, 'start'))}</td>)}<td /></tr>
          <tr><th scope="row" className="mom-sticky">Monthly investments (end)</th><td />{columns.map(column => <td key={column.key}>{fmt(sumCells(trackedAssets, column.key, 'end'))}</td>)}<td /></tr>
          <tr><th scope="row" className="mom-sticky">Net monthly cash flow</th><td />{columns.map(column => { const value = netCashFlow(rows, column.key); return <td key={column.key} className={tone(value)}>{fmt(value)}</td>; })}<td /></tr>
        </>}
      </tfoot>
    </table></div>}
  </section>;
}
