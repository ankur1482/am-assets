import { describe, expect, it } from 'vitest';
import { MONTHLY_UPLOAD_MODULE, requiredUploads } from './monthlyUploads';

const salary = (account: string, extra = {}) => ({ id: `s-${account}`, module_key: 'fixedIncome', data: { category: 'Salary', account_name: account, employee_contribution: 100000, ...extra } });
const stock = (account: string) => ({ id: `h-${account}`, module_key: 'stocks', data: { account_name: account } });
const saved = (docType: string, account: string, period: string, status: string) => ({ id: `${docType}-${account}-${period}`, module_key: MONTHLY_UPLOAD_MODULE, data: { doc_type: docType, account_name: account, period, status } });

describe('monthly upload requirements', () => {
  it('asks each salaried account for a slip and each invested account for a ledger', () => {
    const result = requiredUploads([salary('Ankur'), stock('Ankur'), stock('Family')], '2026-11-04');
    expect(result.items.map(i => `${i.docType}:${i.account}:${i.period}`)).toEqual(['salary_slip:Ankur:2026-10', 'portfolio_ledger:Ankur:2026-10', 'portfolio_ledger:Family:2026-10']);
  });
  it('allows the grace period and turns overdue on the following day', () => {
    const records = [salary('Ankur')];
    expect(requiredUploads(records, '2026-11-07').overdue).toHaveLength(0);
    expect(requiredUploads(records, '2026-11-08').overdue).toHaveLength(1);
  });
  it('never asks for months before tracking began or for the month in progress', () => {
    expect(requiredUploads([salary('Ankur')], '2026-10-31').items).toEqual([]);
  });
  it('keeps every missed month outstanding', () => {
    const result = requiredUploads([salary('Ankur')], '2027-01-02');
    expect(result.missing.map(i => i.period)).toEqual(['2026-10', '2026-11', '2026-12']);
    expect(result.overdue.map(i => i.period)).toEqual(['2026-10', '2026-11']);
  });
  it('accepts an upload or a stated reason, but not an unfinished upload', () => {
    const records = [salary('Ankur'), stock('Ankur'), saved('salary_slip', 'ankur', '2026-10', 'uploaded')];
    expect(requiredUploads(records, '2026-11-20').overdue.map(i => i.docType)).toEqual(['portfolio_ledger']);
    expect(requiredUploads([...records, saved('portfolio_ledger', 'Ankur', '2026-10', 'not_available')], '2026-11-20').missing).toEqual([]);
    expect(requiredUploads([salary('Ankur'), saved('salary_slip', 'Ankur', '2026-10', 'uploading')], '2026-11-20').missing).toHaveLength(1);
  });
  it('skips salary months outside the employment dates', () => {
    expect(requiredUploads([salary('Ankur', { purchase_date: '2026-11-15' })], '2026-12-02').items.map(i => i.period)).toEqual(['2026-11']);
    expect(requiredUploads([salary('Ankur', { last_working_date: '2026-09-30' })], '2026-12-02').items).toEqual([]);
  });
  it('asks once per account when one person has several salary rows', () => {
    expect(requiredUploads([salary('Ankur'), { ...salary('Ankur'), id: 'second' }], '2026-11-02').items).toHaveLength(1);
  });
});
