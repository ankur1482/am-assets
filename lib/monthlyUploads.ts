import { indiaDate, type PlanningRecord } from './predictions';

export const MONTHLY_UPLOAD_MODULE = 'monthlyUpload';
/** First month that must be evidenced; earlier months are never demanded. */
export const UPLOAD_TRACKING_START = '2026-10';
/** Documents for a month may be uploaded without restriction until this day of the following month. */
export const UPLOAD_GRACE_LAST_DAY = 7;

export type UploadDocType = 'salary_slip' | 'portfolio_ledger';
export type UploadStatus = 'missing' | 'uploaded' | 'not_available';
export type UploadItem = { key: string; docType: UploadDocType; label: string; account: string; period: string; dueBy: string; overdue: boolean; status: UploadStatus; recordId?: string; reason?: string };

const LABELS: Record<UploadDocType, string> = { salary_slip: 'Salary slip', portfolio_ledger: 'Portfolio ledger' };
const accountOf = (record: PlanningRecord) => String(record.data?.account_name || '').trim() || 'Unassigned';
const shiftMonth = (period: string, by: number) => {
  const [year, month] = period.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + by, 1)).toISOString().slice(0, 7);
};
const uploadKey = (docType: string, period: string, account: string) => `${docType}:${period}:${account.toLowerCase()}`;
export const periodLabel = (period: string) => new Date(`${period}-01T12:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Lists the slip and ledger each account owes for every completed month since tracking began. */
export function requiredUploads(records: PlanningRecord[], asOf = indiaDate()) {
  const saved = new Map(records.filter(r => r.module_key === MONTHLY_UPLOAD_MODULE).map(r => [uploadKey(String(r.data?.doc_type), String(r.data?.period), String(r.data?.account_name || '')), r]));
  const salaries = records.filter(r => r.module_key === 'fixedIncome' && /^salary$/i.test(String(r.data?.category || '').trim()));
  const ledgerAccounts = new Set(records.filter(r => (r.module_key === 'stocks' || r.module_key === 'mutualFunds') && !r.data?.sold_out).map(accountOf));
  const items: UploadItem[] = [];
  const add = (docType: UploadDocType, account: string, period: string) => {
    const key = uploadKey(docType, period, account), record = saved.get(key);
    if (items.some(item => item.key === key)) return;
    const status: UploadStatus = record?.data?.status === 'uploaded' ? 'uploaded' : record?.data?.status === 'not_available' ? 'not_available' : 'missing';
    const dueBy = `${shiftMonth(period, 1)}-${String(UPLOAD_GRACE_LAST_DAY).padStart(2, '0')}`;
    items.push({ key, docType, label: LABELS[docType], account, period, dueBy, overdue: status === 'missing' && asOf > dueBy, status, recordId: record?.id, reason: record?.data?.reason });
  };
  for (let period = UPLOAD_TRACKING_START; period < asOf.slice(0, 7); period = shiftMonth(period, 1)) {
    for (const salary of salaries) {
      const started = String(salary.data?.purchase_date || '').slice(0, 7), ended = String(salary.data?.last_working_date || '').slice(0, 7);
      if ((started && started > period) || (ended && ended < period)) continue;
      add('salary_slip', accountOf(salary), period);
    }
    for (const account of ledgerAccounts) add('portfolio_ledger', account, period);
  }
  const missing = items.filter(item => item.status === 'missing');
  return { items, missing, overdue: missing.filter(item => item.overdue) };
}
