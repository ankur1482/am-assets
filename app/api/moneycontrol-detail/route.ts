import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUGGEST_URL =
  "https://www.moneycontrol.com/mccode/common/autosuggestion_solr.php";
const MONEYCONTROL_HOME = "https://www.moneycontrol.com/stocksmarketsindia/";
const MONEYCONTROL_SEARCH =
  "https://www.moneycontrol.com/stocks/cptmarket/compsearchnew.php";

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
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows.length) return "";
  const match = rows.find((row) => exactMatch(row, symbol, name)) || rows[0];
  const link = String(match?.link_src || "");

  try {
    const url = new URL(link);
    return url.hostname.endsWith("moneycontrol.com") &&
      url.pathname.includes("/india/stockpricequote/")
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "";
  const name = searchParams.get("name") || "";

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
