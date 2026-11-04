"use client";

import { useMemo, useState } from 'react';
import { fmt } from '@/lib/calculations';
import { earningsByPerson } from '@/lib/earnings';
import { financialYearOf, type MonthData } from '@/lib/monthlyValuation';

type Record_ = { id: string; module_key: string; data: Record<string, any> };
const yearLabel = (year: number) => `FY ${year}-${String(year + 1).slice(2)}`;
const COLUMNS = [['salary', 'Salary credited'], ['rent', 'Rent'], ['dividends', 'Dividends'], ['interest', 'Interest accrued'], ['shortTerm', 'Short-term gains'], ['longTerm', 'Long-term gains'], ['unknownTerm', 'Gains, term unknown']] as const;

export default function EarningsByPerson({ months, records, interestByAccount, currentMonth }: { months: MonthData[]; records: Record_[]; interestByAccount: Record<string, number>; currentMonth: string }) {
  const thisYear = financialYearOf(currentMonth);
  const years = useMemo(() => [...new Set([thisYear, ...months.map(month => financialYearOf(month.period))])].filter(year => year <= thisYear).sort((a, b) => b - a), [months, thisYear]);
  const [year, setYear] = useState(thisYear);
  // Interest is worked out for the current year only, so earlier years leave it out.
  const rows = useMemo(() => earningsByPerson(months, records, year, year === thisYear ? interestByAccount : {}), [months, records, year, thisYear, interestByAccount]);
  const total = (field: (typeof COLUMNS)[number][0] | 'total') => rows.reduce((sum, row) => sum + row[field], 0);
  return <section className="mom" aria-label="Earnings by person">
    <div className="mom-toolbar"><label>Financial year<select value={year} onChange={event => setYear(Number(event.target.value))}>{years.map(value => <option key={value} value={value}>{yearLabel(value)}</option>)}</select></label></div>
    {!rows.length && <p className="mom-note">Nothing recorded for this year yet.</p>}
    {!!rows.length && <div className="mom-scroll" tabIndex={0} role="region" aria-label="Earnings table"><table>
      <thead><tr><th scope="col" className="mom-sticky">Person</th>{COLUMNS.map(([, title]) => <th scope="col" key={title}>{title}</th>)}<th scope="col">Total</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.account}>
        <th scope="row" className="mom-sticky"><span>{row.account}</span>{row.salaryMonths > 0 && <small>{row.salaryMonths} of 12 salary months recorded</small>}</th>
        {COLUMNS.map(([field, title]) => <td key={title}>{fmt(row[field])}</td>)}<td><strong>{fmt(row.total)}</strong></td>
      </tr>)}</tbody>
      <tfoot><tr><th scope="row" className="mom-sticky">Household</th>{COLUMNS.map(([field, title]) => <td key={title}>{fmt(total(field))}</td>)}<td>{fmt(total('total'))}</td></tr></tfoot>
    </table></div>}
    <p className="mom-note"><strong>Check before using this for tax.</strong> It adds up amounts actually recorded and projects nothing, so add any missing months in Month on Month. Salary is the amount credited, not your gross salary, which is what is taxed, so use Form 16 for that. Dividends are what you confirmed receiving, which may be after tax deducted. Interest is calculated from your Fixed Income rates for the current year and includes all deposit types, some of which may be tax-free. Review this with your tax adviser.</p>
  </section>;
}
