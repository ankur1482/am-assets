import { describe, expect, it } from "vitest";
import { marketColumns } from "./marketStrip";

const names = (rows: { name: string }[][]) => rows.map((column) => column.map((row) => row.name));
const rows = (...list: string[]) => list.map((name) => ({ name }));

describe("market strip columns", () => {
  it("stacks each pair one above another, in a fixed order", () => {
    const all = rows("Brent $ / Barrel", "SENSEX", "NIFTY", "NIFTY BANK", "NASDAQ", "Gold - 10 GM", "Silver - 1 KG", "Dollar / INR", "Crude $ / Barrel");
    expect(names(marketColumns(all))).toEqual([
      ["SENSEX", "NIFTY"],
      ["NIFTY BANK", "NASDAQ"],
      ["Gold - 10 GM", "Silver - 1 KG"],
      ["Dollar / INR"],
      ["Crude $ / Barrel", "Brent $ / Barrel"],
    ]);
  });

  it("leaves out a column with no rows, and never drops a row it does not know", () => {
    expect(names(marketColumns(rows("NIFTY", "Copper")))).toEqual([["NIFTY"], ["Copper"]]);
    expect(marketColumns([])).toEqual([]);
  });
});
