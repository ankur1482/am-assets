import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUGGEST_URL =
  "https://www.moneycontrol.com/mccode/common/autosuggestion_solr.php";
const MONEYCONTROL_HOME = "https://www.moneycontrol.com/stocksmarketsindia/";
const MONEYCONTROL_SEARCH =
  "https://www.moneycontrol.com/stocks/cptmarket/compsearchnew.php";
const ETF_QUOTE_URLS: Record<string, string> = {
  SILVERBEES:
    "https://www.moneycontrol.com/india/stockpricequote/nippsilveretf/nipponindiasilveretf/NIS01",
  TATSILV:
    "https://www.moneycontrol.com/india/stockpricequote/tatasilveretf/tatasilveretf/TATSI21428",
  GOLDBEES:
    "https://www.moneycontrol.com/india/stockpricequote/nippgoldbees/nipponindiaetfgoldbees/GBE",
  TATAGOLD:
    "https://www.moneycontrol.com/india/stockpricequote/tatagoldetf/tatagoldetf/TATAG21401",
  NIFTYBEES:
    "https://www.moneycontrol.com/india/stockpricequote/nippnifty50/nipponindiaetfnifty50bees/NBE01",
  METALIETF:
    "https://www.moneycontrol.com/india/stockpricequote/ipruniftymeta/iciciprudentialniftymetaletf/METAL24861",
  OILIETF:
    "https://www.moneycontrol.com/india/stockpricequote/ipruniftyoil/iciciprudentialniftyoilgasetf/OILIE24533",
  ITBEES:
    "https://www.moneycontrol.com/india/stockpricequote/etf/nipponindiaetfniftyit/NIE01",
  PHARMABEES:
    "https://www.moneycontrol.com/india/stockpricequote/nippniftyphar/nipponindianiftypharmaetf/NIN",
  PSUBNKBEES:
    "https://www.moneycontrol.com/india/stockpricequote/etf/nipponindiaetfniftypsubankbees/BMF",
};

function text(value: any) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function exactMatch(row: any, symbol: string, name: string) {
  const details = text(row?.pdt_dis_nm).toUpperCase();
  const rowName = text(row?.name || row?.stock_name).toUpperCase();
  const ticker = symbol.trim().toUpperCase();
  const security = name.trim().toUpperCase();
  const escapedTicker = ticker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  if (
    ticker &&
    new RegExp(`(?:^|[ ,])${escapedTicker}(?:$|[ ,])`).test(details)
  ) {
    return true;
  }
  return !!security && rowName === security;
}

function searchDestination(symbol: string, name: string) {
  const query = name.trim() || symbol.trim();
  if (!query) return MONEYCONTROL_HOME;
  const params = new URLSearchParams({
    search_str: query,
    topsearch_type: "1",
  });
  return `${MONEYCONTROL_SEARCH}?${params}`;
}

function suggestionRows(payload: string) {
  try {
    const parsed = JSON.parse(payload);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    try {
      const parsed = JSON.parse(`[${payload.replace(/\]\s*\[/g, "],[")}]`);
      return Array.isArray(parsed) ? parsed.flat() : [];
    } catch {
      return [];
    }
  }
}

function moneycontrolQuoteUrl(value: any) {
  try {
    const url = new URL(String(value || ""));
    return url.hostname.endsWith("moneycontrol.com") &&
      url.pathname.includes("/india/stockpricequote/")
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

async function findStockUrl(query: string, symbol: string, name: string) {
  if (!query.trim()) return "";
  const params = new URLSearchParams({
    classic: "true",
    query: query.trim(),
    type: "1",
    format: "json",
  });
  const res = await fetch(`${SUGGEST_URL}?${params}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 AssetManager/1.0",
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return "";
  const rows = suggestionRows(await res.text());
  if (!Array.isArray(rows) || !rows.length) return "";
  const candidates = rows.filter((row) => moneycontrolQuoteUrl(row?.link_src));
  const match =
    candidates.find((row) => exactMatch(row, symbol, name)) || candidates[0];
  return moneycontrolQuoteUrl(match?.link_src);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "";
  const name = searchParams.get("name") || "";
  const directEtfUrl = ETF_QUOTE_URLS[symbol.trim().toUpperCase()];
  if (directEtfUrl) return NextResponse.redirect(directEtfUrl);

  try {
    const queries = [
      ...new Set([symbol, name].map((value) => value.trim()).filter(Boolean)),
    ];
    for (const query of queries) {
      const destination = await findStockUrl(query, symbol, name);
      if (destination) return NextResponse.redirect(destination);
    }
  } catch {
    // Fall through to Moneycontrol search when its quote lookup is unavailable.
  }

  return NextResponse.redirect(searchDestination(symbol, name));
}
