export type Row = Record<string, any>;

const norm = (value: any) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

function excelCellValue(value: any): any {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value !== "object") return value;
  if ("result" in value) return excelCellValue(value.result);
  if (Array.isArray(value.richText))
    return value.richText.map((part: any) => part.text || "").join("");
  if ("text" in value) return value.text;
  if ("hyperlink" in value) return value.text || value.hyperlink;
  return String(value);
}

async function readWorkbook(file: File): Promise<Row[]> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const bytes = new Uint8Array(await file.arrayBuffer());
  await workbook.xlsx.load(bytes as any);
  const rows: Row[] = [];

  workbook.eachSheet((sheet) => {
    const matrix: any[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values = Array.from(
        { length: Math.max(0, row.cellCount) },
        (_, index) => excelCellValue(row.getCell(index + 1).value),
      );
      if (values.some((value) => String(value || "").trim())) matrix.push(values);
    });
    if (!matrix.length) return;

    const headerIndex = bestHeader(matrix.map((row) => row.map(String)));
    const headers = matrix[headerIndex].map(
      (header, index) => String(header || "").trim() || `column_${index + 1}`,
    );
    matrix.slice(headerIndex + 1).forEach((values) => {
      const row = Object.fromEntries(
        headers.map((header, index) => [header, values[index] ?? ""]),
      );
      if (Object.values(row).some((value) => String(value || "").trim()))
        rows.push({ ...row, moduleHint: sheet.name });
    });
  });
  return rows;
}

export async function readRowsFromFile(file: File): Promise<Row[]> {
  const ext = file.name.toLowerCase().split(".").pop() || "";
  if (ext === "xlsx") return readWorkbook(file);
  if (ext === "xls")
    throw new Error(
      "Legacy .xls files are not supported. Save the workbook as .xlsx or CSV and retry.",
    );

  const text = await file.text();
  if (ext === "json") {
    const json = JSON.parse(text);
    if (Array.isArray(json)) return json;
    if (Array.isArray(json.rows))
      return json.rows.map((row: any) => row.raw || row.row || row.payload || row);
    if (Array.isArray(json.data)) return json.data;
    return [];
  }
  return parseDelimited(text);
}

export function parseDelimited(raw: string) {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const sample = lines.slice(0, 5).join("\n");
  const delimiter = ["\t", ",", ";", "|"].sort(
    (a, b) => sample.split(b).length - sample.split(a).length,
  )[0];
  const matrix = lines.map((line) => splitLine(line, delimiter));
  const headerIndex = bestHeader(matrix);
  const headers = matrix[headerIndex].map(
    (header, index) => header || `column_${index + 1}`,
  );
  return matrix
    .slice(headerIndex + 1)
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])),
    )
    .filter((row) =>
      Object.values(row).some((value) => String(value || "").trim()),
    );
}

function splitLine(line: string, delimiter: string) {
  const output: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      output.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  output.push(current.trim());
  return output;
}

const keys =
  "stock company scheme fund symbol ticker exchange quantity qty units ltp cmp nav value market invested current purchase date folio amfi property loan emi maturity interest principal gold silver ulip policy account".split(
    " ",
  );

function bestHeader(matrix: string[][]) {
  let best = 0;
  let score = -999;
  matrix.slice(0, 20).forEach((row, index) => {
    const candidate = row.reduce(
      (total, cell) =>
        total +
        (/[a-z]/i.test(cell) ? 1 : 0) +
        (keys.some((key) => norm(cell).includes(key)) ? 4 : 0) -
        (/^[\d,.₹\s%-]+$/.test(cell) ? 1 : 0),
      0,
    );
    if (candidate > score) {
      score = candidate;
      best = index;
    }
  });
  return best;
}

function val(row: Row, aliases: string[]) {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const match = entries.find(([key]) => norm(key) === norm(alias));
    if (match && String(match[1] || "").trim()) return match[1];
  }
  for (const alias of aliases) {
    const parts = norm(alias).split("_").filter(Boolean);
    const match = entries.find(([key]) =>
      parts.every((part) => norm(key).includes(part)),
    );
    if (match && String(match[1] || "").trim()) return match[1];
  }
  return "";
}

function n(value: any) {
  const cleaned = String(value || "")
    .replace(/,/g, "")
    .replace(/₹|rs\.?|inr|%/gi, "")
    .trim();
  if (!cleaned) return "";
  const number = Number.parseFloat(cleaned.replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(number) ? number : "";
}

export function detectModule(row: Row, source = "") {
  const body =
    `${Object.keys(row).join(" ")} ${Object.values(row).join(" ")} ${source}`.toLowerCase();
  if (/term plan|insurance|sum assured|life cover|nominee/.test(body))
    return "insurance";
  if (/mutual|scheme|nav|folio|amfi/.test(body)) return "mutualFunds";
  if (/stock|share|nse|bse|ticker|symbol|ltp|cmp/.test(body)) return "stocks";
  if (/ulip|policy|premium/.test(body)) return "ulips";
  if (/nsel|e-gold|e-silver|eseries|e series/.test(body)) return "nsel";
  if (/gold|silver|bullion/.test(body)) return "bullion";
  if (
    /fixed|fd|deposit|ppf|sukanya|ssy|provident|epf|gratuity|bond|nsc|kvp|maturity/.test(
      body,
    )
  )
    return "fixedIncome";
  if (/property|residential|commercial|location/.test(body)) return "property";
  if (/loan|emi|principal|outstanding/.test(body)) return "loans";
  if (/borrow/.test(body)) return "borrowings";
  return "otherAssets";
}

export function mapImportedRow(
  row: Row,
  moduleKey: string,
  accountOverride = "",
) {
  const get = (aliases: string[]) => val(row, aliases);
  const num = (aliases: string[]) => n(get(aliases));
  const mapped: Row = {
    account_name: accountOverride || get(["account", "account name", "owner"]),
    security_name:
      get([
        "security name",
        "name",
        "company",
        "stock name",
        "share",
        "scheme name",
        "fund name",
        "instrument",
        "asset name",
        "property type",
        "loan type",
        "policy name",
        "metal",
      ]) || "Imported Item",
    notes: "Imported",
  };

  if (moduleKey === "stocks")
    Object.assign(mapped, {
      ticker_symbol: get(["symbol", "ticker", "scrip"]),
      exchange: get(["exchange"]) || "NSE",
      category: get(["sector", "category"]),
      quantity: num(["qty", "quantity", "shares", "units"]),
      inv_price: num(["avg price", "buy price", "purchase price"]),
      live_price: num(["ltp", "cmp", "current price", "market price"]),
      investment_amount: num([
        "invested value",
        "investment amount",
        "cost value",
        "buy value",
      ]),
      latest_value: num(["market value", "current value", "latest value", "value"]),
      broker: get(["broker", "platform"]),
    });
  else if (moduleKey === "watchlist")
    Object.assign(mapped, {
      ticker_symbol: get(["symbol", "ticker", "scrip"]),
      exchange: get(["exchange"]) || "NSE",
      category: get(["sector", "category"]),
      quantity: num(["qty", "quantity", "shares", "units"]) || 1,
      base_price: num(["added price", "base price", "buy price", "price"]),
      base_price_date: get(["date added", "added date", "base price date", "date"]),
      current_price: num(["ltp", "cmp", "current price", "market price"]),
      target_price: num(["target price", "target"]),
    });
  else if (moduleKey === "mutualFunds")
    Object.assign(mapped, {
      scheme_code: get(["amfi code", "scheme code", "isin", "code"]),
      category: get(["category", "fund type"]),
      quantity: num(["units", "quantity"]),
      nav: num(["avg nav", "purchase nav", "buy nav", "nav"]),
      live_nav: num(["current nav", "latest nav", "live nav"]),
      investment_amount: num([
        "invested value",
        "investment amount",
        "cost value",
        "amount",
      ]),
      latest_value: num(["market value", "current value", "latest value", "value"]),
      broker: get(["amc", "broker", "platform"]),
    });
  else if (moduleKey === "ulips")
    Object.assign(mapped, {
      category: get(["provider", "insurer", "category"]),
      premium_amount: num(["premium", "premium amount"]),
      investment_amount: num([
        "investment amount",
        "premium paid",
        "invested value",
      ]),
      latest_value: num(["fund value", "current value", "latest value", "value"]),
      maturity_date: get(["maturity date"]),
    });
  else if (["bullion", "nsel"].includes(moduleKey))
    Object.assign(mapped, {
      quantity: num(["qty", "quantity", "units"]),
      unit: get(["unit"]) || "units",
      city: get(["city", "location", "purchase city"]),
      local_premium_per_gram: num(["local premium per gram", "local premium"]),
      metal_cost: num(["metal cost", "base metal cost"]),
      making_charges: num(["making charges", "making charge"]),
      gst_paid: num(["gst paid", "gst", "tax paid"]),
      other_costs: num(["other costs", "other charges"]),
      purchase_price: num([
        "total landed cost",
        "purchase price",
        "invested value",
        "cost value",
        "amount",
      ]),
      latest_value: num(["market value", "current value", "latest value", "value"]),
      broker: get(["vault", "broker", "source"]),
    });
  else if (moduleKey === "fixedIncome")
    Object.assign(mapped, {
      category: get(["type", "category"]) || "FD",
      purchase_date: get([
        "investment date",
        "purchase date",
        "deposit date",
        "start date",
      ]),
      account_creation_date: get([
        "account creation date",
        "account opening date",
        "opening date",
      ]),
      initial_investment: num([
        "initial investment",
        "opening balance",
        "deposit amount",
        "principal",
        "amount",
      ]),
      yearly_investment: num([
        "yearly investment",
        "annual investment",
        "annual contribution",
        "yearly contribution",
      ]),
      investment_amount: num([
        "invested value",
        "investment amount",
        "total invested",
        "cost value",
      ]),
      interest_rate: num(["interest rate", "rate", "govt rate", "government rate"]),
      rate_year: get(["rate year", "fy", "financial year"]),
      lock_in_years: num([
        "lock in years",
        "lock-in years",
        "lock period",
        "lock-in period",
      ]),
      employee_contribution: num([
        "employee contribution",
        "employee pf contribution",
      ]),
      company_contribution: num([
        "company contribution",
        "employer contribution",
        "company pf contribution",
      ]),
      gratuity_value: num(["gratuity value", "gratuity"]),
      maturity_value: num(["maturity value", "maturity amount"]),
      current_value_today: num([
        "current value as of today",
        "current value",
        "latest value",
        "value",
      ]),
      maturity_date: get(["maturity date"]),
      broker: get(["bank", "issuer", "institution"]),
    });
  else if (moduleKey === "insurance")
    Object.assign(mapped, {
      category: get(["policy type", "type", "category"]) || "Term Plan",
      sum_assured: num(["sum assured", "life cover", "cover amount", "coverage"]),
      payout_value: num([
        "payout value",
        "payout amount",
        "surrender value",
        "maturity payout",
        "current payout value",
      ]),
      current_value_including_bonus: num([
        "current value including bonus",
        "value including bonus",
        "current value with bonus",
        "policy value including bonus",
        "current policy value",
      ]),
      annual_premium: num(["annual premium", "premium", "premium amount"]),
      premium_due_date: get(["premium due date", "due date"]),
      policy_start_date: get(["policy start date", "start date"]),
      policy_end_date: get(["policy end date", "end date", "maturity date"]),
      nominee: get(["nominee"]),
      status: get(["status"]) || "Active",
      broker: get(["insurer", "insurance company", "platform", "broker"]),
    });
  else if (moduleKey === "property")
    Object.assign(mapped, {
      category: get(["status", "category"]),
      location: get(["location", "city", "project"]),
      purchase_price: num(["purchase price", "cost value", "invested value"]),
      latest_value: num(["market value", "latest value", "current value", "value"]),
      broker: get(["builder", "broker", "agent"]),
    });
  else if (["loans", "borrowings"].includes(moduleKey))
    Object.assign(mapped, {
      category: get(["type", "category"]),
      loan_amount: num(["loan amount", "amount", "sanctioned amount"]),
      interest_rate: num(["interest rate", "rate"]),
      principal_paid: num(["principal paid", "amount paid", "repaid"]),
      interest_paid: num(["interest paid"]),
      loan_balance: num(["loan balance", "outstanding", "balance"]),
      emis_left: num(["emis left", "emi left"]),
      broker: get(["bank", "lender", "broker"]),
    });
  else
    Object.assign(mapped, {
      category: get(["category", "type"]),
      purchase_price: num([
        "purchase price",
        "invested value",
        "cost value",
        "amount",
      ]),
      latest_value: num(["market value", "current value", "latest value", "value"]),
      broker: get(["broker", "source"]),
    });
  return mapped;
}
