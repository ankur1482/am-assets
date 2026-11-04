"use client";

import { useState } from 'react';
import { CheckCircle2, FileUp, TriangleAlert } from 'lucide-react';
import { periodLabel, type UploadItem } from '@/lib/monthlyUploads';

type Props = {
  items: UploadItem[];
  locked: boolean;
  canSubmit: boolean;
  onUpload: (item: UploadItem, file: File) => Promise<boolean>;
  onMarkUnavailable: (item: UploadItem, reason: string) => Promise<boolean>;
};
const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.webp,.csv,.xls,.xlsx,.doc,.docx,.txt';

function UploadRow({ item, canSubmit, onUpload, onMarkUnavailable }: { item: UploadItem } & Omit<Props, 'items' | 'locked'>) {
  const [busy, setBusy] = useState(false), [asking, setAsking] = useState(false), [reason, setReason] = useState('');
  async function run(action: () => Promise<boolean>) {
    setBusy(true);
    try { if (await action()) setAsking(false); } finally { setBusy(false); }
  }
  const done = item.status !== 'missing';
  return <li className="monthly-row">
    <div className="monthly-row-main">
      <strong>{item.label} · {item.account}</strong>
      {item.status === 'uploaded' && <span className="monthly-pill monthly-ok"><CheckCircle2 size={13} /> Uploaded</span>}
      {item.status === 'not_available' && <span className="monthly-pill">Not available: {item.reason}</span>}
      {item.status === 'missing' && <span className={`monthly-pill ${item.overdue ? 'monthly-late' : ''}`}>{item.overdue ? 'Overdue' : `Due by ${item.dueBy}`}</span>}
    </div>
    {canSubmit && <div className="monthly-actions">
      <label className={`btn ${busy ? 'monthly-disabled' : ''}`}>
        <FileUp size={15} /> {busy ? 'Saving…' : done ? 'Replace' : 'Upload'}
        <input type="file" accept={ACCEPTED} className="sr-only" disabled={busy} aria-label={`Upload ${item.label} for ${item.account}, ${periodLabel(item.period)}`} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void run(() => onUpload(item, file)); }} />
      </label>
      {item.status === 'missing' && <button type="button" className="btn" disabled={busy} aria-expanded={asking} onClick={() => setAsking(!asking)}>Not available</button>}
    </div>}
    {asking && <form className="monthly-reason" onSubmit={event => { event.preventDefault(); if (reason.trim()) void run(() => onMarkUnavailable(item, reason.trim())); }}>
      <label>Why is this document not available?<input value={reason} maxLength={200} required onChange={event => setReason(event.target.value)} placeholder="For example: on unpaid leave this month" /></label>
      <button type="submit" className="btn-primary" disabled={busy || !reason.trim()}>Save reason</button>
    </form>}
  </li>;
}

export default function MonthlyUploads({ items, locked, canSubmit, onUpload, onMarkUnavailable }: Props) {
  const periods = [...new Set(items.map(item => item.period))].sort().reverse();
  const outstanding = items.filter(item => item.status === 'missing').length;
  return <section className="monthly-uploads" aria-label="Monthly uploads">
    <header>
      <h3>{locked ? <><TriangleAlert size={20} /> Monthly documents overdue</> : 'Monthly documents'}</h3>
      <p>{locked ? 'The app stays locked until each overdue document is uploaded or marked not available with a reason.' : outstanding ? `${outstanding} document${outstanding === 1 ? '' : 's'} outstanding. Every salary slip and portfolio ledger is due by the 7th of the following month.` : 'All required documents are in. Slips and ledgers are due by the 7th of the following month.'}</p>
    </header>
    {!items.length && <p className="monthly-empty">Nothing is due yet. Accounts with a Salary record or stock and mutual fund holdings will appear here after each month ends.</p>}
    {periods.map(period => <div key={period} className="monthly-period">
      <h4>{periodLabel(period)}</h4>
      <ul>{items.filter(item => item.period === period && (!locked || item.status === 'missing')).map(item => <UploadRow key={item.key} item={item} canSubmit={canSubmit} onUpload={onUpload} onMarkUnavailable={onMarkUnavailable} />)}</ul>
    </div>)}
  </section>;
}
