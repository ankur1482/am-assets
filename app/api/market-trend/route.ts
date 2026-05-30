import {NextResponse} from 'next/server';

export const dynamic='force-dynamic';
export const revalidate=0;

const TROY_OZ_GRAMS=31.1034768;
const symbols:Record<string,string>={gold:'GC=F',silver:'SI=F',crude:'CL=F'};

async function yahooChart(symbol:string,range='3mo'){
  const res=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${encodeURIComponent(range)}`,{headers:{'User-Agent':'Mozilla/5.0 AssetManager/1.0',Accept:'application/json'},cache:'no-store'});
  if(!res.ok)throw new Error('Trend data request failed');
  const data=await res.json(),result=data?.chart?.result?.[0],timestamps=result?.timestamp||[],quotes=result?.indicators?.quote?.[0]?.close||[];
  return timestamps.map((t:number,i:number)=>({date:new Date(t*1000).toISOString().slice(0,10),close:Number(quotes[i])})).filter((p:any)=>Number.isFinite(p.close));
}

async function yahooPrice(symbol:string){
  const res=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,{headers:{'User-Agent':'Mozilla/5.0 AssetManager/1.0',Accept:'application/json'},cache:'no-store'});
  if(!res.ok)throw new Error('FX request failed');
  const meta=(await res.json())?.chart?.result?.[0]?.meta||{},price=Number(meta.regularMarketPrice??meta.previousClose);
  if(!Number.isFinite(price))throw new Error('FX unavailable');
  return price;
}

async function newsTone(asset:string){
  try{
    const q=encodeURIComponent(`${asset} price forecast India market news`);
    const res=await fetch(`https://news.google.com/rss/search?q=${q}&hl=en-IN&gl=IN&ceid=IN:en`,{headers:{'User-Agent':'Mozilla/5.0 AssetManager/1.0'},cache:'no-store'});
    if(!res.ok)return{score:0,label:'Neutral',headlines:[]};
    const xml=await res.text();
    const titles=Array.from(xml.matchAll(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/gi)).slice(1,7).map(m=>(m[1]||m[2]||'').replace(/&amp;/g,'&'));
    const text=titles.join(' ').toLowerCase(),up=(text.match(/rise|rally|surge|high|bull|gain|strong|demand|deficit/g)||[]).length,down=(text.match(/fall|drop|weak|bear|loss|slump|pressure|surplus/g)||[]).length,score=Math.max(-2,Math.min(2,up-down));
    return{score,label:score>0?'Positive':score<0?'Negative':'Neutral',headlines:titles};
  }catch{return{score:0,label:'Neutral',headlines:[]}}
}

function forecast(points:{date:string;value:number}[],toneScore:number){
  const last=points.at(-1)?.value||0,first=points[0]?.value||last,monthBase=first?((last-first)/first):0,adj=toneScore*0.005;
  const weekly=monthBase/4+adj,monthly=monthBase+adj*2,quarterly=monthBase*2.2+adj*4;
  const price=(pct:number)=>Math.max(0,last*(1+pct));
  const confidence=Math.min(72,Math.max(35,45+Math.abs(monthBase)*120+Math.abs(toneScore)*4));
  return{nextWeek:price(weekly),nextMonth:price(monthly),next3Months:price(quarterly),confidence:Math.round(confidence),direction:monthly>0?'Uptrend':monthly<0?'Downtrend':'Sideways'};
}

export async function GET(request:Request){
  const {searchParams}=new URL(request.url),asset=String(searchParams.get('asset')||'silver').toLowerCase(),range=String(searchParams.get('range')||'3mo');
  const symbol=symbols[asset];
  if(!symbol)return NextResponse.json({error:'Unsupported asset'},{status:400});
  try{
    const raw=await yahooChart(symbol,range),usdInr=asset==='crude'?1:await yahooPrice('USDINR=X');
    const points=raw.map(p=>({date:p.date,value:asset==='crude'?p.close:p.close*usdInr/TROY_OZ_GRAMS*(asset==='gold'?10:1000)})).slice(range==='5d'?-5:range==='1mo'?-22:undefined);
    const tone=await newsTone(asset),outlook=forecast(points,tone.score);
    return NextResponse.json({asset,symbol,currency:asset==='crude'?'USD':'INR',unit:asset==='gold'?'10g':asset==='crude'?'barrel':'kg',market:'Yahoo Finance',points,tone,outlook,time:new Date().toISOString()},{headers:{'Cache-Control':'no-store, max-age=0'}});
  }catch(e:any){
    return NextResponse.json({error:e?.message||'Trend failed'},{status:500});
  }
}
