import { NextResponse } from "next/server";
import { getKotakCredential } from "@/lib/kotak";
import { authenticateRequest } from "@/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// No public/CDN caching at all: quotes must reflect the same short-lived
// in-memory cache below on every request, not a separately-aged copy sitting
// at some edge node. Relying on a CDN layer here caused refreshes to reveal
// different-aged snapshots depending on which edge PoP served the request.
const RESPONSE_CACHE_CONTROL = "no-store, max-age=0, must-revalidate";

type Provider = "kotak" | "twelvedata" | "alphavantage" | "polygon" | "yahoo";
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
  "kotak",
  "twelvedata",
  "alphavantage",
  "polygon",
  "yahoo",
];
const QUOTE_CACHE_TTL_MS = 15 * 1000;
const QUOTE_STALE_TTL_MS = 2 * 60 * 1000;
const QUOTE_CACHE_MAX_ENTRIES = 500;

type QuoteCacheEntry = {
  quote: Quote;
  attempted: string[];
  savedAt: number;
};

const quoteCache = new Map<string, QuoteCacheEntry>();

function pruneQuoteCache(now=Date.now()){
  for(const [key,entry] of quoteCache){
    if(now-entry.savedAt>=QUOTE_STALE_TTL_MS)quoteCache.delete(key);
  }
  while(quoteCache.size>QUOTE_CACHE_MAX_ENTRIES){
    const oldest=quoteCache.keys().next().value;
    if(!oldest)break;
    quoteCache.delete(oldest);
  }
}

function cacheQuote(key:string,value:QuoteCacheEntry){
  quoteCache.delete(key);
  quoteCache.set(key,value);
  pruneQuoteCache();
}

function normalizedExchange(exchange = "NSE") {
  return exchange.trim().toUpperCase() || "NSE";
}

function quoteCacheKey(symbol: string, exchange: string) {
  return `${normalizedExchange(exchange)}:${symbol.trim().toUpperCase()}`;
}

function isIndianExchange(exchange: string) {
  return ["NSE", "BSE"].includes(normalizedExchange(exchange));
}

function isIndexExchange(exchange: string) {
  return normalizedExchange(exchange) === "INDEX";
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
  // A real previous close is always positive; treat null/zero/negative the
  // same way (no usable baseline) so a bad zero can't make "change" jump to
  // the full price while changePct's own truthy guard shows 0%.
  const hasPreviousClose = previousClose !== null && previousClose > 0;
  const change =
    suppliedChange ?? (hasPreviousClose ? price - previousClose : 0);
  const changePct =
    suppliedChangePct ??
    (hasPreviousClose ? (change / previousClose) * 100 : 0);
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

function providerOrder(preferredProvider = "") {
  const preferred = preferredProvider.trim().toLowerCase();
  const preferredList = DEFAULT_PROVIDER_ORDER.includes(preferred as Provider)
    ? [preferred as Provider]
    : [];
  const configured = String(process.env.MARKET_DATA_PROVIDERS || "")
    .toLowerCase()
    .split(",")
    .map((provider) => provider.trim())
    .filter((provider): provider is Provider =>
      DEFAULT_PROVIDER_ORDER.includes(provider as Provider),
    );
  const selected = preferredList.length
    ? preferredList
    : configured.length
      ? configured
      : DEFAULT_PROVIDER_ORDER;
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

function lookupKey(value: string) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

// pSymbol -> trading-symbol map, per baseUrl+market. Cached in memory since
// the scrip master file is a shared instrument list, not per-user data, and
// only changes (at most) once a day.
type KotakScripIndex = Map<string, string>;
const kotakScripCache = new Map<string, Promise<KotakScripIndex>>();
const KOTAK_SCRIP_TTL_MS = 6 * 60 * 60 * 1000;
const kotakScripSavedAt = new Map<string, number>();

async function kotakScripMap(baseUrl: string, token: string, market: "NSE" | "BSE") {
  const cacheKey = `${baseUrl}:${market}`;
  const savedAt = kotakScripSavedAt.get(cacheKey) || 0;
  if (!kotakScripCache.has(cacheKey) || Date.now() - savedAt > KOTAK_SCRIP_TTL_MS) {
    kotakScripSavedAt.set(cacheKey, Date.now());
    const attempt = (async () => {
      const pathsRes = await fetch(`${baseUrl}/script-details/1.0/masterscrip/file-paths`, {
        headers: { Authorization: token },
        cache: "no-store",
      });
      if (!pathsRes.ok) {
        const bodyText = await pathsRes.text().catch(() => "");
        throw new Error(
          `Kotak scrip master returned ${pathsRes.status}${bodyText ? `: ${bodyText.slice(0, 200)}` : ""}`,
        );
      }
      const paths = await pathsRes.json();
      const files: string[] = paths?.data?.filesPaths || [];
      const target = market === "NSE" ? /nse_cm.*\.csv$/i : /bse_cm.*\.csv$/i;
      const fileUrl = files.find((f) => target.test(f));
      if (!fileUrl) throw new Error(`Kotak ${market} scrip master not found`);
      const csvRes = await fetch(fileUrl, { cache: "no-store" });
      if (!csvRes.ok) throw new Error(`Kotak scrip master download returned ${csvRes.status}`);
      const csv = await csvRes.text();
      const lines = csv.split(/\r?\n/).filter(Boolean);
      if (!lines.length) throw new Error("Kotak scrip master empty");
      const header = lines[0].split(",").map((h) => h.trim());
      const symbolIdx = header.indexOf("pSymbol");
      const tradSymbolIdx = header.indexOf("pTrdSymbol");
      const map: KotakScripIndex = new Map();
      if (symbolIdx === -1 || tradSymbolIdx === -1) return map;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",");
        const pSymbol = cols[symbolIdx]?.trim();
        const tradSymbol = cols[tradSymbolIdx]?.trim();
        if (!pSymbol || !tradSymbol) continue;
        map.set(lookupKey(tradSymbol.replace(/-EQ$/i, "")), pSymbol);
      }
      return map;
    })();
    // Don't let a failed attempt block retries for the full TTL -- only a
    // successful resolution should be cached that long.
    attempt.catch(() => {
      kotakScripSavedAt.delete(cacheKey);
      kotakScripCache.delete(cacheKey);
    });
    kotakScripCache.set(cacheKey, attempt);
  }
  return kotakScripCache.get(cacheKey)!;
}

const KOTAK_INDEX_NAMES: Record<string, { name: string; seg: string }> = {
  BSESN: { name: "SENSEX", seg: "bse_cm" },
  SENSEX: { name: "SENSEX", seg: "bse_cm" },
  NSEI: { name: "Nifty 50", seg: "nse_cm" },
  NIFTY: { name: "Nifty 50", seg: "nse_cm" },
  NIFTY50: { name: "Nifty 50", seg: "nse_cm" },
  NSEBANK: { name: "Nifty Bank", seg: "nse_cm" },
  BANKNIFTY: { name: "Nifty Bank", seg: "nse_cm" },
  NIFTYBANK: { name: "Nifty Bank", seg: "nse_cm" },
};

async function kotakQuote(symbol: string, exchange: string, userId?: string) {
  const cred = await getKotakCredential(userId);
  if (!cred) throw new Error("not configured");
  let query: string;
  if (isIndexExchange(exchange)) {
    const found = KOTAK_INDEX_NAMES[lookupKey(symbol)];
    if (!found) throw new Error("Kotak index not found");
    query = `${found.seg}|${encodeURIComponent(found.name)}`;
  } else if (isIndianExchange(exchange)) {
    const market = normalizedExchange(exchange) === "BSE" ? "BSE" : "NSE";
    const map = await kotakScripMap(cred.baseUrl, cred.token, market);
    const pSymbol = map.get(lookupKey(symbol));
    if (!pSymbol) throw new Error("Kotak instrument not found");
    query = `${market === "NSE" ? "nse_cm" : "bse_cm"}|${pSymbol}`;
  } else {
    throw new Error("unsupported market");
  }
  const res = await fetch(
    `${cred.baseUrl}/script-details/1.0/quotes/neosymbol/${query}/all`,
    { headers: { Authorization: cred.token, Accept: "application/json" }, cache: "no-store" },
  );
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.emsg || data?.message || "Kotak quote failed");
  const row = Array.isArray(data) ? data[0] : data?.data?.[0];
  if (!row) throw new Error("Kotak quote unavailable");
  const price = number(row.ltp);
  const change = number(row.change);
  const changePct = number(row.per_change);
  const previousClose = number(row?.ohlc?.close);
  return quoteResult(
    row.display_symbol || symbol,
    price,
    previousClose,
    change,
    changePct,
    "INR",
    "Kotak Neo live quote",
    "exchange snapshot",
    row.lstup_time ? new Date(Number(row.lstup_time) * 1000).toISOString() : undefined,
    {
      dayHigh: number(row?.ohlc?.high),
      dayLow: number(row?.ohlc?.low),
      fiftyTwoWeekHigh: number(row.year_high),
      fiftyTwoWeekLow: number(row.year_low),
    },
  );
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
  // range=1d alone is unreliable for meta.previousClose on some symbols
  // (particularly indices) -- it can reflect a stale prior session instead
  // of the actual last trading day's close. Fetch a few days of daily
  // closes instead and derive previousClose from the real data.
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(resolved)}?interval=1d&range=5d`,
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
  const result = data?.chart?.result?.[0];
  const meta = result?.meta || {};
  const timestamps: number[] = result?.timestamp || [];
  const closes: any[] = result?.indicators?.quote?.[0]?.close || [];
  const bars = timestamps
    .map((ts, i) => ({ ts, close: number(closes[i]) }))
    // Yahoo sometimes returns 0 (not null) for a gap/bad data point -- treat
    // it the same as missing data, not a real close, or a stray zero row
    // makes "change" jump to the full price with 0% (0 as previousClose).
    .filter((bar): bar is { ts: number; close: number } => bar.close !== null && bar.close > 0);
  const exchangeTz = meta.exchangeTimezoneName || "Asia/Kolkata";
  const dateKey = (epochSeconds: number) =>
    new Date(epochSeconds * 1000).toLocaleDateString("en-CA", { timeZone: exchangeTz });
  const todayKey = dateKey(Date.now() / 1000);
  // The daily-bar array may or may not include a partially-formed bar for
  // today depending on market hours; only drop it if it's actually dated
  // today, so a genuinely completed last session isn't discarded.
  const completedBars =
    bars.length && dateKey(bars[bars.length - 1].ts) === todayKey ? bars.slice(0, -1) : bars;
  const price = number(meta.regularMarketPrice) ?? bars.at(-1)?.close ?? number(meta.previousClose);
  const previousClose =
    completedBars.at(-1)?.close ?? number(meta.previousClose ?? meta.chartPreviousClose);
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

async function fetchProvider(provider: Provider, symbol: string, exchange: string, userId?: string) {
  if (provider === "kotak") return kotakQuote(symbol, exchange, userId);
  if (provider === "twelvedata") return twelveDataQuote(symbol, exchange);
  if (provider === "alphavantage") return alphaVantageQuote(symbol, exchange);
  if (provider === "polygon") return polygonQuote(symbol, exchange);
  return yahooQuote(symbol, exchange);
}

export async function GET(request: Request) {
  pruneQuoteCache();
  const auth = await authenticateRequest(request);
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "";
  const exchange = searchParams.get("exchange") || "NSE";
  const preferredProvider = searchParams.get("provider") || "";
  if (!symbol.trim()) {
    return NextResponse.json({ error: "Ticker missing" }, { status: 400 });
  }

  const cacheKey = quoteCacheKey(symbol, exchange);
  const cached = quoteCache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < QUOTE_CACHE_TTL_MS) {
    return NextResponse.json(
      {
        ...cached.quote,
        attempted: cached.attempted,
        cached: true,
        time: new Date().toISOString(),
      },
      { headers: { "Cache-Control": RESPONSE_CACHE_CONTROL } },
    );
  }

  const attempted: string[] = [];
  for (const provider of providerOrder(preferredProvider)) {
    try {
      const quote = await fetchProvider(provider, symbol, exchange, auth?.user.id);
      cacheQuote(cacheKey, { quote, attempted: [...attempted], savedAt: Date.now() });
      return NextResponse.json(
        { ...quote, attempted, time: new Date().toISOString() },
        { headers: { "Cache-Control": RESPONSE_CACHE_CONTROL } },
      );
    } catch (error: any) {
      attempted.push(`${provider}: ${error?.message || "failed"}`);
    }
  }

  if (cached && Date.now() - cached.savedAt < QUOTE_STALE_TTL_MS) {
    return NextResponse.json(
      {
        ...cached.quote,
        attempted,
        cached: true,
        stale: true,
        warning: "Showing last quote because providers are rate-limited or unavailable",
        time: new Date().toISOString(),
      },
      { headers: { "Cache-Control": RESPONSE_CACHE_CONTROL } },
    );
  }

  return NextResponse.json(
    { error: "Quote failed", symbol: yahooSymbol(symbol, exchange), attempted },
    { status: 502 },
  );
}
