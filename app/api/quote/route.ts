import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Provider = "twelvedata" | "alphavantage" | "polygon" | "yahoo";
type Quote = {
  symbol: string;
  price: number;
  previousClose: number | null;
  change: number;
  changePct: number;
  dayHigh?: number | null;
  dayLow?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  currency: string;
  provider: string;
  freshness: string;
  providerTime?: string;
};

const DEFAULT_PROVIDER_ORDER: Provider[] = [
  "twelvedata",
  "alphavantage",
  "polygon",
  "yahoo",
];

function normalizedExchange(exchange = "NSE") {
  return exchange.trim().toUpperCase() || "NSE";
}

function isIndianExchange(exchange: string) {
  return ["NSE", "BSE"].includes(normalizedExchange(exchange));
}

function isUsExchange(exchange: string) {
  return ["NYSE", "NASDAQ", "US", "AMEX", "OTC"].includes(
    normalizedExchange(exchange),
  );
}

function number(value: any) {
  const parsed = Number(String(value ?? "").replace(/[%,$]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function quoteResult(
  symbol: string,
  price: number | null,
  previousClose: number | null,
  suppliedChange: number | null,
  suppliedChangePct: number | null,
  currency: string,
  provider: string,
  freshness: string,
  providerTime?: string,
  extras: Partial<
    Pick<Quote, "dayHigh" | "dayLow" | "fiftyTwoWeekHigh" | "fiftyTwoWeekLow">
  > = {},
): Quote {
  if (price === null) throw new Error("Live price not available");
  const change =
    suppliedChange ?? (previousClose === null ? 0 : price - previousClose);
  const changePct =
    suppliedChangePct ??
    (previousClose ? (change / previousClose) * 100 : 0);
  return {
    symbol,
    price,
    previousClose,
    change,
    changePct,
    ...extras,
    currency,
    provider,
    freshness,
    providerTime,
  };
}

function providerOrder() {
  const configured = String(process.env.MARKET_DATA_PROVIDERS || "")
    .toLowerCase()
    .split(",")
    .map((provider) => provider.trim())
    .filter((provider): provider is Provider =>
      DEFAULT_PROVIDER_ORDER.includes(provider as Provider),
    );
  const selected = configured.length ? configured : DEFAULT_PROVIDER_ORDER;
  return [...new Set([...selected, "yahoo" as Provider])];
}

function yahooSymbol(symbol: string, exchange = "NSE") {
  const ticker = symbol.trim().toUpperCase();
  if (!ticker) return "";
  if (ticker.includes(".") || normalizedExchange(exchange) === "INDEX") {
    return ticker;
  }
  if (normalizedExchange(exchange) === "BSE") return `${ticker}.BO`;
  if (normalizedExchange(exchange) === "NSE") return `${ticker}.NS`;
  return ticker;
}

async function twelveDataQuote(symbol: string, exchange: string) {
  const apiKey = process.env.TWELVE_DATA_API_KEY?.trim();
  if (!apiKey) throw new Error("not configured");
  const market = normalizedExchange(exchange);
  if (market === "INDEX") throw new Error("unsupported market");
  const params = new URLSearchParams({
    symbol: symbol.trim().toUpperCase(),
    exchange: market,
    apikey: apiKey,
  });
  const res = await fetch(`https://api.twelvedata.com/quote?${params}`, {
    cache: "no-store",
  });
  const data = await res.json();
  if (
    !res.ok ||
    data?.status === "error" ||
    data?.code ||
    !number(data?.close)
  ) {
    throw new Error(data?.message || "Twelve Data quote failed");
  }
  return quoteResult(
    data.symbol || symbol,
    number(data.close),
    number(data.previous_close),
    number(data.change),
    number(data.percent_change),
    data.currency || (isIndianExchange(market) ? "INR" : "USD"),
    "Twelve Data",
    isIndianExchange(market) ? "end-of-day for NSE/BSE" : "latest quote",
    data.datetime,
    {
      dayHigh: number(data.high),
      dayLow: number(data.low),
      fiftyTwoWeekHigh: number(data.fifty_two_week?.high),
      fiftyTwoWeekLow: number(data.fifty_two_week?.low),
    },
  );
}

function alphaVantageSymbol(symbol: string, exchange: string) {
  const ticker = symbol.trim().toUpperCase();
  const market = normalizedExchange(exchange);
  if (!ticker || market === "NSE" || market === "INDEX") {
    return "";
  }
  if (market === "BSE") {
    return ticker.endsWith(".BSE") ? ticker : `${ticker}.BSE`;
  }
  return ticker;
}

async function alphaVantageQuote(symbol: string, exchange: string) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY?.trim();
  if (!apiKey) throw new Error("not configured");
  const ticker = alphaVantageSymbol(symbol, exchange);
  if (!ticker) throw new Error("unsupported market");
  const params = new URLSearchParams({
    function: "GLOBAL_QUOTE",
    symbol: ticker,
    apikey: apiKey,
  });
  const entitlement = isUsExchange(exchange)
    ? process.env.ALPHA_VANTAGE_ENTITLEMENT?.trim()
    : "";
  if (entitlement) params.set("entitlement", entitlement);
  const res = await fetch(`https://www.alphavantage.co/query?${params}`, {
    cache: "no-store",
  });
  const data = await res.json();
  const quote = data?.["Global Quote"] || {};
  if (!res.ok || data?.Information || data?.Note || !number(quote["05. price"])) {
    throw new Error(data?.Information || data?.Note || "Alpha Vantage quote failed");
  }
  return quoteResult(
    quote["01. symbol"] || ticker,
    number(quote["05. price"]),
    number(quote["08. previous close"]),
    number(quote["09. change"]),
    number(quote["10. change percent"]),
    isIndianExchange(exchange) ? "INR" : "USD",
    "Alpha Vantage",
    entitlement || "end-of-day by default; real-time entitlement is US-only",
    quote["07. latest trading day"],
    {
      dayHigh: number(quote["03. high"]),
      dayLow: number(quote["04. low"]),
    },
  );
}

async function polygonQuote(symbol: string, exchange: string) {
  const apiKey = process.env.POLYGON_API_KEY?.trim();
  if (!apiKey) throw new Error("not configured");
  if (!isUsExchange(exchange)) throw new Error("unsupported market");
  const ticker = symbol.trim().toUpperCase();
  const params = new URLSearchParams({ apiKey });
  const res = await fetch(
    `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(ticker)}?${params}`,
    { cache: "no-store" },
  );
  const data = await res.json();
  const snapshot = data?.ticker || {};
  if (!res.ok || data?.status === "ERROR") {
    throw new Error(data?.error || "Polygon quote failed");
  }
  const previousClose = number(snapshot?.prevDay?.c);
  const price =
    number(snapshot?.lastTrade?.p) ??
    number(snapshot?.day?.c) ??
    previousClose;
  return quoteResult(
    snapshot.ticker || ticker,
    price,
    previousClose,
    number(snapshot.todaysChange),
    number(snapshot.todaysChangePerc),
    "USD",
    "Polygon.io",
    "depends on Polygon subscription plan",
    snapshot?.updated ? new Date(Number(snapshot.updated) / 1e6).toISOString() : undefined,
    {
      dayHigh: number(snapshot?.day?.h),
      dayLow: number(snapshot?.day?.l),
    },
  );
}

async function yahooQuote(symbol: string, exchange: string) {
  const resolved = yahooSymbol(symbol, exchange);
  if (!resolved) throw new Error("Ticker missing");
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(resolved)}?interval=1d&range=1d`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 AssetManager/1.0",
        Accept: "application/json,text/plain,*/*",
      },
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error("Yahoo Finance quote failed");
  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta || {};
  const price = number(meta.regularMarketPrice ?? meta.previousClose);
  const previousClose = number(meta.previousClose ?? meta.chartPreviousClose);
  return quoteResult(
    resolved,
    price,
    previousClose,
    null,
    null,
    meta.currency || "INR",
    "Yahoo Finance fallback",
    "latest available",
    undefined,
    {
      dayHigh: number(meta.regularMarketDayHigh),
      dayLow: number(meta.regularMarketDayLow),
      fiftyTwoWeekHigh: number(meta.fiftyTwoWeekHigh),
      fiftyTwoWeekLow: number(meta.fiftyTwoWeekLow),
    },
  );
}

async function fetchProvider(provider: Provider, symbol: string, exchange: string) {
  if (provider === "twelvedata") return twelveDataQuote(symbol, exchange);
  if (provider === "alphavantage") return alphaVantageQuote(symbol, exchange);
  if (provider === "polygon") return polygonQuote(symbol, exchange);
  return yahooQuote(symbol, exchange);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "";
  const exchange = searchParams.get("exchange") || "NSE";
  if (!symbol.trim()) {
    return NextResponse.json({ error: "Ticker missing" }, { status: 400 });
  }

  const attempted: string[] = [];
  for (const provider of providerOrder()) {
    try {
      const quote = await fetchProvider(provider, symbol, exchange);
      return NextResponse.json(
        { ...quote, attempted, time: new Date().toISOString() },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    } catch (error: any) {
      attempted.push(`${provider}: ${error?.message || "failed"}`);
    }
  }

  return NextResponse.json(
    { error: "Quote failed", symbol: yahooSymbol(symbol, exchange), attempted },
    { status: 502 },
  );
}
