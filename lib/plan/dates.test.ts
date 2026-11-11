// R7: one way of counting months, the calendar-month difference, never negative.
import { describe, expect, it } from "vitest";
import { monthsUntil } from "../goals";
import { goalForecast } from "../predictions";
import { monthsBetween } from "./dates";

describe("monthsBetween", () => {
  it.each([
    ["2026-11-10", "2033-03-31", 76],
    ["2026-11-10", "2036-03-31", 112],
    ["2026-11-10", "2026-11-30", 0],
    ["2026-11-10", "2026-12-01", 1],
    ["2026-11-10", "2025-01-01", 0],
  ])("%s to %s is %i months", (from, to, months) => {
    expect(monthsBetween(from, to)).toBe(months);
  });

  it("Goals and the Planner count the same months", () => {
    for (const date of ["2033-03-31", "2036-03-31", "2030-06-01", "2050-06-10"]) {
      const planner = goalForecast({ current: 1, target: 100, targetDate: date, monthly: 0, annualReturn: 8, asOf: "2026-11-10" })?.months;
      expect(planner, date).toBe(monthsUntil(date, new Date("2026-11-10T12:00:00")));
      expect(planner, date).toBe(monthsBetween("2026-11-10", date));
    }
  });
});
