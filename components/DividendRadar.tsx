"use client";

import { useState } from 'react';
import { fmt, formatDate } from '@/lib/calculations';
import { HIGHER_YIELD_PERCENT, type BuySignal, type dividendHistory } from '@/lib/dividendCalendar';
import OneRowTabs, { usePhoneTabs } from '@/components/OneRowTabs';

const yieldText = (signal: BuySignal) => (signal.yieldPct === null ? '' : ` · ${signal.yieldPct.toFixed(2)}%`);

/** Small marker for a stock row. It states the deadline and leaves the decision to you. */
export function BuyBadge({ signal }: { signal?: BuySignal }) {
  if (!signal) return null;
  const amount = signal.amount ? `₹${signal.amount}` : 'amount not announced';
  return <span className={`buy-badge ${signal.strength === 'higher' ? 'buy-higher' : ''}`} title={`${signal.type} dividend, ex-date ${formatDate(signal.exDate)}. Buy by ${formatDate(signal.buyBy)} and hold through the ex-date to qualify.`}>Dividend: buy by {formatDate(signal.buyBy)} · {amount}{yieldText(signal)}</span>;
}

type Props = { signals: BuySignal[]; loading: boolean; exploring: boolean; explored: boolean; checked: number; missing: string[]; onExplore: () => void };

export default function DividendRadar({ signals, loading, exploring, explored, checked, missing, onExplore }: Props) {
  const [source, setSource] = useState('All');
  const phone = usePhoneTabs();
  const sources = ['All', 'Holding', 'Watchlist', 'Large company'], rows = source === 'All' ? signals : signals.filter(signal => signal.source === source);
  return <section className="mom" aria-label="Dividend buy radar">
    <div className="mom-toolbar">
      {phone
        ? <OneRowTabs label="Which stocks" tabs={sources.map(option => ({ id: option, label: option, active: source === option, onSelect: () => setSource(option) }))} />
        : <div className="mom-measures" role="group" aria-label="Which stocks">{sources.map(option => <button key={option} type="button" aria-pressed={source === option} onClick={() => setSource(option)}>{option}</button>)}</div>}
      <button type="button" className="btn-primary" disabled={exploring || explored} onClick={onExplore}>{exploring ? 'Checking large companies…' : explored ? 'Large companies checked' : 'Explore large companies'}</button>
    </div>
    <p className="mom-note">Stocks with an announced dividend you can still qualify for. To qualify, buy by the date shown and hold through the ex-date. {checked} stocks checked.</p>
    <p className="mom-note"><strong>This shows a date, not a recommendation.</strong> A share price usually falls by about the dividend on the ex-date, and the dividend is taxable, so buying only for the dividend often earns little or nothing. Consider it for stocks you would want to own anyway. Dates exclude market holidays, so leave a day to spare. Green marks a yield of {HIGHER_YIELD_PERCENT}% or more. This is not investment advice.</p>
    {loading && <p className="mom-note">Looking up announced dividends…</p>}
    {!loading && !rows.length && <p className="mom-note">No announced dividends to buy into right now.</p>}
    {!!rows.length && <div className="mom-scroll" tabIndex={0} role="region" aria-label="Upcoming dividends"><table>
      <thead><tr><th scope="col" className="mom-sticky">Stock</th><th scope="col">Buy by</th><th scope="col">Days left</th><th scope="col">Ex-date</th><th scope="col">Dividend</th><th scope="col">Price</th><th scope="col">Yield</th><th scope="col">Your shares earn</th></tr></thead>
      <tbody>{rows.map(signal => <tr key={`${signal.source}:${signal.symbol}:${signal.exDate}`}>
        <th scope="row" className="mom-sticky"><span>{signal.name}</span><small>{signal.symbol} · {signal.source} · {signal.type}</small></th>
        <td><strong className={signal.strength === 'higher' ? 'mom-up' : ''}>{formatDate(signal.buyBy)}</strong></td>
        <td>{signal.daysLeft === 0 ? 'Today' : signal.daysLeft}</td><td>{formatDate(signal.exDate)}</td>
        <td>{signal.amount ? `₹${signal.amount}` : 'Not announced'}</td><td>{signal.price ? fmt(signal.price) : '—'}</td>
        <td>{signal.yieldPct === null ? '—' : `${signal.yieldPct.toFixed(2)}%`}</td><td>{signal.heldQuantity && signal.amount ? fmt(signal.expected) : '—'}</td>
      </tr>)}</tbody>
    </table></div>}
    {!!missing.length && <p className="mom-note">Could not be matched to an Indian listing, so not checked: {missing.join(', ')}.</p>}
    <p className="mom-note">This covers your holdings, your watchlist and {explored ? 'about 50' : 'optionally about 50'} large companies, not every listed stock, because no source available to the app lists upcoming dividends across the whole market. Add any stock to your Watchlist to include it.</p>
  </section>;
}

/** Dividends received, kept after the shares are sold. */
export function DividendHistory({ history }: { history: ReturnType<typeof dividendHistory> }) {
  const total = history.reduce((sum, group) => sum + group.total, 0);
  const rows = history.flatMap(group => group.receipts.map(receipt => ({ group, receipt }))).sort((a, b) => String(b.receipt.received_on).localeCompare(String(a.receipt.received_on)));
  return <section className="mom" aria-label="Dividends earned">
    <p className="mom-note">Every dividend you confirmed as received. These stay here even after you sell the shares.</p>
    {!rows.length && <p className="mom-note">Nothing yet. Answer “Yes, received” under Dashboard → Dividends to Confirm.</p>}
    {!!rows.length && <div className="mom-scroll" tabIndex={0} role="region" aria-label="Dividends earned table"><table>
      <thead><tr><th scope="col" className="mom-sticky">Stock</th><th scope="col">Person</th><th scope="col">Still held</th><th scope="col">Ex-date</th><th scope="col">Payout date</th><th scope="col">Received on</th><th scope="col">Shares</th><th scope="col">Per share</th><th scope="col">Amount</th><th scope="col">Credited to</th></tr></thead>
      <tbody>{rows.map(({ group, receipt }, index) => <tr key={`${group.account}|${group.ticker}|${receipt.ex_date}|${index}`}>
        <th scope="row" className="mom-sticky"><span>{group.name}</span><small>{group.ticker}</small></th>
        <td>{group.account}</td><td>{group.stillHeld ? 'Yes' : 'Sold'}</td><td>{formatDate(receipt.ex_date)}</td><td>{receipt.payout_date ? formatDate(receipt.payout_date) : '—'}</td><td>{formatDate(receipt.received_on)}</td>
        <td>{Number(Number(receipt.quantity || 0).toFixed(4))}</td><td>{receipt.per_share ? `₹${receipt.per_share}` : '—'}</td><td>{fmt(receipt.amount)}</td><td>{receipt.credit_name || '—'}</td>
      </tr>)}</tbody>
      <tfoot><tr><th scope="row" className="mom-sticky">Total</th><td colSpan={7} /><td>{fmt(total)}</td><td /></tr></tfoot>
    </table></div>}
  </section>;
}
