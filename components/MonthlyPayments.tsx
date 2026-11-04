"use client";

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { fmt, formatDate, num } from '@/lib/calculations';
import { defaultSource, payAccountLabel, mergeRecurring, monthName, parseRecurringImport, paymentTotals, type PayAccount, type PaymentItem, type RecurringKind, type RecurringPayment, type YearlyCommitment } from '@/lib/monthlyPayments';

type Props = {
  monthTitle: string; items: PaymentItem[]; accounts: PayAccount[]; liquidity: number; canEdit: boolean; recurring: RecurringPayment[]; yearly: YearlyCommitment[];
  onPay: (item: PaymentItem, amount: number, fromId: string) => Promise<boolean>;
  onUndo: (item: PaymentItem) => Promise<boolean>;
  onAdd: (label: string, amount: number, dueDate: string, fromId: string, alreadyPaid: boolean) => Promise<boolean>;
  onEditPaid: (item: PaymentItem, amount: number) => Promise<boolean>;
  onRemove: (item: PaymentItem) => Promise<boolean>;
  onAmount: (item: PaymentItem, amount: number) => Promise<boolean>;
  onSaveRecurring: (items: RecurringPayment[]) => Promise<boolean>;
};
const KINDS: { id: RecurringKind; title: string }[] = [{ id: 'regular', title: 'Same each month' }, { id: 'card', title: 'Credit card (changes monthly)' }, { id: 'on_card', title: 'Auto-debited on a card' }, { id: 'transfer', title: 'Transfer between my accounts' }];

function PaymentRow({ item, accounts, fromId, canEdit, onPay, onUndo, onRemove, onAmount, onEditPaid }: { item: PaymentItem; accounts: PayAccount[]; fromId: string } & Pick<Props, 'canEdit' | 'onPay' | 'onUndo' | 'onRemove' | 'onAmount' | 'onEditPaid'>) {
  const [amount, setAmount] = useState(String(Math.round(item.paid?.amount ?? item.amount))), [busy, setBusy] = useState(false), [chosen, setChosen] = useState('');
  const source = chosen || fromId;
  const run = async (action: () => Promise<boolean>) => { setBusy(true); try { await action(); } finally { setBusy(false); } };
  const name = <th scope="row" className="mom-sticky"><span>{item.label}</span><small>{[item.type, item.bank, item.note].filter(Boolean).join(' · ')}</small></th>;
  if (item.informational && !item.paid) return <tr>{name}<td>{item.dueDate ? formatDate(item.dueDate) : '—'}</td><td>{fmt(item.amount)}</td><td>{item.bank || '—'}{item.transfer && item.to ? ` to ${item.to}` : ''}</td><td><span className="monthly-pill">{item.transfer ? 'Automatic, no action needed' : 'Included in the card bill'}</span></td><td /></tr>;
  return <tr>
    {name}
    <td>{item.dueDate ? formatDate(item.dueDate) : (item.recurringId || item.custom ? '—' : 'Add first EMI date')}</td>
    {item.paid ? <>
      <td>{canEdit && !item.transfer ? <input className="mom-input" inputMode="decimal" aria-label={`Amount paid for ${item.label}`} disabled={busy} value={amount} onChange={event => setAmount(event.target.value)} onBlur={() => { if (num(amount) > 0 && num(amount) !== num(item.paid?.amount)) void run(() => onEditPaid(item, num(amount))); }} /> : fmt(item.paid.amount)}</td>
      <td><strong>{item.paid.from_name}{item.paid.from_kind ? ` ${item.paid.from_kind === 'od' ? 'OD' : 'savings'}` : ''}</strong>{item.transfer ? ` to ${item.paid.to_name}` : ''}</td>
      <td><span className="monthly-pill monthly-ok"><CheckCircle2 size={13} /> {item.transfer ? 'Moved' : 'Paid'} {formatDate(item.paid.paid_on)}</span></td>
      <td>{canEdit && <button type="button" className="btn" disabled={busy} onClick={() => void run(() => onUndo(item))}>Undo</button>}</td>
    </> : <>
      <td>{canEdit ? <input className="mom-input" inputMode="decimal" aria-label={`Amount for ${item.label}`} value={amount} onChange={event => setAmount(event.target.value)} onBlur={() => { if (item.recurringId && num(amount) !== item.amount) void onAmount(item, num(amount)); }} /> : fmt(item.amount)}</td>
      <td>{canEdit
        ? <select className="pay-source" aria-label={`Paid from for ${item.label}`} value={source} onChange={event => setChosen(event.target.value)}>
            {accounts.map(account => <option key={account.id} value={account.id}>{payAccountLabel(account)}: {fmt(account.parked)}</option>)}
            <option value="other">Another account (no deduction)</option>
          </select>
        : item.bank || '—'}</td>
      <td><span className="monthly-pill">{item.type === 'Credit card' && !num(amount) ? 'Enter this month\'s bill' : 'To pay'}</span></td>
      <td>{canEdit && <div className="pay-actions"><button type="button" className="btn-primary" disabled={busy || num(amount) <= 0} onClick={() => void run(() => onPay(item, num(amount), source))}>Mark paid</button>{item.custom && <button type="button" className="btn" disabled={busy} onClick={() => void run(() => onRemove(item))}>Remove</button>}</div>}</td>
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

export default function MonthlyPayments({ monthTitle, items, accounts, liquidity, canEdit, recurring, yearly, onPay, onUndo, onAdd, onRemove, onAmount, onEditPaid, onSaveRecurring }: Props) {
  const [fromId, setFromId] = useState(''), [label, setLabel] = useState(''), [amount, setAmount] = useState(''), [dueDate, setDueDate] = useState(''), [addFrom, setAddFrom] = useState(''), [alreadyPaid, setAlreadyPaid] = useState(true), [adding, setAdding] = useState(false);
  const totals = paymentTotals(items), selected = fromId || accounts[0]?.id || 'other', after = liquidity - totals.remaining;
  return <section className="mom" aria-label={`Payments for ${monthTitle}`}>
    <div className="sale-preview">
      <span><small>Payments in {monthTitle}</small><strong>{fmt(totals.total)}</strong></span>
      <span><small>Already paid</small><strong>{fmt(totals.paid)}</strong></span>
      <span><small>Still to pay</small><strong className={totals.remaining ? 'mom-down' : 'mom-up'}>{fmt(totals.remaining)}</strong></span>
      <span><small>Liquidity now</small><strong>{fmt(liquidity)}</strong></span>
      <span><small>Liquidity after payments</small><strong className={after < 0 ? 'mom-down' : ''}>{fmt(after)}</strong></span>
    </div>
    {canEdit && <label className="pay-from">Default account for each row<select value={selected} onChange={event => setFromId(event.target.value)}>
      {accounts.map(account => <option key={account.id} value={account.id}>{payAccountLabel(account)}: {fmt(account.parked)}</option>)}
      <option value="other">Another account (do not deduct anything)</option>
    </select></label>}
    <p className="mom-note">Marking a payment paid deducts it from the account shown, lowering liquidity; taking it from an OD account also raises the balance that bears interest. Choose the account in each row's Paid From column before marking it paid. Paid amounts can be changed, and the difference goes back to or comes out of that account. Salary or rent paid into an account is not added automatically, so update that balance when it comes in.</p>
    {!items.length && <p className="mom-note">No payments due this month. Add your regular payments below. Loans with an EMI and premiums falling due this month appear automatically.</p>}
    {!!items.length && <div className="mom-scroll" tabIndex={0} role="region" aria-label="Payments due"><table>
      <thead><tr><th scope="col" className="mom-sticky">Payment</th><th scope="col">Due</th><th scope="col">Amount</th><th scope="col">Paid from</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{items.map(item => <PaymentRow key={item.id} item={item} accounts={accounts} fromId={defaultSource(item, items, accounts, selected)} canEdit={canEdit} onPay={onPay} onUndo={onUndo} onRemove={onRemove} onAmount={onAmount} onEditPaid={onEditPaid} />)}</tbody>
    </table></div>}
    {canEdit && <form className="pay-add pay-add-row" onSubmit={async event => {
      event.preventDefault();
      if (!label.trim() || num(amount) <= 0 || adding) return;
      setAdding(true);
      try { if (await onAdd(label.trim(), num(amount), dueDate, addFrom || selected, alreadyPaid)) { setLabel(''); setAmount(''); setDueDate(''); } } finally { setAdding(false); }
    }}>
      <h4>Add a payment row</h4>
      <label>What was it for<input required maxLength={80} value={label} placeholder="For example: credit card, school fees" onChange={event => setLabel(event.target.value)} /></label>
      <label>Amount (₹)<input required inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} /></label>
      <label>Date<input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} /></label>
      <label>Paid from<select value={addFrom || selected} onChange={event => setAddFrom(event.target.value)}>
        {accounts.map(account => <option key={account.id} value={account.id}>{payAccountLabel(account)}: {fmt(account.parked)}</option>)}
        <option value="other">Another account (no deduction)</option>
      </select></label>
      <label className="pay-check"><input type="checkbox" checked={alreadyPaid} onChange={event => setAlreadyPaid(event.target.checked)} /> Already paid</label>
      <button type="submit" className="btn-primary" disabled={adding}>{adding ? 'Adding…' : 'Add row'}</button>
    </form>}
    {!!yearly.length && <div className="mom-scroll" tabIndex={0} role="region" aria-label="Yearly investments and premiums"><table>
      <caption className="pay-caption">Yearly investments and premiums: {fmt(yearly.reduce((sum, row) => sum + row.amount, 0))} a year. Each joins the payments above in its due month.</caption>
      <thead><tr><th scope="col" className="mom-sticky">Item</th><th scope="col">Due month</th><th scope="col">Amount a year</th></tr></thead>
      <tbody>{yearly.map(row => <tr key={row.id}><th scope="row" className="mom-sticky"><span>{row.label}</span><small>{[row.type, row.account].filter(Boolean).join(' · ')}</small></th><td>{row.dueMonth ? monthName(row.dueMonth) : (row.type === 'Insurance premium' ? 'Add the next due date' : 'Add a due month')}</td><td>{fmt(row.amount)}</td></tr>)}</tbody>
    </table></div>}
    {canEdit && <RecurringEditor recurring={recurring} onSaveRecurring={onSaveRecurring} />}
  </section>;
}
