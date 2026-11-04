"use client";

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { fmt, formatDate, num } from '@/lib/calculations';
import { expensesByTag, type CardSpend, type ExpenseTag } from '@/lib/expenses';

type NewExpense = { amount: number; label: string; tag: ExpenseTag; date: string };
type ExpenseRow = { id: string; data: Record<string, any> };

/** Logging form, kept short enough to use one-handed: amount, what for, one tap on how it was paid. */
function ExpenseForm({ tags, today, lastTag, onSave, onDone }: { tags: ExpenseTag[]; today: string; lastTag: string; onSave: (expense: NewExpense) => Promise<boolean>; onDone?: () => void }) {
  const [amount, setAmount] = useState(''), [label, setLabel] = useState(''), [date, setDate] = useState(today), [busy, setBusy] = useState(false), [saved, setSaved] = useState('');
  const [tagId, setTagId] = useState(tags.some(tag => tag.id === lastTag) ? lastTag : tags[0]?.id || '');
  const tag = tags.find(item => item.id === tagId);
  return <form className="expense-form" onSubmit={async event => {
    event.preventDefault();
    if (busy || num(amount) <= 0 || !tag) return;
    setBusy(true);
    try {
      if (await onSave({ amount: num(amount), label: label.trim(), tag, date })) {
        setSaved(`${fmt(amount)} saved on ${tag.label}`);
        setAmount(''); setLabel('');
        onDone?.();
      }
    } finally { setBusy(false); }
  }}>
    <label>Amount (₹)<input required autoFocus inputMode="decimal" value={amount} onChange={event => { setAmount(event.target.value); setSaved(''); }} /></label>
    <label>Spent on (optional)<input maxLength={80} value={label} placeholder="For example: groceries" onChange={event => setLabel(event.target.value)} /></label>
    <div className="expense-tags" role="group" aria-label="Paid with">
      {tags.map(option => <button key={option.id} type="button" aria-pressed={tagId === option.id} onClick={() => setTagId(option.id)}>{option.label}</button>)}
    </div>
    <label>Date<input type="date" required value={date} max={today} onChange={event => setDate(event.target.value)} /></label>
    <button type="submit" className="btn-primary" disabled={busy || num(amount) <= 0 || !tag}>{busy ? 'Saving…' : 'Save expense'}</button>
    {saved && <p role="status" className="backup-good">{saved}</p>}
  </form>;
}

/** Always-available button on the phone, so an expense can be logged the moment it happens. */
export function QuickExpenseButton(props: { tags: ExpenseTag[]; today: string; lastTag: string; onSave: (expense: NewExpense) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button type="button" className="expense-fab" aria-label="Add an expense" onClick={() => setOpen(true)}><Plus size={26} /></button>;
  return <div className="expense-sheet" role="dialog" aria-modal="true" aria-label="Add an expense" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
    <div>
      <header><h3>Add an expense</h3><button type="button" className="btn" aria-label="Close" onClick={() => setOpen(false)}><X size={16} /></button></header>
      <ExpenseForm {...props} onDone={() => setOpen(false)} />
    </div>
  </div>;
}

export default function ExpensesPanel({ monthTitle, tags, today, lastTag, rows, byTag, cards, canEdit, onSave, onDelete }: { monthTitle: string; tags: ExpenseTag[]; today: string; lastTag: string; rows: ExpenseRow[]; byTag: ReturnType<typeof expensesByTag>; cards: CardSpend[]; canEdit: boolean; onSave: (expense: NewExpense) => Promise<boolean>; onDelete: (row: ExpenseRow) => Promise<boolean> }) {
  const [busyId, setBusyId] = useState('');
  const total = byTag.reduce((sum, row) => sum + row.total, 0), usedCards = cards.filter(card => card.spend > 0);
  return <section className="mom" aria-label={`Expenses for ${monthTitle}`}>
    <div className="sale-preview">
      <span><small>Spent in {monthTitle}</small><strong>{fmt(total)}</strong></span>
      {byTag.map(row => <span key={row.label}><small>{row.label}</small><strong>{fmt(row.total)}</strong><small>{row.count} expense{row.count === 1 ? '' : 's'}</small></span>)}
    </div>
    {!!usedCards.length && <div className="mom-scroll" tabIndex={0} role="region" aria-label="Estimated card statements"><table>
      <caption className="pay-caption">Estimated next card statement, from what is recorded this calendar month. Your real statement cycle may differ.</caption>
      <thead><tr><th scope="col" className="mom-sticky">Card</th><th scope="col">Expenses</th><th scope="col">Payments on card</th><th scope="col">Auto-debits</th><th scope="col">Estimated statement</th></tr></thead>
      <tbody>{usedCards.map(card => <tr key={card.id}><th scope="row" className="mom-sticky">{card.label}</th><td>{fmt(card.expenses)}</td><td>{fmt(card.payments)}</td><td>{fmt(card.autoDebits)}</td><td><strong>{fmt(card.spend)}</strong></td></tr>)}</tbody>
    </table></div>}
    {canEdit && <details className="pay-recurring"><summary>Add an expense</summary><ExpenseForm tags={tags} today={today} lastTag={lastTag} onSave={onSave} /></details>}
    {!rows.length && <p className="mom-note">No expenses logged this month.</p>}
    {!!rows.length && <div className="mom-scroll" tabIndex={0} role="region" aria-label="Expenses this month"><table>
      <thead><tr><th scope="col" className="mom-sticky">Spent on</th><th scope="col">Date</th><th scope="col">Paid with</th><th scope="col">Amount</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id}>
        <th scope="row" className="mom-sticky">{row.data.label || '—'}</th><td>{formatDate(row.data.date)}</td><td>{row.data.tag_label}</td><td>{fmt(row.data.amount)}</td>
        <td>{canEdit && <button type="button" className="btn" disabled={busyId === row.id} onClick={async () => { setBusyId(row.id); try { await onDelete(row); } finally { setBusyId(''); } }}>Remove</button>}</td>
      </tr>)}</tbody>
    </table></div>}
    <p className="mom-note">Card spending counts towards the card&apos;s statement rather than your cash flow today. Google Pay and cash count in this month&apos;s cash flow, but no bank balance changes, so update balances when you reconcile.</p>
  </section>;
}
