import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Holding = {
  id: string;
  kind: "stock";
  ticker?: string;
  exchange?: string;
  quantity: number;
};

function yahooSymbol(holding: Holding) {
  const ticker = String(holding.ticker || "").trim().toUpperCase();
  if (!ticker) return "";
  if (ticker.includes(".")) return ticker;
  if (holding.exchange === "BSE") return `${ticker}.BO`;
  if (holding.exchange === "NSE") return `${ticker}.NS`;
  return ticker;
}

async function yahooChart(symbol: string, from: string, to: string) {
  const period1 = Math.floor(new Date(`${from}T00:00:00Z`).getTime() / 1000);
  const period2 =
    Math.floor(new Date(`${to}T00:00:00Z`).getTime() / 1000) + 86400;
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${period1}&period2=${period2}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 AssetManager/1.0",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    },
  );
  if (!response.ok) throw new Error(`History unavailable for ${symbol}`);
  const result = (await response.json())?.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const closes = result?.indicators?.adjclose?.[0]?.adjclose ||
    result?.indicators?.quote?.[0]?.close ||
    [];
  return timestamps
    .map((timestamp: number, index: number) => ({
      date: new Date(timestamp * 1000).toISOString().slice(0, 10),
      close: Number(closes[index]),
    }))
    .filter((point: { close: number }) => Number.isFinite(point.close));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const from = String(body?.from || "");
    const to = String(body?.to || "");
    const holdings = (Array.isArray(body?.holdings) ? body.holdings : []).slice(
      0,
      75,
    ) as Holding[];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to))
      return NextResponse.json({ error: "Valid from/to dates are required" }, { status: 400 });

    const series = await Promise.all(
      holdings.map(async (holding) => {
        const symbol = yahooSymbol(holding);
        if (!symbol) return { id: holding.id, points: [], error: "Symbol missing" };
        try {
          const prices = await yahooChart(symbol, from, to);
          return {
            id: holding.id,
            points: prices.map((point) => ({
              date: point.date,
              value: point.close * Number(holding.quantity || 0),
            })),
          };
        } catch (error: any) {
          return { id: holding.id, points: [], error: error?.message || "Unavailable" };
        }
      }),
    );
    return NextResponse.json(
      { from, to, series, provider: "Yahoo Finance historical closes" },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Historical pricing failed" },
      { status: 500 },
    );
  }
}
