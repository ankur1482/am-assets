// R3: overdraft accounts. For an OD loan with balance B and money parked P:
//   offset = min(P, B)  reduces interest; drawing it recreates the loan ("can redraw")
//   spare  = max(0, P − B)  the owner's own money ("cash now")
// The balance comes from loanPosition (R2). An OD with 0 entered and money parked is read as the
// sanctioned loan amount there, so its spare is 0 until the owner says which is meant.
import { isOverdraftLoan, loanPosition, LOAN_FIELDS, num, PROPERTY_LOAN_FIELDS } from "../calculations";

type Rec = { id: string; module_key: string; data: Record<string, any> | null };

export type OdAccount = { id: string; name: string; balance: number; parked: number; offset: number; spare: number; ambiguous: boolean };

export function splitParked(balance: number, parked: number) {
  const b = Math.max(0, balance), p = Math.max(0, parked);
  return { offset: Math.min(p, b), spare: Math.max(0, p - b) };
}

/** An OD whose balance was entered as 0 while money is parked: paid off, or an unused limit? */
export const isAmbiguousOd = (d: Record<string, any>) =>
  isOverdraftLoan(d) && d.loan_balance !== "" && d.loan_balance !== null && d.loan_balance !== undefined && num(d.loan_balance) === 0 && num(d.od_parked_balance) > 0;

export function odPosition(records: Rec[], asOf: string) {
  const accounts: OdAccount[] = [];
  for (const r of records) {
    const d = r.data || {};
    if ((r.module_key !== "loans" && r.module_key !== "property") || !isOverdraftLoan(d)) continue;
    const balance = loanPosition(d, r.module_key === "property" ? PROPERTY_LOAN_FIELDS : LOAN_FIELDS, new Date(`${asOf}T12:00:00`)).balance;
    const parked = Math.max(0, num(d.od_parked_balance));
    accounts.push({ id: r.id, name: String(d.loan_institution || d.broker || d.security_name || "OD account"), balance, parked, ...splitParked(balance, parked), ambiguous: isAmbiguousOd(d) });
  }
  return {
    accounts,
    spare: accounts.reduce((s, a) => s + a.spare, 0),
    canRedraw: accounts.reduce((s, a) => s + a.offset, 0),
  };
}
