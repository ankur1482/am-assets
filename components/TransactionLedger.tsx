"use client";

import { useMemo, useState } from 'react';
import { fmt, num } from '@/lib/calculations';
import { gainsByFinancialYear, LONG_TERM_MONTHS, planSale, postedSales, type SaleInput, type SaleLot } from '@/lib/transactions';

type LedgerRecord = { id: string; module_key: string; data: Record<string, any> };
export type BuyRow = { id: string; date: string; name: string; account: string; quantity: number; amount: number };

const tone = (value: number) => (value > 0 ? 'mom-up' : value < 0 ? 'mom-down' : '');
const amount = (value: number) => <span className={tone(value)}>{fmt(value)}</span>;
const fyLabel = (year: number) => `FY ${year}-${String(year + 1).slice(2)}`;

/** Sale entry form. The preview uses the same calculation that will be saved. */
export function RecordSaleForm({ name, lots, today, onSubmit, onCancel }: { name: string; lots: SaleLot[]; today: string; onSubmit: (input: SaleInput) => Promise<boolean>; onCancel: () => void }) {
  const [date, setDate] = useState(today), [quantity, setQuantity] = useState(''), [price, setPrice] = useState(''), [charges, setCharges] = useState(''), [busy, setBusy] = useState(false);
  const input: SaleInput = { date, quantity: num(quantity), price: num(price), charges: num(charges) };
  const plan = planSale(lots, input), started = quantity !== '' || price !== '';
  return <form className="sale-form" onSubmit={async event => {
    event.preventDefault();
    if (plan.error || busy) return;
    setBusy(true);
    try { await onSubmit(input); } finally { setBusy(false); }
  }}>
    <p>Recording a sale of <strong>{name}</strong>. Oldest lots are sold first. You hold {plan.available} on this date.</p>
    <div className="sale-fields">
      <label>Sale date<input type="date" required value={date} max={today} onChange={event => setDate(event.target.value)} /></label>
      <label>Quantity sold<input inputMode="decimal" required value={quantity} onChange={event => setQuantity(event.target.value)} /></label>
      <label>Selling price per unit (₹)<input inputMode="decimal" required value={price} onChange={event => setPrice(event.target.value)} /></label>
      <label>Brokerage and charges (₹)<input inputMode="decimal" value={charges} onChange={event => setCharges(event.target.value)} /></label>
    </div>
    {started && plan.error && <p role="alert" className="sale-error">{plan.error}</p>}
    {!plan.error && <div className="sale-preview" aria-live="polite">
      <span><small>Net proceeds</small><strong>{fmt(plan.proceeds)}</strong></span>
      <span><small>Purchase cost</small><strong>{fmt(plan.cost)}</strong></span>
      <span><small>Gain or loss</small><strong className={tone(plan.gain)}>{fmt(plan.gain)}</strong></span>
      <span><small>Short term</small><strong>{fmt(plan.shortTerm)}</strong></span>
      <span><small>Long term</small><strong>{fmt(plan.longTerm)}</strong></span>
      {!!plan.lines.some(line => line.term === 'unknown') && <p>Some lots have no purchase date, so their holding period is unknown. Add the date to classify them.</p>}
    </div>}
    <div className="sale-actions"><button type="button" className="btn" onClick={onCancel}>Cancel</button><button type="submit" className="btn-primary" disabled={!!plan.error || busy}>{busy ? 'Saving…' : 'Record sale'}</button></div>
  </form>;
}

export default function TransactionLedger({ records, buys, annualReturn, returnCoverage, canEdit, onUndo }: { records: LedgerRecord[]; buys: BuyRow[]; annualReturn: number | null; returnCoverage: string; canEdit: boolean; onUndo: (record: LedgerRecord) => Promise<void> }) {
  const [busyId, setBusyId] = useState('');
  const sales = useMemo(() => postedSales(records), [records]);
  const years = useMemo(() => gainsByFinancialYear(records), [records]);
  const rows = useMemo(() => [
    ...buys.map(buy => ({ key: `buy-${buy.id}`, date: buy.date, type: 'Buy', name: buy.name, account: buy.account, quantity: buy.quantity, price: buy.quantity ? buy.amount / buy.quantity : 0, value: buy.amount, record: null as LedgerRecord | null })),
    ...sales.map(record => ({ key: record.id, date: String(record.data.sale_date), type: 'Sell', name: String(record.data.security_name || ''), account: String(record.data.account_name || ''), quantity: num(record.data.quantity), price: num(record.data.price), value: num(record.data.proceeds), record })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || '')), [buys, sales]);

  return <section className="mom" aria-label="Transactions">
    <div className="sale-preview">
      <span><small>Annualised return (XIRR)</small><strong>{annualReturn === null ? '—' : `${annualReturn.toFixed(2)}%`}</strong><small>{returnCoverage}</small></span>
      <span><small>Total realised gain</small><strong className={tone(years.reduce((sum, year) => sum + year.gain, 0))}>{fmt(years.reduce((sum, year) => sum + year.gain, 0))}</strong><small>{sales.length} sale{sales.length === 1 ? '' : 's'} recorded</small></span>
    </div>
    <p className="mom-note">To record a sale, open a stock or mutual fund and choose Record Sale. Holdings reduce automatically, so add the proceeds to Savings in Bank. Short and long term use a {LONG_TERM_MONTHS}-month holding period, which is the listed equity rule; other assets can differ. This is a record of gains, not tax advice.</p>
    {!!years.length && <div className="mom-scroll" tabIndex={0} role="region" aria-label="Capital gains by financial year"><table>
      <thead><tr><th scope="col" className="mom-sticky">Financial year</th><th scope="col">Net proceeds</th><th scope="col">Purchase cost</th><th scope="col">Short-term gain</th><th scope="col">Long-term gain</th><th scope="col">Unknown term</th><th scope="col">Total gain</th></tr></thead>
      <tbody>{years.map(year => <tr key={year.year}><th scope="row" className="mom-sticky">{fyLabel(year.year)}</th><td>{fmt(year.proceeds)}</td><td>{fmt(year.cost)}</td><td>{amount(year.shortTerm)}</td><td>{amount(year.longTerm)}</td><td>{amount(year.unknownTerm)}</td><td>{amount(year.gain)}</td></tr>)}</tbody>
    </table></div>}
    {!rows.length && <p className="mom-note">No stock or mutual fund transactions yet.</p>}
    {!!rows.length && <div className="mom-scroll" tabIndex={0} role="region" aria-label="All transactions"><table>
      <thead><tr><th scope="col" className="mom-sticky">Security</th><th scope="col">Date</th><th scope="col">Type</th><th scope="col">Quantity</th><th scope="col">Price</th><th scope="col">Amount</th><th scope="col">Gain or loss</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.key}>
        <th scope="row" className="mom-sticky"><span>{row.name}</span><small>{row.account}</small></th>
        <td>{row.date || '—'}</td><td>{row.type}</td><td>{Number(row.quantity.toFixed(4))}</td><td>{fmt(row.price)}</td><td>{fmt(row.value)}</td>
        <td>{row.record ? amount(num(row.record.data.gain)) : '—'}</td>
        <td>{row.record && canEdit && <button type="button" className="btn" disabled={busyId === row.record.id} onClick={async () => { const record = row.record!; setBusyId(record.id); try { await onUndo(record); } finally { setBusyId(''); } }}>Undo</button>}</td>
      </tr>)}</tbody>
    </table></div>}
  </section>;
}
