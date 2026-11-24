/** Rows shown one above another in the Market Today strip, left to right. */
const MARKET_COLUMNS = [
  ["SENSEX", "NIFTY"],
  ["NIFTY BANK", "NASDAQ"],
  ["Gold - 10 GM", "Silver - 1 KG"],
  ["Dollar / INR"],
  ["Crude $ / Barrel", "Brent $ / Barrel"],
];

/** Groups the market rows into those columns. A row not listed above gets a column of its own. */
export function marketColumns<Row extends { name: string }>(rows: Row[]): Row[][] {
  const listed = new Set(MARKET_COLUMNS.flat());
  return [
    ...MARKET_COLUMNS.map((names) => names.flatMap((name) => rows.filter((row) => row.name === name))),
    ...rows.filter((row) => !listed.has(row.name)).map((row) => [row]),
  ].filter((column) => column.length);
}
