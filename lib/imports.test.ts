import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  detectModule,
  mapImportedRow,
  parseDelimited,
  readRowsFromFile,
} from "./imports";

describe("asset imports", () => {
  it("parses quoted CSV fields", () => {
    const rows = parseDelimited(
      'Company,Quantity,Invested Value\n"Example, Ltd",2,"1,250.50"',
    );
    expect(rows).toEqual([
      {
        Company: "Example, Ltd",
        Quantity: "2",
        "Invested Value": "1,250.50",
      },
    ]);
  });

  it("detects and maps stock rows", () => {
    const source = {
      Company: "Reliance Industries",
      Symbol: "RELIANCE",
      Qty: "3",
      "Invested Value": "₹7,500",
    };
    expect(detectModule(source)).toBe("stocks");
    expect(mapImportedRow(source, "stocks")).toMatchObject({
      security_name: "Reliance Industries",
      ticker_symbol: "RELIANCE",
      quantity: 3,
      investment_amount: 7500,
    });
  });

  it("reads xlsx sheets and preserves the sheet name", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Bullion");
    sheet.addRow(["Metal", "Quantity", "Unit"]);
    sheet.addRow(["Silver", 2.5, "kg"]);
    const buffer = await workbook.xlsx.writeBuffer();
    const bytes = new Uint8Array(buffer as unknown as ArrayBuffer);
    const file = {
      name: "holdings.xlsx",
      arrayBuffer: async () => bytes.buffer,
      text: async () => "",
    } as File;

    await expect(readRowsFromFile(file)).resolves.toEqual([
      { Metal: "Silver", Quantity: 2.5, Unit: "kg", moduleHint: "Bullion" },
    ]);
  });
});
