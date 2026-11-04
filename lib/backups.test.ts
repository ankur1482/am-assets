import { describe, expect, it } from 'vitest';
import { backupFileName, backupFingerprint, isBackupFile } from './backups';

const stock = (data: Record<string, any>) => ({ id: 's', module_key: 'stocks', data: { security_name: 'RELIANCE', quantity: 10, ...data } });
const accounts = [{ id: 'a', name: 'Ankur' }];

describe('automatic backups', () => {
  it('ignores price refreshes and automatic snapshots', () => {
    const base = backupFingerprint(accounts, [stock({ live_price: 100, latest_value: 1000 })]);
    expect(backupFingerprint(accounts, [stock({ live_price: 120, latest_value: 1200, day_change: 2 })])).toBe(base);
    expect(backupFingerprint(accounts, [stock({ live_price: 100 }), { id: 'x', module_key: 'netWorthSnapshot', data: { net: 5 } }])).toBe(base);
  });
  it('notices an added, edited or removed record', () => {
    const base = backupFingerprint(accounts, [stock({})]);
    expect(backupFingerprint(accounts, [stock({ quantity: 11 })])).not.toBe(base);
    expect(backupFingerprint(accounts, [])).not.toBe(base);
    expect(backupFingerprint(accounts, [stock({}), { id: 'g', module_key: 'goals', data: { security_name: 'Goal' } }])).not.toBe(base);
  });
  it('notices edits to a typed-in value on a holding without a live price', () => {
    const property = (latest_value: number) => [{ id: 'p', module_key: 'property', data: { latest_value } }];
    expect(backupFingerprint(accounts, property(100))).not.toBe(backupFingerprint(accounts, property(200)));
  });
  it('notices account changes, sales and uploads', () => {
    const base = backupFingerprint(accounts, []);
    expect(backupFingerprint([{ id: 'a', name: 'Renamed' }], [])).not.toBe(base);
    expect(backupFingerprint(accounts, [{ id: 't', module_key: 'transactions', data: { status: 'posted' } }])).not.toBe(base);
    expect(backupFingerprint(accounts, [{ id: 'u', module_key: 'monthlyUpload', data: { status: 'uploaded' } }])).not.toBe(base);
  });
  it('counts hand edits in month on month but not automatic values', () => {
    const month = (item: Record<string, any>) => [{ id: 'm', module_key: 'monthlyValuation', data: { period: '2026-11', items: { g: item } } }];
    const auto = backupFingerprint(accounts, month({ end: 100 }));
    expect(backupFingerprint(accounts, month({ end: 200 }))).toBe(auto);
    expect(backupFingerprint(accounts, month({ end: 200, end_edited: true }))).not.toBe(auto);
  });
  it('names each file uniquely by time and recognises the format', () => {
    expect(backupFileName(new Date('2026-11-04T10:15:30Z'))).toBe('asset-manager-backup-2026-11-04-10-15-30.json');
    expect(isBackupFile(JSON.stringify({ format: 'asset-manager-restore-point' }))).toBe(true);
    expect(isBackupFile('{"format":"other"}')).toBe(false);
    expect(isBackupFile('not json')).toBe(false);
  });
});
