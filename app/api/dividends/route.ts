import {NextRequest,NextResponse} from 'next/server';
import {authenticateRequest} from '@/lib/serverAuth';

export const dynamic='force-dynamic';

const yahooSymbol=(symbol:string,exchange:string)=>{
  const ticker=symbol.trim().toUpperCase(),market=exchange.trim().toUpperCase();
  if(ticker.includes('.'))return ticker;
  return market==='BSE'?`${ticker}.BO`:market==='NSE'?`${ticker}.NS`:ticker;
};

// Dividends a stock went ex- in the last two years. The source lists them from the ex-date, not ahead of it.
export async function GET(req:NextRequest){
  const auth=await authenticateRequest(req);
  if(!auth)return NextResponse.json({error:'Invalid session'},{status:401});
  const symbol=req.nextUrl.searchParams.get('symbol')||'',exchange=req.nextUrl.searchParams.get('exchange')||'NSE';
  if(!/^[A-Za-z0-9.&_-]{1,30}$/.test(symbol))return NextResponse.json({error:'Invalid symbol'},{status:400});
  try{
    const res=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol(symbol,exchange))}?interval=1d&range=2y&events=div`,{headers:{'User-Agent':'Mozilla/5.0 AssetManager/1.0',Accept:'application/json'},next:{revalidate:21600},signal:AbortSignal.timeout(12000)});
    if(!res.ok)throw new Error('Dividend data request failed');
    const result=(await res.json())?.chart?.result?.[0],currency=String(result?.meta?.currency||'INR');
    const dividends=Object.values(result?.events?.dividends||{}).map((item:any)=>({date:new Date(Number(item.date)*1000).toISOString().slice(0,10),amount:Number(item.amount),currency})).filter(item=>Number.isFinite(item.amount)&&item.amount>0).sort((a,b)=>a.date.localeCompare(b.date));
    return NextResponse.json({symbol,dividends});
  }catch(e:any){
    return NextResponse.json({error:e?.message||'Dividend data unavailable',dividends:[]},{status:502});
  }
}
