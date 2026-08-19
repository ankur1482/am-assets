import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "edge";
export const preferredRegion = "bom1";

// No public/CDN caching: bullion rates must come straight from the request-
// scoped MCX/Moneycontrol fetch below, not an edge-cached copy that can be a
// different age at every PoP (that's what caused refreshes to reveal
// progressively "less stale" snapshots instead of the current rate).
const RESPONSE_CACHE_CONTROL = "no-store, max-age=0, must-revalidate";
const TROY_OZ_GRAMS = 31.1034768;
const MCX_MARKET_WATCH_URL =
  "https://www.mcxindia.com/market-data/market-watch";
const MCX_MARKET_WATCH_API =
  "https://www.mcxindia.com/backpage.aspx/GetMarketWatch";
const MONEYCONTROL_COMMODITY_URL = "https://www.moneycontrol.com/commodity/";
const MONEYCONTROL_MCX_API =
  "https://priceapi.moneycontrol.com/technicalCompanyData/commodity/getMajorCommodities?tabName=MCX&deviceType=W";
const symbols: Record<string, string> = {
  gold: "GC=F",
  silver: "SI=F",
  platinum: "PL=F",
  crude: "CL=F",
};

type McxRow = Record<string, unknown>;

type BullionPrice = {
  symbol: string;
  instrument: "FUTCOM";
  expiryDate: string;
  ltp: number;
  todayLow: number | null;
  todayHigh: number | null;
  week52Low: number | null;
  week52High: number | null;
  updatedAt: string;
};

function numberValue(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value ?? "")
    .replace(/&#x20b9;|&nbsp;|[₹,\s]/gi, "")
    .trim();
  if (!text || /^-+$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstValue(row: McxRow, keys: string[]): unknown {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return null;
}

function firstNumber(row: McxRow, keys: string[]): number | null {
  for (const key of keys) {
    const value = numberValue(row?.[key]);
    if (value !== null) return value;
  }
  return null;
}

const months = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
} as const;

function parseExpiry(value: unknown): { iso: string; time: number } | null {
  const text = String(value ?? "").trim().toUpperCase();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const time = Date.UTC(year, month - 1, day);
    return Number.isFinite(time) ? { iso: text, time } : null;
  }
  const compact = text.replace(/[\s/-]/g, "");
  const match = compact.match(/^(\d{1,2})([A-Z]{3})(\d{2}|\d{4})$/);
  if (!match) return null;
  const month = {
    JAN: 0,
    FEB: 1,
    MAR: 2,
    APR: 3,
    MAY: 4,
    JUN: 5,
    JUL: 6,
    AUG: 7,
    SEP: 8,
    OCT: 9,
    NOV: 10,
    DEC: 11,
  }[match[2] as keyof typeof months];
  if (month === undefined) return null;
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const day = Number(match[1]);
  const time = Date.UTC(year, month, day);
  if (!Number.isFinite(time)) return null;
  return {
    iso: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    time,
  };
}

function indiaTradingDayStart(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";
  return Date.UTC(Number(get("year")), Number(get("month")) - 1, Number(get("day")));
}

function parseMcxTimestamp(value: unknown): string {
  const text = String(value ?? "").trim();
  const dotNet = text.match(/^\/Date\((-?\d+)(?:[+-]\d+)?\)\/$/);
  if (dotNet) {
    const date = new Date(Number(dotNet[1]));
    if (Number.isFinite(date.getTime())) return date.toISOString();
  }
  const numericTimestamp = text.match(/^\d{10,13}$/)
    ? Number(text) * (text.length === 10 ? 1000 : 1)
    : null;
  const date = new Date(
    numericTimestamp ?? text.replace(/\s*\|\s*/, " "),
  );
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

function rowSymbol(row: McxRow): string {
  return String(
    firstValue(row, [
      "Symbol",
      "symbol",
      "Commodity",
      "commodity",
      "CommodityName",
      "Product",
    ]) ?? "",
  )
    .toUpperCase()
    .replace(/\s+/g, "");
}

function rowInstrument(row: McxRow): string {
  return String(
    firstValue(row, [
      "InstrumentName",
      "instrumentName",
      "Instrument",
      "instrument",
      "InstrumentType",
    ]) ?? "",
  ).toUpperCase();
}

function normalizeBullionRow(row: McxRow): BullionPrice | null {
  const expiry = parseExpiry(
    firstValue(row, [
      "ExpiryDate",
      "expiryDate",
      "ExpDate",
      "expDate",
      "Expiry",
      "expiry",
    ]),
  );
  const ltp = firstNumber(row, [
    "LTP",
    "ltp",
    "LastPrice",
    "lastPrice",
    "LastTradedPrice",
  ]);
  if (!expiry || ltp === null || ltp <= 0) return null;

  return {
    symbol: rowSymbol(row),
    instrument: "FUTCOM",
    expiryDate: expiry.iso,
    ltp,
    todayLow: firstNumber(row, ["Low", "low", "DayLow", "dayLow", "LowPrice"]),
    todayHigh: firstNumber(row, [
      "High",
      "high",
      "DayHigh",
      "dayHigh",
      "HighPrice",
    ]),
    week52Low: firstNumber(row, [
      "FiftyTwoWeekLow",
      "fiftyTwoWeekLow",
      "Week52Low",
      "week52Low",
      "YearLow",
      "yearLow",
      "Low52Week",
    ]),
    week52High: firstNumber(row, [
      "FiftyTwoWeekHigh",
      "fiftyTwoWeekHigh",
      "Week52High",
      "week52High",
      "YearHigh",
      "yearHigh",
      "High52Week",
    ]),
    updatedAt:
      parseMcxTimestamp(
        firstValue(row, [
          "LTT",
          "ltt",
          "LastTradeTime",
          "lastTradeTime",
          "UpdatedAt",
          "updatedAt",
        ]),
      ) || new Date().toISOString(),
  };
}

function hasUsableMcxPrice(row: McxRow, now: Date): boolean {
  const tradedToday = firstNumber(row, [
    "TodaysTraded",
    "todaysTraded",
    "TodayTraded",
  ]);
  if (tradedToday === 0) return false;

  const updatedAt = parseMcxTimestamp(
    firstValue(row, ["LTT", "ltt", "LastTradeTime", "lastTradeTime"]),
  );
  if (!updatedAt) return true;
  return now.getTime() - new Date(updatedAt).getTime() <= 7 * 24 * 60 * 60 * 1000;
}

function getNearestExpiryBullionContract(
  rows: McxRow[],
  symbol: string,
  now = new Date(),
): BullionPrice | null {
  const requested = symbol.toUpperCase();
  const today = indiaTradingDayStart(now);

  return (
    rows
      .filter(
        (row) =>
          rowInstrument(row) === "FUTCOM" &&
          rowSymbol(row) === requested &&
          hasUsableMcxPrice(row, now),
      )
      .map((row) => {
        const price = normalizeBullionRow(row);
        const expiry = price ? parseExpiry(price.expiryDate) : null;
        return price && expiry ? { price, expiry: expiry.time } : null;
      })
      .filter(
        (item): item is { price: BullionPrice; expiry: number } =>
          Boolean(item) && item!.expiry >= today,
      )
      .sort((a, b) => a.expiry - b.expiry)[0]?.price ?? null
  );
}

function unpackMcxRows(payload: unknown): McxRow[] {
  let data: any = (payload as any)?.d?.Data ?? (payload as any)?.d ?? payload;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return [];
    }
  }
  return Array.isArray(data) ? data : Array.isArray(data?.Data) ? data.Data : [];
}

let marketWatchRequest: Promise<McxRow[]> | null = null;

async function fetchMcxRows(): Promise<McxRow[]> {
  if (marketWatchRequest) return marketWatchRequest;
  marketWatchRequest = (async () => {
    const response = await fetch(MCX_MARKET_WATCH_API, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "en-US,en;q=0.5",
        "Content-Type": "application/json",
        Origin: "https://www.mcxindia.com",
        Referer: MCX_MARKET_WATCH_URL,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      throw new Error(`MCX market watch returned ${response.status}`);
    }
    const rows = unpackMcxRows(await response.json());
    if (!rows.length) throw new Error("MCX market watch returned no contracts");
    return rows;
  })();

  try {
    return await marketWatchRequest;
  } finally {
    setTimeout(() => {
      marketWatchRequest = null;
    }, 1_500);
  }
}

async function fetchMCXBullionPrices(): Promise<{
  gold: BullionPrice | null;
  silver: BullionPrice | null;
}> {
  const rows = await fetchMcxRows();
  return {
    gold:
      getNearestExpiryBullionContract(rows, "GOLD") ??
      getNearestExpiryBullionContract(rows, "GOLDM"),
    silver:
      getNearestExpiryBullionContract(rows, "SILVER") ??
      getNearestExpiryBullionContract(rows, "SILVERM"),
  };
}

function previousClose(row: McxRow, price: BullionPrice): number | null {
  return firstNumber(row, [
    "Close",
    "close",
    "PreviousClose",
    "previousClose",
    "PrevClose",
    "prevClose",
  ]);
}

async function mcxBullionQuote(asset: "gold" | "silver") {
  const rows = await fetchMcxRows();
  const preferred = asset === "gold" ? ["GOLD", "GOLDM"] : ["SILVER", "SILVERM"];
  let price: BullionPrice | null = null;
  for (const symbol of preferred) {
    price = getNearestExpiryBullionContract(rows, symbol);
    if (price) break;
  }
  if (!price) throw new Error(`MCX ${asset} FUTCOM price unavailable`);

  const sourceRow =
    rows.find(
      (row) =>
        rowInstrument(row) === "FUTCOM" &&
        rowSymbol(row) === price!.symbol &&
        parseExpiry(firstValue(row, ["ExpiryDate", "expiryDate"]))?.iso ===
          price!.expiryDate,
    ) ?? {};
  const close = previousClose(sourceRow, price);
  const change =
    firstNumber(sourceRow, [
      "AbsChange",
      "absChange",
      "Change",
      "change",
      "NetChange",
      "netChange",
    ]) ?? (close === null ? 0 : price.ltp - close);

  const common = {
    instrument: price.instrument,
    expiryDate: price.expiryDate,
    expiry: price.expiryDate,
    contractExpiry: price.expiryDate,
    ltp: price.ltp,
    current_price: price.ltp,
    todayLow: price.todayLow,
    todayHigh: price.todayHigh,
    dayLow: price.todayLow,
    dayHigh: price.todayHigh,
    week52Low: price.week52Low,
    week52High: price.week52High,
    fiftyTwoWeekLow: price.week52Low,
    fiftyTwoWeekHigh: price.week52High,
    updatedAt: price.updatedAt,
    lastUpdate: price.updatedAt,
    provider: "MCX market watch nearest active FUTCOM contract",
    sourceUrl: MCX_MARKET_WATCH_URL,
    market: "MCX commodity futures",
  };

  if (asset === "gold") {
    return {
      ...common,
      symbol: price.symbol,
      ratePer10GramInr: price.ltp,
      ratePerGramInr: price.ltp / 10,
      previousPer10GramInr: close,
      previousPerGramInr: close === null ? null : close / 10,
      changePer10GramInr: change,
      changePerGramInr: change / 10,
    };
  }
  return {
    ...common,
    symbol: price.symbol,
    ratePerKgInr: price.ltp,
    ratePerGramInr: price.ltp / 1000,
    previousPerKgInr: close,
    previousPerGramInr: close === null ? null : close / 1000,
    changePerKgInr: change,
    changePerGramInr: change / 1000,
  };
}

async function moneycontrolBullionQuote(
  asset: "gold" | "silver",
  primaryError: unknown,
) {
  const symbol = asset === "gold" ? "GOLD" : "SILVER";
  const listResponse = await fetch(MONEYCONTROL_MCX_API, {
    headers: {
      Accept: "application/json",
      Referer: MONEYCONTROL_COMMODITY_URL,
      "User-Agent": "Mozilla/5.0 AssetManager/1.0",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!listResponse.ok) {
    throw new Error(`Bullion backup returned ${listResponse.status}`);
  }

  const listPayload = await listResponse.json();
  const row = (listPayload?.data?.list ?? []).find(
    (item: McxRow) => rowSymbol(item) === symbol,
  );
  const listPrice = firstNumber(row ?? {}, [
    "lastPrice",
    "LastPrice",
    "LTP",
  ]);
  const expiry = parseExpiry(firstValue(row ?? {}, ["expDate", "ExpiryDate"]));
  if (!row || listPrice === null || listPrice <= 0 || !expiry) {
    throw new Error(`Bullion backup ${asset} price unavailable`);
  }

  const detailUrl = `https://www.moneycontrol.com/commodity/mcx-${asset}-price?exp=${encodeURIComponent(expiry.iso)}&type=futures`;
  let detail: McxRow = {};
  try {
    const detailResponse = await fetch(detailUrl, {
      headers: {
        Accept: "text/html,*/*",
        "User-Agent": "Mozilla/5.0 AssetManager/1.0",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (detailResponse.ok) {
      const html = await detailResponse.text();
      const jsonText = html.match(
        /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
      )?.[1];
      if (jsonText) {
        detail =
          JSON.parse(jsonText)?.props?.pageProps?.data?.commodityData ?? {};
      }
    }
  } catch {
    // The summary feed still provides a valid backup LTP and daily change.
  }

  const ltp =
    firstNumber(detail, ["lastPrice", "LastPrice", "LTP"]) ?? listPrice;
  const change =
    firstNumber(detail, ["change", "Change"]) ??
    firstNumber(row, ["priceChange", "PriceChange"]) ??
    0;
  const previous =
    firstNumber(detail, ["prevClose", "previousClose", "PreviousClose"]) ??
    ltp - change;
  const updatedAt =
    parseMcxTimestamp(firstValue(detail, ["lastupdEpoch", "lastupdTime"])) ||
    parseMcxTimestamp(listPayload?.data?.lastUpdated) ||
    new Date().toISOString();
  const common = {
    symbol,
    instrument: "FUTCOM" as const,
    expiryDate: expiry.iso,
    expiry: expiry.iso,
    contractExpiry: expiry.iso,
    ltp,
    current_price: ltp,
    todayLow: firstNumber(detail, ["lowPrice", "Low", "dayLow"]),
    todayHigh: firstNumber(detail, ["highPrice", "High", "dayHigh"]),
    dayLow: firstNumber(detail, ["lowPrice", "Low", "dayLow"]),
    dayHigh: firstNumber(detail, ["highPrice", "High", "dayHigh"]),
    week52Low: null,
    week52High: null,
    fiftyTwoWeekLow: null,
    fiftyTwoWeekHigh: null,
    updatedAt,
    lastUpdate: updatedAt,
    provider: "Moneycontrol MCX active-contract backup",
    sourceUrl: detailUrl,
    market: "MCX commodity futures backup",
    isFallback: true,
    fallbackReason:
      primaryError instanceof Error
        ? primaryError.message
        : "MCX market watch unavailable",
  };

  if (asset === "gold") {
    return {
      ...common,
      ratePer10GramInr: ltp,
      ratePerGramInr: ltp / 10,
      previousPer10GramInr: previous,
      previousPerGramInr: previous / 10,
      changePer10GramInr: change,
      changePerGramInr: change / 10,
    };
  }
  return {
    ...common,
    ratePerKgInr: ltp,
    ratePerGramInr: ltp / 1000,
    previousPerKgInr: previous,
    previousPerGramInr: previous / 1000,
    changePerKgInr: change,
    changePerGramInr: change / 1000,
  };
}

async function bullionQuote(
  asset: "gold" | "silver",
  source: "auto" | "mcx" | "moneycontrol",
) {
  if (source === "mcx") return mcxBullionQuote(asset);
  if (source === "moneycontrol") {
    return moneycontrolBullionQuote(
      asset,
      new Error("Moneycontrol selected manually"),
    );
  }
  try {
    return await mcxBullionQuote(asset);
  } catch (primaryError) {
    return moneycontrolBullionQuote(asset, primaryError);
  }
}

async function yahooPrice(symbol: string) {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 AssetManager/1.0",
      },
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error("Market data request failed");
  const meta = (await response.json())?.chart?.result?.[0]?.meta ?? {};
  const price = Number(meta.regularMarketPrice ?? meta.previousClose);
  if (!Number.isFinite(price)) throw new Error("Price unavailable");
  return price;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const asset = String(searchParams.get("asset") || "gold").toLowerCase();
  const requestedSource = String(searchParams.get("source") || "auto").toLowerCase();
  const source: "auto" | "mcx" | "moneycontrol" =
    requestedSource === "mcx" || requestedSource === "moneycontrol"
      ? requestedSource
      : "auto";
  const symbol = symbols[asset];
  if (!symbol) {
    return NextResponse.json({ error: "Unsupported asset" }, { status: 400 });
  }

  try {
    if (asset === "gold" || asset === "silver") {
      const quote = await bullionQuote(asset, source);
      return NextResponse.json(
        {
          asset,
          ...quote,
          currency: "INR",
          unit: asset === "gold" ? "10g" : "kg",
          time: new Date().toISOString(),
        },
        { headers: { "Cache-Control": RESPONSE_CACHE_CONTROL } },
      );
    }
    if (asset === "crude") {
      const usdPerBarrel = await yahooPrice(symbol);
      return NextResponse.json(
        {
          asset,
          symbol,
          usdPerBarrel,
          currency: "USD",
          unit: "barrel",
          provider: "Yahoo Finance WTI crude futures",
          time: new Date().toISOString(),
        },
        { headers: { "Cache-Control": RESPONSE_CACHE_CONTROL } },
      );
    }

    const [usdPerOz, usdInr] = await Promise.all([
      yahooPrice(symbol),
      yahooPrice("USDINR=X"),
    ]);
    return NextResponse.json(
      {
        asset,
        symbol,
        usdPerOz,
        usdInr,
        ratePerGramInr: (usdPerOz * usdInr) / TROY_OZ_GRAMS,
        currency: "INR",
        unit: "gram",
        provider: "Yahoo Finance futures + USDINR",
        time: new Date().toISOString(),
      },
      { headers: { "Cache-Control": RESPONSE_CACHE_CONTROL } },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Price unavailable",
        provider: "MCX market watch + Moneycontrol backup",
        sourceUrl: MCX_MARKET_WATCH_URL,
      },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
