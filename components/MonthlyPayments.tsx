"use client";

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { fmt, num } from '@/lib/calculations';
import { firstWordMatch, mergeRecurring, parseRecurringImport, paymentTotals, type PayAccount, type PaymentItem, type RecurringKind, type RecurringPayment } from '@/lib/monthlyPayments';

type Props = {
  monthTitle: string; items: PaymentItem[]; accounts: PayAccount[]; liquidity: number; canEdit: boolean; recurring: RecurringPayment[];
  onPay: (item: PaymentItem, amount: number, fromId: string) => Promise<boolean>;
  onUndo: (item: PaymentItem) => Promise<boolean>;
  onAdd: (label: string, amount: number, dueDate: string) => Promise<boolean>;
  onRemove: (item: PaymentItem) => Promise<boolean>;
  onAmount: (item: PaymentItem, amount: number) => Promise<boolean>;
  onSaveRecurring: (items: RecurringPayment[]) => Promise<boolean>;
};
const KINDS: { id: RecurringKind; title: string }[] = [{ id: 'regular', title: 'Same each month' }, { id: 'card', title: 'Credit card (changes monthly)' }, { id: 'on_card', title: 'Auto-debited on a card' }, { id: 'transfer', title: 'Transfer between my accounts' }];

/**
 * A regular payment names the account it comes from. A loan EMI names its lender, which is only
 * a source if you hold savings there, so it never matches the OD account of another loan.
 */
const accountFor = (item: PaymentItem, accounts: PayAccount[], fallback: string) =>
  accounts.find(account => (item.recurringId || account.kind === 'savings') && firstWordMatch(item.bank, account))?.id || fallback;

function PaymentRow({ item, fromId, canEdit, onPay, onUndo, onRemove, onAmount }: { item: PaymentItem; fromId: string } & Pick<Props, 'canEdit' | 'onPay' | 'onUndo' | 'onRemove' | 'onAmount'>) {
  const [amount, setAmount] = useState(String(Math.round(item.amount))), [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<boolean>) => { setBusy(true); try { await action(); } finally { setBusy(false); } };
  const name = <th scope="row" className="mom-sticky"><span>{item.label}</span><small>{[item.type, item.bank, item.note].filter(Boolean).join(' · ')}</small></th>;
  if (item.informational) return <tr>{name}<td>{item.dueDate || '—'}</td><td>{fmt(item.amount)}</td><td><span className="monthly-pill">Included in the card bill</span></td><td /></tr>;
  return <tr>
    {name}
    <td>{item.dueDate || (item.recurringId || item.custom ? '—' : 'Add first EMI date')}</td>
    {item.paid ? <>
      <td>{fmt(item.paid.amount)}</td>
      <td><span className="monthly-pill monthly-ok"><CheckCircle2 size={13} /> {item.transfer ? `Moved ${item.paid.paid_on} from ${item.paid.from_name} to ${item.paid.to_name}` : `Paid ${item.paid.paid_on} from ${item.paid.from_name}`}</span></td>
      <td>{canEdit && <button type="button" className="btn" disabled={busy} onClick={() => void run(() => onUndo(item))}>Undo</button>}</td>
    </> : <>
      <td>{canEdit ? <input className="mom-input" inputMode="decimal" aria-label={`Amount for ${item.label}`} value={amount} onChange={event => setAmount(event.target.value)} onBlur={() => { if (item.recurringId && num(amount) !== item.amount) void onAmount(item, num(amount)); }} /> : fmt(item.amount)}</td>
      <td><span className="monthly-pill">{item.transfer ? `To move to ${item.to}` : item.type === 'Credit card' && !num(amount) ? 'Enter this month\'s bill' : 'To pay'}</span></td>
      <td>{canEdit && <div className="pay-actions"><button type="button" className="btn-primary" disabled={busy || num(amount) <= 0} onClick={() => void run(() => onPay(item, num(amount), fromId))}>{item.transfer ? 'Mark moved' : 'Mark paid'}</button>{item.custom && <button type="button" className="btn" disabled={busy} onClick={() => void run(() => onRemove(item))}>Remove</button>}</div>}</td>
    </>}
  </tr>;
}

function RecurringEditor({ recurring, onSaveRecurring }: Pick<Props, 'recurring' | 'onSaveRecurring'>) {
  const [label, setLabel] = useState(''), [amount, setAmount] = useState(''), [day, setDay] = useState(''), [via, setVia] = useState(''), [kind, setKind] = useState<RecurringKind>('regular'), [to, setTo] = useState(''), [error, setError] = useState('');
  return <details className="pay-recurring">
    <summary>Regular payments ({recurring.length})</summary>
    {!!recurring.length && <ul>{recurring.map(row => <li key={row.id}>
      <span><strong>{row.label}</strong> {fmt(row.amount)}{row.due_day ? `, due on day ${row.due_day}` : ''}{row.via ? `, via ${row.via}` : ''}{row.note ? ` (${row.note})` : ''}</span>
      <button type="button" className="btn" onClick={() => void onSaveRecurring(recurring.filter(item => item.id !== row.id))}>Remove</button>
    </li>)}</ul>}
    <form className="pay-add" onSubmit={async event => {
      event.preventDefault();
      if (!label.trim()) return;
      const dueDay = Math.round(num(day));
      const next: RecurringPayment = { id: `r${Date.now()}`, label: label.trim(), amount: Math.max(0, num(amount)), due_day: dueDay >= 1 && dueDay <= 31 ? dueDay : null, via: via.trim(), kind, to: to.trim() };
      if (await onSaveRecurring([...recurring, next])) { setLabel(''); setAmount(''); setDay(''); setVia(''); setTo(''); setKind('regular'); }
    }}>
      <label>Name<input required maxLength={80} value={label} onChange={event => setLabel(event.target.value)} /></label>
      <label>Amount (₹)<input inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} /></label>
      <label>Due day<input inputMode="numeric" value={day} onChange={event => setDay(event.target.value)} /></label>
      <label>Paid via<input value={via} placeholder="For example: Axis OD" onChange={event => setVia(event.target.value)} /></label>
      <label>Type<select value={kind} onChange={event => setKind(event.target.value as RecurringKind)}>{KINDS.map(option => <option key={option.id} value={option.id}>{option.title}</option>)}</select></label>
      {kind === 'transfer' && <label>Moves to<input required value={to} placeholder="For example: HDFC" onChange={event => setTo(event.target.value)} /></label>}
      <button type="submit" className="btn">Add</button>
    </form>
    <label className="pay-import">Import a list from a file<input type="file" accept=".json,application/json" onChange={async event => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      try { setError(''); await onSaveRecurring(mergeRecurring(recurring, parseRecurringImport(await file.text()))); } catch { setError('That file could not be read as a payment list.'); }
    }} /></label>
    {error && <p role="alert" className="sale-error">{error}</p>}
  </details>;
}

export default function MonthlyPayments({ monthTitle, items, accounts, liquidity, canEdit, recurring, onPay, onUndo, onAdd, onRemove, onAmount, onSaveRecurring }: Props) {
  const [fromId, setFromId] = useState(''), [label, setLabel] = useState(''), [amount, setAmount] = useState(''), [dueDate, setDueDate] = useState('');
  const totals = paymentTotals(items), selected = fromId || accounts[0]?.id || 'other', after = liquidity - totals.remaining;
  return <section className="mom" aria-label={`Payments for ${monthTitle}`}>
    <div className="sale-preview">
      <span><small>Payments in {monthTitle}</small><strong>{fmt(totals.total)}</strong></span>
      <span><small>Already paid</small><strong>{fmt(totals.paid)}</strong></span>
      <span><small>Still to pay</small><strong className={totals.remaining ? 'mom-down' : 'mom-up'}>{fmt(totals.remaining)}</strong></span>
      <span><small>Liquidity now</small><strong>{fmt(liquidity)}</strong></span>
      <span><small>Liquidity after payments</small><strong className={after < 0 ? 'mom-down' : ''}>{fmt(after)}</strong></span>
    </div>
    {canEdit && <label className="pay-from">Pay from<select value={selected} onChange={event => setFromId(event.target.value)}>
      {accounts.map(account => <option key={account.id} value={account.id}>{account.kind === 'od' ? `${account.name} OD: ${fmt(account.parked)} parked` : `${account.name} savings: ${fmt(account.parked)}`}</option>)}
      <option value="other">Another account (do not deduct anything)</option>
    </select></label>}
    <p className="mom-note">Marking a payment paid deducts it from the account shown, lowering liquidity; taking it from an OD account also raises the balance that bears interest. A transfer moves money between your accounts, so liquidity stays the same. Salary or rent paid into an account is not added automatically, so update that balance when it comes in.</p>
    {!items.length && <p className="mom-note">No payments due this month. Add your regular payments below. Loans with an EMI and premiums falling due this month appear automatically.</p>}
    {!!items.length && <div className="mom-scroll" tabIndex={0} role="region" aria-label="Payments due"><table>
      <thead><tr><th scope="col" className="mom-sticky">Payment</th><th scope="col">Due</th><th scope="col">Amount</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{items.map(item => <PaymentRow key={`${item.id}:${item.amount}`} item={item} fromId={accountFor(item, accounts, selected)} canEdit={canEdit} onPay={onPay} onUndo={onUndo} onRemove={onRemove} onAmount={onAmount} />)}</tbody>
    </table></div>}
    {canEdit && <RecurringEditor recurring={recurring} onSaveRecurring={onSaveRecurring} />}
    {canEdit && <form className="pay-add" onSubmit={async event => {
      event.preventDefault();
      if (!label.trim() || num(amount) <= 0) return;
      if (await onAdd(label.trim(), num(amount), dueDate)) { setLabel(''); setAmount(''); setDueDate(''); }
    }}>
      <label>Add a one-off payment for this month<input required maxLength={80} value={label} onChange={event => setLabel(event.target.value)} /></label>
      <label>Amount (₹)<input required inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} /></label>
      <label>Due date<input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} /></label>
      <button type="submit" className="btn">Add</button>
    </form>}
  </section>;
}
