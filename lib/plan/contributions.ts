// R5: where a regular contribution's money comes from. Payroll contributions (Company PF, EPF) are
// deducted before take-home pay, so cash flow never subtracts them again; they still build wealth.
// A saved "Paid from" choice wins; otherwise Company PF, EPF and PF default to payroll, all else to bank.

const isPayrollCategory = (category: string) => /^epf$|^pf$|company\s*pf|^vpf$/i.test(category.trim());

export function isPaidFromPayroll(d: Record<string, any> | null | undefined) {
  const data = d || {}, chosen = String(data.paid_from || "").trim().toLowerCase();
  if (chosen.startsWith("payroll")) return true;
  if (chosen.startsWith("bank")) return false;
  return isPayrollCategory(String(data.category || ""));
}
