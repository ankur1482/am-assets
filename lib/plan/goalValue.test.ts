// D2 / R10: a goal's value today is the full value of what pays for it, never capped at the target.
import { describe, expect, it } from "vitest";
import { goalFunding } from "../goals";

const holdings = [
  { id: "h1", moduleKey: "stocks", label: "Shares", value: 3000000 },
  { id: "h2", moduleKey: "fixedIncome", label: "PPF", value: 500000 },
];
const assets = [{ key: "stocks", label: "Stocks", value: 3000000 }, { key: "fixedIncome", label: "Fixed income", value: 500000 }];

describe("goalFunding value today", () => {
  const f = goalFunding(assets, [], [
    { id: "big", name: "Retirement", target: 2000000, sources: ["rec:h1"] },
    { id: "small", name: "Education", target: 1000000, sources: ["rec:h2"] },
  ], new Date("2026-11-10T12:00:00"), holdings);
  const goal = (id: string) => f.goals.find((g) => g.id === id)!;

  it("keeps the full value of picked holdings, with what is above the target shown as surplus", () => {
    expect(goal("big")).toMatchObject({ value: 3000000, allocated: 2000000, surplusToday: 1000000, gap: 0 });
  });

  it("a goal short of its target shows the gap and no surplus", () => {
    expect(goal("small")).toMatchObject({ value: 500000, allocated: 500000, surplusToday: 0, gap: 500000 });
  });
});
