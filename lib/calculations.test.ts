import { describe, expect, it } from "vitest";
import { computeRecord, computeTotals, num } from "./calculations";

describe("financial calculations", () => {
  it("parses formatted Indian currency values", () => {
    expect(num("₹25,64,778")).toBe(2564778);
  });

  it("calculates bullion gain from current and invested values", () => {
    const result = computeRecord("bullion", {
      purchase_price: 559188,
      latest_value: 605122,
    });
    expect(result.invested).toBe(559188);
    expect(result.latest).toBe(605122);
    expect(result.gain).toBe(45934);
  });

  it("uses tracked bullion costs as the landed cost", () => {
    const result = computeRecord("bullion", {
      metal_cost: 100000,
      making_charges: 5000,
      gst_paid: 3150,
      other_costs: 850,
      latest_value: 120000,
    });
    expect(result.invested).toBe(109000);
    expect(result.gain).toBe(11000);
  });

  it("reconciles portfolio totals", () => {
    const totals = computeTotals([
      {
        module_key: "bullion",
        data: { purchase_price: 559188, latest_value: 605122 },
      },
      {
        module_key: "bullion",
        data: { purchase_price: 2005590, latest_value: 4729483 },
      },
    ]);
    expect(totals.invested).toBe(2564778);
    expect(totals.assets).toBe(5334605);
    expect(totals.gain).toBe(2769827);
  });
});
