import { MODULES } from './modules';
import { MONTHLY_PAYMENT_MODULE } from './monthlyPayments';
import { MONTHLY_UPLOAD_MODULE } from './monthlyUploads';
import { MONTHLY_VALUATION_MODULE } from './monthlyValuation';
import { TRANSACTION_MODULE } from './transactions';

export const BACKUP_FORMAT = 'asset-manager-restore-point';
export const MAX_BACKUP_BYTES = 4 * 1024 * 1024;

// Prices refresh on their own every few seconds. Backing up on those would create a file constantly.
const MARKET_FIELDS = new Set(['live_price', 'live_nav', 'current_price', 'previous_close', 'day_change', 'day_low', 'day_high', 'fifty_two_week_low', 'fifty_two_week_high', 'last_synced', 'latest_value']);
const LIVE_PRICED_MODULES = new Set(['stocks', 'mutualFunds', 'bullion', 'watchlist']);
type BackupRecord = { id: string; module_key: string; data?: Record<string, any> | null };
type BackupAccount = { id: string; [field: string]: any };

function meaningfulData(record: BackupRecord) {
  const data = record.data || {};
  if (record.module_key === TRANSACTION_MODULE || record.module_key === MONTHLY_UPLOAD_MODULE || record.module_key === MONTHLY_PAYMENT_MODULE) return data;
  if (record.module_key === MONTHLY_VALUATION_MODULE) {
    // Only hand edits count; the month's automatic figures follow market prices.
    return Object.entries(data.items || {}).filter(([, item]: [string, any]) => item.start_edited || item.end_edited || item.amount_edited).map(([id, item]: [string, any]) => [id, item.start_edited && item.start, item.end_edited && item.end, item.amount_edited && item.amount]);
  }
  const definition = MODULES[record.module_key];
  if (!definition) return null;
  return definition.fields.filter(field => !(LIVE_PRICED_MODULES.has(record.module_key) && MARKET_FIELDS.has(field.name))).map(field => data[field.name] ?? '');
}

/** Changes only when someone adds, edits or removes data, never when a price refreshes. */
export function backupFingerprint(accounts: BackupAccount[], records: BackupRecord[]) {
  const lines = [
    ...accounts.map(account => `a:${account.id}:${account.name}:${account.relation}:${account.type}:${account.institution}:${account.notes}`),
    ...records.map(record => { const data = meaningfulData(record); return data === null ? '' : `r:${record.id}:${JSON.stringify(data)}`; }).filter(Boolean),
  ].sort().join('\n');
  let hash = 5381;
  for (let i = 0; i < lines.length; i++) hash = ((hash * 33) ^ lines.charCodeAt(i)) >>> 0;
  return `${lines.length}:${hash}`;
}

export function backupFileName(date = new Date()) {
  return `asset-manager-backup-${date.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
}

export function isBackupFile(text: string) {
  try { return JSON.parse(text)?.format === BACKUP_FORMAT; } catch { return false; }
}
