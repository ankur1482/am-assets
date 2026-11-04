import {NextRequest,NextResponse} from 'next/server';
import {matchIndianStock,parseCalendar} from '@/lib/dividendCalendar';
import {authenticateRequest} from '@/lib/serverAuth';

export const dynamic='force-dynamic';

const headers={'User-Agent':'Mozilla/5.0 AssetManager/1.0',Accept:'application/json'};
const SIX_HOURS=21600;

// Announced dividends for one Indian stock, including ex-dates still to come, and its latest price.
export async function GET(req:NextRequest){
  const auth=await authenticateRequest(req);
  if(!auth)return NextResponse.json({error:'Invalid session'},{status:401});
  const symbol=(req.nextUrl.searchParams.get('symbol')||'').trim().toUpperCase();
  if(!/^[A-Z0-9&_-]{1,20}$/.test(symbol))return NextResponse.json({error:'Invalid symbol'},{status:400});
  try{
    const suggest=await fetch(`https://www.moneycontrol.com/mccode/common/autosuggestion_solr.php?classic=true&query=${encodeURIComponent(symbol)}&type=1&format=json`,{headers,next:{revalidate:SIX_HOURS},signal:AbortSignal.timeout(8000)});
    const match=matchIndianStock(suggest.ok?await suggest.json():[],symbol);
    // Search results include similar names, so anything but an exact ticker match is treated as unknown.
    if(!match)return NextResponse.json({symbol,found:false,dividends:[]});
    const [calendar,quote]=await Promise.all([
      fetch(`https://api.moneycontrol.com/mcapi/v1/stock/corporate-action?scId=${encodeURIComponent(match.scId)}&section=d&deviceType=W`,{headers,next:{revalidate:SIX_HOURS},signal:AbortSignal.timeout(8000)}),
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}.NS?interval=1d&range=1d`,{headers,next:{revalidate:SIX_HOURS},signal:AbortSignal.timeout(8000)}).catch(()=>null),
    ]);
    const list=calendar.ok?(await calendar.json())?.data?.dividends:[];
    const price=quote?.ok?Number((await quote.json())?.chart?.result?.[0]?.meta?.regularMarketPrice)||0:0;
    return NextResponse.json({symbol,found:true,name:match.name,price,dividends:parseCalendar(list)});
  }catch(e:any){
    return NextResponse.json({symbol,error:e?.message||'Dividend calendar unavailable',dividends:[]},{status:502});
  }
}
