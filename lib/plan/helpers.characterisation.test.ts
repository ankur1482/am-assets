// Characterisation tests for helpers the plan engine keeps (PLAN_ENGINE_BRIEF 6.1 and task 0.5).
// They pin today's results so later work cannot change them by accident. A task that changes one
// on purpose updates the expected value here in the same commit and says why.
import { describe, expect, it } from "vitest";
import { loanPosition, PROPERTY_LOAN_FIELDS } from "../calculations";
import { futureValue, monthlyToClose } from "../goalProjection";
import { AS_OF_INSTANT, household, ID } from "./__fixtures__/household";

describe("futureValue: effective annual rate, month-end deposits", () => {
  it.each([
    [1000000, 0, 7.1, 76, 76, 1544069],
    [0, 10000, 8.2, 76, 76, 982363],
    [500000, 5000, 8.0, 120, 60, 1615361],
    [100000, 0, 0, 24, 24, 100000],
    [0, 1000, 0, 24, 24, 24000],
  ])("today %i, monthly %i, %f%%, %i months, paying %i months → %i", (today, monthly, rate, months, payMonths, expected) => {
    expect(Math.round(futureValue(today, monthly, rate, months, payMonths))).toBe(expected);
  });
});

describe("monthlyToClose", () => {
  it("closes 10,00,000 at 8% in 60 months with 13,709 a month", () => {
    expect(Math.round(monthlyToClose(1000000, 8, 60))).toBe(13709);
  });
  it("needs nothing when there is no gap", () => {
    expect(monthlyToClose(0, 8, 60)).toBe(0);
  });
});

describe("loanPosition on the fixture's property loans", () => {
  const position = (id: string) => loanPosition(household().find((r) => r.id === id)!.data, PROPERTY_LOAN_FIELDS, AS_OF_INSTANT);

  it("OD with more parked than the balance: the parked money covers it all", () => {
    const p = position(ID.odAbove);
    expect([p.balance, p.parked, p.netBalance, p.emi]).toEqual([4000000, 4000000, 0, 0]);
  });

  it("OD with a balance entered as 0: 0 is read as blank, so the balance is the loan amount (R2 keeps this)", () => {
    const p = position(ID.odZero);
    expect([p.balance, p.parked, p.netBalance]).toEqual([3000000, 3000000, 0]);
  });

  it("standard EMI with the balance left blank: worked out from the EMI schedule", () => {
    const p = position(ID.emiFlat);
    expect(Math.round(p.balance)).toBe(3396759);
    expect(Math.round(p.emi)).toBe(33458);
    expect(p.monthsLeft).toBe(170);
  });

  // Today the payment dated after AS_OF already counts as drawn (D21); task 1.10 changes this.
  it("home being built: the loan is what the bank has paid the builder, including a future-dated payment", () => {
    const p = position(ID.building);
    expect(Math.round(p.balance)).toBe(2460766);
    expect(Math.round(p.emi)).toBe(20911);
  });

  it("entered balance and EMI win", () => {
    const p = position(ID.home);
    expect([p.balance, p.emi, p.monthsLeft]).toEqual([3000000, 50000, 77]);
  });
});
