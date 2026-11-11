// R6: a card bill is a way of paying, not an expense line. Card spending is estimated from history.
import { describe, expect, it } from "vitest";
import { paymentCards } from "../expenses";
import { isCardRow, monthlyRegularTotal, recurringPayments } from "../monthlyPayments";
import { pickedTotal, plannerSources } from "../plannerSources";
import { planningSnapshot } from "../predictions";
import { AS_OF, household } from "./__fixtures__/household";
import { cardEstimate } from "./cards";

const month = (period: string, paid: Record<string, number>) => ({
  id: `pay-${period}`, module_key: "monthlyPayment",
  data: { period, paid: Object.fromEntries(Object.entries(paid).map(([id, amount]) => [id, { label: id, type: "Credit card", amount, paid_on: `${period}-18`, from_id: "x", from_name: "Bank", drawn: amount }])) },
});
const withBills = () => [
  ...household(),
  month("2026-08", { "rec:m3": 60000, "rec:m4": 10000 }),
  month("2026-09", { "rec:m3": 50000, "rec:m4": 10000 }),
  month("2026-10", { "rec:m3": 40000, "rec:m4": 10000, "rec:m1": 8000 }),
];

describe("isCardRow", () => {
  it("treats card rows and rows named credit card as cards, and nothing else", () => {
    expect(recurringPayments(household()).filter(isCardRow).map((r) => r.id)).toEqual(["m3", "m4"]);
  });

  it("the same rows are the cards in Payments", () => {
    expect(paymentCards(household()).map((c) => c.id)).toEqual(["card:m3", "card:m4"]);
  });

  it("regular payments leave out card bills, payments already on a card and transfers", () => {
    expect(monthlyRegularTotal(recurringPayments(household()))).toBe(8000 + 20000);
  });
});

describe("cardEstimate", () => {
  it("averages the card bills actually paid in recent complete months", () => {
    expect(cardEstimate(withBills(), AS_OF)).toMatchObject({ monthly: 60000, months: 3, rough: false });
  });

  it("with no history there is no estimate, and the snapshot says so", () => {
    expect(cardEstimate(household(), AS_OF)).toMatchObject({ monthly: 0, months: 0 });
    expect(planningSnapshot(household(), AS_OF).warnings.join(" ")).toMatch(/card spending/i);
  });

  it("with fewer than 3 months it averages what there is and marks it rough", () => {
    const records = [...household(), month("2026-10", { "rec:m3": 40000 })];
    expect(cardEstimate(records, AS_OF)).toMatchObject({ monthly: 40000, months: 1, rough: true });
  });
});

describe("cash flow (R5 living = regular non-card payments + card estimate)", () => {
  it("the snapshot uses the card estimate, not the card bill amounts", () => {
    const s = planningSnapshot(withBills(), AS_OF);
    expect([s.monthlyRegular, s.monthlyCardEstimate]).toEqual([28000, 60000]);
  });

  it("the Planner's living expenses default to the same total", () => {
    const records = withBills(), sources = plannerSources(records, AS_OF), s = planningSnapshot(records, AS_OF);
    expect(pickedTotal(sources.expenses, undefined)).toBe(s.monthlyRegular + s.monthlyCardEstimate);
    expect(sources.expenses.some((i) => i.id === "payment:m3")).toBe(false);
  });
});
