import { describe, expect, it } from "vitest";
import { computeRecord } from "./calculations";
import { employmentChecksDue, employmentFor, employmentOf, monthsUntilDate, recordsEndedBy } from "./employment";

const asOf = "2026-11-10";
const salary = (data: Record<string, any>, id = "s") => ({ id, module_key: "fixedIncome", data: { category: "Salary", account_name: "Ankur", employee_contribution: 200000, ...data } });
const pf = { id: "pf", module_key: "fixedIncome", data: { category: "Company PF", account_name: "Ankur" } };
const grat = { id: "g", module_key: "fixedIncome", data: { category: "Gratuity", account_name: "Ankur" } };
const other = { id: "o", module_key: "fixedIncome", data: { category: "PPF", account_name: "Ankur" } };

describe("employment", () => {
  it("is still employed until the planned last day", () => {
    expect(employmentOf(salary({ planned_employment_end: "2030-06-01" }), asOf)).toMatchObject({ employed: true, endDate: "2030-06-01", planned: true });
    expect(employmentOf(salary({}), asOf)).toMatchObject({ employed: true, endDate: null });
  });

  it("has ended once the person says no, or the last working day has passed", () => {
    expect(employmentOf(salary({ currently_employed: "No", last_working_date: "2026-10-31" }), asOf)).toMatchObject({ employed: false, endDate: "2026-10-31" });
    expect(employmentOf(salary({ currently_employed: "No" }), asOf)).toMatchObject({ employed: false, endDate: asOf });
    expect(employmentOf(salary({ last_working_date: "2025-01-31" }), asOf)).toMatchObject({ employed: false, endDate: "2025-01-31" });
  });

  it("links PF and gratuity to the same person's salary", () => {
    const records = [salary({ planned_employment_end: "2030-06-01" }), pf, grat];
    expect(employmentFor(records, "Ankur", asOf)?.endDate).toBe("2030-06-01");
    expect(employmentFor(records, "Shilpi", asOf)).toBeNull();
  });

  it("counts the months left to the last day", () => {
    expect(monthsUntilDate("2030-06-01", asOf)).toBe(43);
    expect(monthsUntilDate("2020-01-01", asOf)).toBe(0);
    expect(monthsUntilDate(null, asOf)).toBeNull();
  });

  it("asks each month until answered, and not after employment ends", () => {
    expect(employmentChecksDue([salary({})], asOf)).toHaveLength(1);
    expect(employmentChecksDue([salary({ employment_confirmed_month: "2026-11" })], asOf)).toHaveLength(0);
    expect(employmentChecksDue([salary({ employment_confirmed_month: "2026-10" })], asOf)).toHaveLength(1);
    expect(employmentChecksDue([salary({ currently_employed: "No" })], asOf)).toHaveLength(0);
  });

  it("ends the salary, PF and gratuity of that person only", () => {
    expect(recordsEndedBy([salary({}), pf, grat, other], "Ankur").map((r) => r.id)).toEqual(["s", "pf", "g"]);
  });
});


describe("Company PF after employment ends", () => {
  it("stops contributions after the last working day, while interest continues", () => {
    const base = { category: "Company PF", account_name: "Ankur", current_value_today: 1_000_000, employee_contribution: 10_000, company_contribution: 10_000, interest_rate: 8.25, purchase_date: "2015-01-01" };
    const working = computeRecord("fixedIncome", base);
    const ended = computeRecord("fixedIncome", { ...base, last_working_date: "2000-01-01" });
    expect(ended.latest).toBeLessThan(working.latest);
    expect(ended.latest).toBeGreaterThan(1_000_000); // interest still added
  });
});
