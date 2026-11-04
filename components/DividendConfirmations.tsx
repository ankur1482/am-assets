"use client";

import { useState } from 'react';
import { fmt, num } from '@/lib/calculations';
import { PAYOUT_ESTIMATE_DAYS, receiptCheck, validateReceipt, type PendingDividend } from '@/lib/dividends';
import { DIVIDEND_BANK, dividendAccountFor, payAccountLabel, type PayAccount } from '@/lib/monthlyPayments';

/** Chosen when this person has no HDFC savings row yet, so saving the dividend creates one. */
export const NEW_DIVIDEND_ACCOUNT = 'new-dividend-account';

type Received = { id: string; data: Record<string, any> };
type Props = {
  pending: PendingDividend[]; received: Received[]; accounts: PayAccount[]; canEdit: boolean; loading: boolean; today: string;
  onReceived: (item: PendingDividend, amount: number, receivedOn: string, creditId: string) => Promise<boolean>;
  onNotReceived: (item: PendingDividend) => Promise<boolean>;
  onPayoutDate: (item: PendingDividend, payoutDate: string) => Promise<boolean>;
  onUndo: (record: Received) => Promise<boolean>;
};

function PendingRow({ item, accounts, today, canEdit, onReceived, onNotReceived, onPayoutDate }: { item: PendingDividend } & Pick<Props, 'accounts' | 'today' | 'canEdit' | 'onReceived' | 'onNotReceived' | 'onPayoutDate'>) {
  const [amount, setAmount] = useState(String(Number(item.amount.toFixed(2)))), [date, setDate] = useState(today > item.payoutDate ? item.payoutDate : today), [chosenCredit, setCredit] = useState(''), [busy, setBusy] = useState(false);
  const ownAccount = dividendAccountFor(accounts, item.account), creditId = chosenCredit || ownAccount?.id || NEW_DIVIDEND_ACCOUNT;
  const run = async (action: () => Promise<boolean>) => { setBusy(true); try { await action(); } finally { setBusy(false); } };
  const foreign = item.currency !== 'INR', error = validateReceipt(item, date, num(amount), today);
  const question = item.state === 'awaiting' ? `Expected by ${item.payoutDate}. We will ask once that date arrives, or answer now if it has already been credited.` : item.state === 'overdue' ? `The payout date ${item.payoutDate} has passed by some time. Has this dividend reached your account?` : `The payout date ${item.payoutDate} has arrived. Have you received this dividend?`;
  return <article className={`div-card ${item.state === 'overdue' ? 'div-overdue' : ''}`}>
    <div>
      <strong>{item.name} · {item.account}</strong>
      <p>{foreign ? `${item.currency} ` : '₹'}{item.perShare} a share, ex-date {item.exDate}, on {Number(item.quantity.toFixed(4))} shares.{item.uncertain ? ' Some lots have no purchase date, so check the quantity.' : ''}{foreign ? ` The amount is in ${item.currency}, so enter what you received in rupees.` : ''}</p>
      <p className="div-question">{question}</p>
    </div>
    {canEdit && <div className="div-fields">
      <label>Payout date {item.payoutEstimated ? '(estimated)' : '(entered)'}<input type="date" defaultValue={item.payoutDate} min={item.exDate} disabled={busy} onBlur={event => { const value = event.target.value; if (value && value !== item.payoutDate) void run(() => onPayoutDate(item, value)); }} /></label>
      <label>Amount received (₹)<input inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} /></label>
      <label>Date received<input type="date" value={date} max={today} min={item.exDate} onChange={event => setDate(event.target.value)} /></label>
      <label>Credited to<select value={creditId} onChange={event => setCredit(event.target.value)}>
        {!ownAccount && <option value={NEW_DIVIDEND_ACCOUNT}>{DIVIDEND_BANK} savings ({item.account}): create</option>}
        {accounts.map(account => <option key={account.id} value={account.id}>{payAccountLabel(account)}</option>)}
        <option value="none">Do not update a balance</option>
      </select></label>
      <div className="pay-actions">
        <button type="button" className="btn-primary" disabled={busy || !!error} onClick={() => void run(() => onReceived(item, num(amount), date, creditId))}>Yes, received</button>
        <button type="button" className="btn" disabled={busy} onClick={() => void run(() => onNotReceived(item))}>No, not due to me</button>
      </div>
    </div>}
    {canEdit && error && <p role="alert" className="sale-error">{error}</p>}
  </article>;
}

export default function DividendConfirmations({ pending, received, accounts, canEdit, loading, today, onReceived, onNotReceived, onPayoutDate, onUndo }: Props) {
  const [busyId, setBusyId] = useState('');
  const asked = pending.filter(item => item.state !== 'awaiting'), waiting = pending.filter(item => item.state === 'awaiting');
  const row = (item: PendingDividend) => <PendingRow key={`${item.key}:${item.payoutDate}`} item={item} accounts={accounts} today={today} canEdit={canEdit} onReceived={onReceived} onNotReceived={onNotReceived} onPayoutDate={onPayoutDate} />;
  return <section className="mom" aria-label="Dividends to confirm">
    <p className="mom-note">Dividends on your stocks and ETFs since April of this financial year, based on shares held on each ex-date. The data sources give the ex-date but not the payout date, so the payout date is estimated at {PAYOUT_ESTIMATE_DAYS} days after the ex-date until you enter the real one from the company&apos;s notice. Final dividends are often paid later than this. Enter the amount actually credited, since tax may have been deducted. Each dividend is added to that person&apos;s own {DIVIDEND_BANK} savings balance, unless you choose otherwise.</p>
    {loading && <p className="mom-note">Looking up dividends…</p>}
    {!loading && !pending.length && <p className="mom-note">Nothing to confirm right now.</p>}
    {!!asked.length && <h4 className="div-heading">Payout date reached ({asked.length})</h4>}
    {asked.map(row)}
    {!!waiting.length && <h4 className="div-heading">Waiting for payout ({waiting.length})</h4>}
    {waiting.map(row)}
    {!!received.length && <div className="mom-scroll" tabIndex={0} role="region" aria-label="Dividends received"><table>
      <caption className="pay-caption">Received: {fmt(received.reduce((sum, record) => sum + num(record.data.amount), 0))}</caption>
      <thead><tr><th scope="col" className="mom-sticky">Stock</th><th scope="col">Ex-date</th><th scope="col">Payout date</th><th scope="col">Received</th><th scope="col">Amount</th><th scope="col">Check</th><th scope="col">Credited to</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{received.map(record => <tr key={record.id}>
        <th scope="row" className="mom-sticky"><span>{record.data.security_name}</span><small>{record.data.account_name}</small></th>
        <td>{record.data.ex_date}</td><td>{record.data.payout_date || '—'}</td><td>{record.data.received_on}</td><td>{fmt(record.data.amount)}</td><td className="div-check">{receiptCheck(record.data) || '—'}</td><td>{record.data.credit_name || '—'}</td>
        <td>{canEdit && <button type="button" className="btn" disabled={busyId === record.id} onClick={async () => { setBusyId(record.id); try { await onUndo(record); } finally { setBusyId(''); } }}>Undo</button>}</td>
      </tr>)}</tbody>
    </table></div>}
  </section>;
}
