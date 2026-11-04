import { num } from './calculations';
import { receivedDividends } from './dividends';
import type { MonthData } from './monthlyValuation';
import { postedSales } from './transactions';

type EarningsRecord = { id: string; module_key: string; data: Record<string, any> };
export type PersonEarnings = { account: string; salary: number; salaryMonths: number; rent: number; dividends: number; interest: number; shortTerm: number; longTerm: number; unknownTerm: number; total: number };

export const inFinancialYear = (date: string, year: number) => date >= `${year}-04-01` && date <= `${year + 1}-03-31`;

/**
 * Money each person actually received in a financial year: recorded monthly amounts, confirmed
 * dividends and realised gains. Nothing is projected, so months not yet recorded count as nothing.
 */
export function earningsByPerson(months: MonthData[], records: EarningsRecord[], year: number, interestByAccount: Record<string, number> = {}): PersonEarnings[] {
  const people = new Map<string, PersonEarnings>();
  const person = (account: string) => {
    const name = String(account || '').trim() || 'Unassigned';
    if (!people.has(name)) people.set(name, { account: name, salary: 0, salaryMonths: 0, rent: 0, dividends: 0, interest: 0, shortTerm: 0, longTerm: 0, unknownTerm: 0, total: 0 });
    return people.get(name)!;
  };
  for (const month of months) {
    if (!inFinancialYear(`${month.period}-01`, year)) continue;
    const salaried = new Set<string>();
    for (const [id, item] of Object.entries(month.items || {})) {
      const amount = num(item.amount);
      if (!amount) continue;
      if (item.group === 'Salary') { person(item.account).salary += amount; salaried.add(person(item.account).account); }
      else if (item.group === 'Rent') person(item.account).rent += amount;
      // Confirmed dividends are counted from the receipts below, so they are not counted twice.
      else if (item.group === 'Dividends' && !id.endsWith(':dividend')) person(item.account).dividends += amount;
    }
    for (const name of salaried) person(name).salaryMonths += 1;
  }
  for (const { data } of receivedDividends(records)) if (inFinancialYear(String(data.received_on || ''), year)) person(data.account_name).dividends += num(data.amount);
  for (const { data } of postedSales(records)) {
    if (!inFinancialYear(String(data.sale_date || ''), year)) continue;
    const row = person(data.account_name);
    row.shortTerm += num(data.short_term_gain); row.longTerm += num(data.long_term_gain); row.unknownTerm += num(data.unknown_term_gain);
  }
  for (const [account, interest] of Object.entries(interestByAccount)) if (interest) person(account).interest += interest;
  const rows = [...people.values()];
  for (const row of rows) row.total = row.salary + row.rent + row.dividends + row.interest + row.shortTerm + row.longTerm + row.unknownTerm;
  return rows.sort((a, b) => a.account.localeCompare(b.account));
}
