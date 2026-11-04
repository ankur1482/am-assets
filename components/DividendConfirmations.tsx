"use client";

import { useState } from 'react';
import { fmt, num } from '@/lib/calculations';
import type { PendingDividend } from '@/lib/dividends';
import type { PayAccount } from '@/lib/monthlyPayments';

type Received = { id: string; data: Record<string, any> };
type Props = {
  pending: PendingDividend[]; received: Received[]; accounts: PayAccount[]; canEdit: boolean; loading: boolean; today: string;
  onReceived: (item: PendingDividend, amount: number, receivedOn: string, creditId: string) => Promise<boolean>;
  onNotReceived: (item: PendingDividend) => Promise<boolean>;
  onUndo: (record: Received) => Promise<boolean>;
};

function PendingRow({ item, accounts, today, canEdit, onReceived, onNotReceived }: { item: PendingDividend } & Pick<Props, 'accounts' | 'today' | 'canEdit' | 'onReceived' | 'onNotReceived'>) {
  const [amount, setAmount] = useState(String(Number(item.amount.toFixed(2)))), [date, setDate] = useState(today), [creditId, setCreditId] = useState(''), [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<boolean>) => { setBusy(true); try { await action(); } finally { setBusy(false); } };
  const foreign = item.currency !== 'INR';
  return <article className="div-card">
    <div>
      <strong>{item.name} · {item.account}</strong>
      <p>{foreign ? `${item.currency} ` : '₹'}{item.perShare} a share, ex-date {item.exDate}, on {Number(item.quantity.toFixed(4))} shares.{item.uncertain ? ' Some lots have no purchase date, so check the quantity.' : ''}{foreign ? ` The amount is in ${item.currency}, so enter what you received in rupees.` : ''}</p>
      <p className="div-question">Have you received this dividend?</p>
    </div>
    {canEdit && <div className="div-fields">
      <label>Amount received (₹)<input inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} /></label>
      <label>Date received<input type="date" value={date} max={today} min={item.exDate} onChange={event => setDate(event.target.value)} /></label>
      <label>Credited to<select value={creditId} onChange={event => setCreditId(event.target.value)}><option value="">Do not update a balance</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name} {account.kind === 'od' ? 'OD' : 'savings'}</option>)}</select></label>
      <div className="pay-actions">
        <button type="button" className="btn-primary" disabled={busy || num(amount) <= 0 || !date} onClick={() => void run(() => onReceived(item, num(amount), date, creditId))}>Yes, received</button>
        <button type="button" className="btn" disabled={busy} onClick={() => void run(() => onNotReceived(item))}>No, not due to me</button>
      </div>
    </div>}
  </article>;
}

export default function DividendConfirmations({ pending, received, accounts, canEdit, loading, today, onReceived, onNotReceived, onUndo }: Props) {
  const [busyId, setBusyId] = useState('');
  return <section className="mom" aria-label="Dividends to confirm">
    <p className="mom-note">Dividends declared on your stocks and ETFs since April of this financial year, based on shares you held on each ex-date. They appear from the ex-date, because the data source does not list them ahead of it. If one has not reached your account yet, leave it and answer later. Enter the amount actually credited, since tax may have been deducted.</p>
    {loading && <p className="mom-note">Looking up dividends…</p>}
    {!loading && !pending.length && <p className="mom-note">Nothing to confirm right now.</p>}
    {pending.map(item => <PendingRow key={item.key} item={item} accounts={accounts} today={today} canEdit={canEdit} onReceived={onReceived} onNotReceived={onNotReceived} />)}
    {!!received.length && <div className="mom-scroll" tabIndex={0} role="region" aria-label="Dividends received"><table>
      <caption className="pay-caption">Received: {fmt(received.reduce((sum, record) => sum + num(record.data.amount), 0))}</caption>
      <thead><tr><th scope="col" className="mom-sticky">Stock</th><th scope="col">Ex-date</th><th scope="col">Received</th><th scope="col">Amount</th><th scope="col">Credited to</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{received.map(record => <tr key={record.id}>
        <th scope="row" className="mom-sticky"><span>{record.data.security_name}</span><small>{record.data.account_name}</small></th>
        <td>{record.data.ex_date}</td><td>{record.data.received_on}</td><td>{fmt(record.data.amount)}</td><td>{record.data.credit_name || '—'}</td>
        <td>{canEdit && <button type="button" className="btn" disabled={busyId === record.id} onClick={async () => { setBusyId(record.id); try { await onUndo(record); } finally { setBusyId(''); } }}>Undo</button>}</td>
      </tr>)}</tbody>
    </table></div>}
  </section>;
}
