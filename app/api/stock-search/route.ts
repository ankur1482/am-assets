import {NextResponse} from 'next/server';

function cleanTicker(symbol:string,exchange:string){
  const s=String(symbol||'').toUpperCase();
  if(exchange==='BSE')return s.replace(/\.BO$/,'');
  return s.replace(/\.NS$/,'');
}

export async function GET(request:Request){
  const {searchParams}=new URL(request.url);
  const q=(searchParams.get('q')||'').trim();
  if(q.length<2)return NextResponse.json({stocks:[]});
  try{
    const url=`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=25&newsCount=0&listsCount=0&enableFuzzyQuery=true`;
    const res=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 AssetManager/1.0',Accept:'application/json'},next:{revalidate:3600}});
    if(!res.ok)return NextResponse.json({stocks:[]},{status:502});
    const data=await res.json();
    const seen=new Set<string>();
    const stocks=(data?.quotes||[])
      .filter((x:any)=>['EQUITY','ETF'].includes(x?.quoteType)&&(x.exchange==='NSI'||x.exchange==='BSE'||String(x.symbol||'').endsWith('.NS')||String(x.symbol||'').endsWith('.BO')))
      .map((x:any)=>{
        const exchange=x.exchange==='BSE'||String(x.symbol||'').endsWith('.BO')?'BSE':'NSE';
        const ticker=cleanTicker(x.symbol,exchange);
        const asset_type=x.quoteType==='ETF'?'ETF':'Stock';
        return {name:x.longname||x.shortname||ticker,ticker,exchange,asset_type,category:asset_type==='ETF'?'ETF':x.sectorDisp||x.sector||x.industryDisp||x.industry||'Equity'};
      })
      .filter((x:any)=>{
        const id=`${x.exchange}-${x.ticker}`;
        if(!x.ticker||seen.has(id))return false;
        seen.add(id);
        return true;
      })
      .slice(0,15);
    return NextResponse.json({stocks});
  }catch(e:any){
    return NextResponse.json({error:e?.message||'Search failed',stocks:[]},{status:500});
  }
}
