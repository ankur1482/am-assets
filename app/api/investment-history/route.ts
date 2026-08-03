import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Holding = {
  id: string;
  kind: "stock";
  ticker?: string;
  exchange?: string;
  quantity: number;
};

const MAX_HOLDINGS=75;
const MAX_RANGE_DAYS=3660;
const HISTORY_CONCURRENCY=8;
const RATE_WINDOW_MS=60_000;
const RATE_LIMIT=20;
const requestWindows=new Map<string,{startedAt:number;count:number}>();

function parseDate(value:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const [year,month,day]=value.split('-').map(Number);
  const date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day?date:null;
}

function rateLimited(userId:string){
  const now=Date.now();
  if(requestWindows.size>1000){for(const [key,value] of requestWindows)if(now-value.startedAt>=RATE_WINDOW_MS)requestWindows.delete(key)}
  const current=requestWindows.get(userId);
  if(!current||now-current.startedAt>=RATE_WINDOW_MS){requestWindows.set(userId,{startedAt:now,count:1});return false}
  current.count+=1;
  return current.count>RATE_LIMIT;
}

async function mapWithConcurrency<T,R>(items:T[],limit:number,mapper:(item:T)=>Promise<R>){
  const result=new Array<R>(items.length);
  let next=0;
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
    while(true){const index=next++;if(index>=items.length)return;result[index]=await mapper(items[index])}
  }));
  return result;
}

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
    const auth=await authenticateRequest(request);
    if(!auth)return NextResponse.json({error:'Invalid session'},{status:401});
    if(rateLimited(auth.user.id))return NextResponse.json({error:'Too many historical analytics requests. Try again shortly.'},{status:429,headers:{'Retry-After':'60'}});
    const body = await request.json();
    const from = String(body?.from || "");
    const to = String(body?.to || "");
    const holdings = (Array.isArray(body?.holdings) ? body.holdings : []).slice(
      0,
      MAX_HOLDINGS,
    ) as Holding[];
    const fromDate=parseDate(from),toDate=parseDate(to);
    if (!fromDate || !toDate)
      return NextResponse.json({ error: "Valid from/to dates are required" }, { status: 400 });
    if(fromDate>toDate)return NextResponse.json({error:'The from date must be on or before the to date'},{status:400});
    const rangeDays=Math.floor((toDate.getTime()-fromDate.getTime())/86400000)+1;
    if(rangeDays>MAX_RANGE_DAYS)return NextResponse.json({error:'Historical analytics is limited to 10 years'},{status:400});

    const series = await mapWithConcurrency(holdings,HISTORY_CONCURRENCY,async (holding) => {
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
      });
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
