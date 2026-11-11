// R2: one loan position. A loan's balance, EMI, months left and parked amount come only from
// loanPosition; nothing else works out a balance. Every screen that lists loans reads this list.
import { isOverdraftLoan, loanPosition, LOAN_FIELDS, num, PROPERTY_LOAN_FIELDS } from "../calculations";

type Rec = { id: string; module_key: string; data: Record<string, any> | null };

export type Loan = {
  id: string;
  moduleKey: "loans" | "property" | "borrowings";
  name: string;
  lender: string;
  isOd: boolean;
  /** Outstanding balance before any OD offset. */
  balance: number;
  /** Money parked in the OD that offsets the balance (never more than the balance). */
  parked: number;
  /** Balance that bears interest: balance less parked. */
  netBalance: number;
  emi: number;
  annualRate: number;
  monthsLeft: number | null;
  clearsOn: string;
  warnings: string[];
};

const noon = (asOf: string) => new Date(`${asOf}T12:00:00`);

/** Every loan with something outstanding, in record order. */
export function loansOf(records: Rec[], asOf: string): Loan[] {
  const out: Loan[] = [];
  for (const r of records) {
    const d = r.data || {};
    if (r.module_key === "loans" || r.module_key === "property") {
      const p = loanPosition(d, r.module_key === "property" ? PROPERTY_LOAN_FIELDS : LOAN_FIELDS, noon(asOf));
      if (p.balance <= 0) continue;
      out.push({
        id: r.id,
        moduleKey: r.module_key,
        name: String(d.security_name || d.location || "Loan"),
        lender: String(d.loan_institution || (r.module_key === "loans" ? d.broker : "") || ""),
        isOd: isOverdraftLoan(d),
        balance: p.balance,
        parked: p.parked,
        netBalance: p.netBalance,
        emi: p.emi,
        annualRate: p.annualRate,
        monthsLeft: p.monthsLeft,
        clearsOn: String(p.clearsOn || ""),
        warnings: p.warnings,
      });
    } else if (r.module_key === "borrowings") {
      // Borrowings have no repayment schedule: the balance is as entered, and any payment entered is the EMI.
      const balance = Math.max(0, num(d.loan_balance) || num(d.loan_amount) - num(d.principal_paid));
      if (balance <= 0) continue;
      // With no payment entered, the payment that clears it over the months left (as the Planner did before).
      const annualRate = Math.max(0, num(d.interest_rate)), months = Math.max(0, num(d.emis_left) || num(d.tenure_months)), rate = annualRate / 1200;
      const scheduled = months ? (rate ? (balance * rate) / (1 - Math.pow(1 + rate, -months)) : balance / months) : 0;
      out.push({
        id: r.id, moduleKey: "borrowings", name: String(d.security_name || "Borrowing"), lender: String(d.broker || ""), isOd: false,
        balance, parked: 0, netBalance: balance, emi: Math.max(0, num(d.monthly_emi) || num(d.emi_amount) || scheduled), annualRate,
        monthsLeft: null, clearsOn: "", warnings: [],
      });
    }
  }
  return out;
}
