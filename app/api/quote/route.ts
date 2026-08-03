import { NextResponse } from "next/server";
import { gunzipSync } from "zlib";
import { getUpstoxAccessToken } from "@/lib/upstox";
import { authenticateRequest } from "@/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESPONSE_CACHE_CONTROL =
  "public, s-maxage=15, stale-while-revalidate=30";

type Provider = "upstox" | "twelvedata" | "alphavantage" | "polygon" | "yahoo";
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
  "upstox",
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
let upstoxCooldownUntil = 0;

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

const UPSTOX_INSTRUMENT_URLS: Record<string,string> = {
  NSE: "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz",
  BSE: "https://assets.upstox.com/market-quote/instruments/exchange/BSE.json.gz",
};

type UpstoxInstrument = {
  segment?: string;
  exchange?: string;
  isin?: string;
  instrument_type?: string;
  instrument_key?: string;
  exchange_token?: string;
  trading_symbol?: string;
  name?: string;
  short_name?: string;
};

type UpstoxInstrumentIndex = {
  bySymbol: Map<string, UpstoxInstrument>;
  byToken: Map<string, UpstoxInstrument>;
  byName: Map<string, UpstoxInstrument>;
};

const upstoxInstrumentCache = new Map<string, Promise<UpstoxInstrumentIndex>>();

function lookupKey(value: string) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

async function upstoxInstruments(exchange: string) {
  const market = normalizedExchange(exchange);
  const url = UPSTOX_INSTRUMENT_URLS[market];
  if (!url) throw new Error("unsupported market");
  if (!upstoxInstrumentCache.has(market)) {
    upstoxInstrumentCache.set(
      market,
      fetch(url, { cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) throw new Error("Upstox instruments unavailable");
          const zipped = Buffer.from(await res.arrayBuffer());
          const instruments = JSON.parse(gunzipSync(zipped).toString("utf8")) as UpstoxInstrument[];
          const bySymbol = new Map<string, UpstoxInstrument>();
          const byToken = new Map<string, UpstoxInstrument>();
          const byName = new Map<string, UpstoxInstrument>();
          for (const item of instruments) {
            const isEquity =
              market === "NSE"
                ? item?.instrument_type === "EQ"
                : item?.instrument_type !== "F";
            if (
              item?.segment !== `${market}_EQ` ||
              !isEquity ||
              !item?.instrument_key
            ) continue;
            const symbol = lookupKey(item.trading_symbol || "");
            const token = lookupKey(item.exchange_token || "");
            const name = lookupKey(item.name || item.short_name || "");
            if (symbol) bySymbol.set(symbol, item);
            if (token) byToken.set(token, item);
            if (name) byName.set(name, item);
          }
          return { bySymbol, byToken, byName };
        }),
    );
  }
  return upstoxInstrumentCache.get(market)!;
}

async function upstoxInstrumentKey(symbol: string, exchange: string) {
  const index = await upstoxInstruments(exchange);
  const symbolKey = lookupKey(symbol);
  const found =
    index.bySymbol.get(symbolKey) ||
    index.byToken.get(symbolKey) ||
    index.byName.get(symbolKey);
  if (!found?.instrument_key) throw new Error("Upstox instrument not found");
  return found.instrument_key;
}

function upstoxIndexKey(symbol: string) {
  const normalized = lookupKey(symbol);
  const indexKeys: Record<string, string> = {
    BSESN: "BSE_INDEX|SENSEX",
    SENSEX: "BSE_INDEX|SENSEX",
    NSEI: "NSE_INDEX|Nifty 50",
    NIFTY: "NSE_INDEX|Nifty 50",
    NIFTY50: "NSE_INDEX|Nifty 50",
    NSEBANK: "NSE_INDEX|Nifty Bank",
    BANKNIFTY: "NSE_INDEX|Nifty Bank",
    NIFTYBANK: "NSE_INDEX|Nifty Bank",
    NIFTYMIDCAP100NS: "NSE_INDEX|NIFTY MIDCAP 100",
    NIFTYMIDCAP100: "NSE_INDEX|NIFTY MIDCAP 100",
    CNXMIDCAP: "NSE_INDEX|NIFTY MIDCAP 100",
  };
  if (symbol.includes("|")) return symbol;
  const found = indexKeys[normalized];
  if (!found) throw new Error("Upstox index not found");
  return found;
}

async function upstoxQuote(symbol: string, exchange: string,userId?:string) {
  if (!isIndianExchange(exchange) && !isIndexExchange(exchange))
    throw new Error("unsupported market");
  if (Date.now() < upstoxCooldownUntil)
    throw new Error("rate limited cooldown");
  const token = await getUpstoxAccessToken(userId);
  if (!token) throw new Error("not configured");
  const instrumentKey = isIndexExchange(exchange)
    ? upstoxIndexKey(symbol)
    : await upstoxInstrumentKey(symbol, exchange);
  const params = new URLSearchParams({ instrument_key: instrumentKey });
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  let res = await fetch(`https://api.upstox.com/v2/market-quote/quotes?${params}`, {
    headers,
    cache: "no-store",
  });
  if (res.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    res = await fetch(`https://api.upstox.com/v2/market-quote/quotes?${params}`, {
      headers,
      cache: "no-store",
    });
    if (res.status === 429) upstoxCooldownUntil = Date.now() + 60 * 1000;
  }
  const data = await res.json();
  if (!res.ok || data?.status === "error") {
    throw new Error(data?.errors?.[0]?.message || data?.message || "Upstox quote failed");
  }
  const row = Object.values(data?.data || {})[0] as any;
  if (!row) throw new Error("Upstox quote unavailable");
  const price = number(row.last_price);
  const change = number(row.net_change);
  const previousClose =
    price !== null && change !== null ? price - change : number(row?.ohlc?.close);
  return quoteResult(
    row.symbol || symbol,
    price,
    previousClose,
    change,
    null,
    "INR",
    "Upstox live market quote",
    "exchange snapshot",
    row.timestamp || (row.last_trade_time ? new Date(Number(row.last_trade_time)).toISOString() : undefined),
    {
      dayHigh: number(row?.ohlc?.high),
      dayLow: number(row?.ohlc?.low),
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

async function fetchProvider(provider: Provider, symbol: string, exchange: string,userId?:string) {
  if (provider === "upstox") return upstoxQuote(symbol, exchange,userId);
  if (provider === "twelvedata") return twelveDataQuote(symbol, exchange);
  if (provider === "alphavantage") return alphaVantageQuote(symbol, exchange);
  if (provider === "polygon") return polygonQuote(symbol, exchange);
  return yahooQuote(symbol, exchange);
}

export async function GET(request: Request) {
  pruneQuoteCache();
  const auth=await authenticateRequest(request);
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
      const quote = await fetchProvider(provider, symbol, exchange,auth?.user.id);
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
