import {NextResponse} from 'next/server';

export const dynamic='force-dynamic';
export const revalidate=0;

const TROY_OZ_GRAMS=31.1034768;
const symbols:Record<string,string>={gold:'GC=F',silver:'SI=F',platinum:'PL=F',crude:'CL=F'};
const HYDERABAD_GOLD_URL='https://www.goodreturns.in/gold-rates/hyderabad.html';
const HYDERABAD_SILVER_URL='https://www.goodreturns.in/silver-rates/hyderabad.html';
const AHMEDABAD_BULLION_URL='https://bullions.co.in/location/ahmedabad/';
const METALS_DEV_URL='https://api.metals.dev/v1/latest';
const MONEYCONTROL_COMMODITY_URL='https://www.moneycontrol.com/commodity/';
const MONEYCONTROL_MCX_URL='https://priceapi.moneycontrol.com/technicalCompanyData/commodity/getMajorCommodities?tabName=MCX&deviceType=W';

async function yahooPrice(symbol:string){
  const res=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,{headers:{'User-Agent':'Mozilla/5.0 AssetManager/1.0',Accept:'application/json'},cache:'no-store'});
  if(!res.ok)throw new Error('Market data request failed');
  const data=await res.json();
  const meta=data?.chart?.result?.[0]?.meta||{};
  const price=Number(meta.regularMarketPrice??meta.previousClose);
  if(!Number.isFinite(price))throw new Error('Price unavailable');
  return price;
}

function money(text:string){
  const match=text.replace(/&#x20b9;|&nbsp;|₹/g,' ').match(/[-+]?\s*[0-9][0-9,\s]*(?:\.\d+)?/);
  if(!match)return NaN;
  return Number(match[0].replace(/[\s,]/g,''));
}

async function ahmedabadBullionSpot(asset:'gold'|'silver'){
  const res=await fetch(AHMEDABAD_BULLION_URL,{headers:{'User-Agent':'Mozilla/5.0 AssetManager/1.0',Accept:'text/html,*/*'},cache:'no-store'});
  if(!res.ok)throw new Error(`Ahmedabad bullion ${asset} request failed`);
  const html=await res.text();
  const updated=html.match(/Last Update<\/i>\s*:\s*<strong>([\s\S]*?)<\/strong>/i)?.[1]?.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()||null;
  if(asset==='gold'){
    const row=html.match(/Gold 24 Karat[\s\S]*?<td[^>]*>([^<]+)<\/td><td[^>]*>([^<]+)<\/td>/i);
    const ratePerGramInr=money(row?.[1]||''),ratePer10GramInr=money(row?.[2]||'');
    if(!Number.isFinite(ratePer10GramInr))throw new Error('Ahmedabad gold spot unavailable');
    return{symbol:'GOLD-24K-AHD',ratePer10GramInr,ratePerGramInr:Number.isFinite(ratePerGramInr)?ratePerGramInr:ratePer10GramInr/10,previousPer10GramInr:null,previousPerGramInr:null,changePer10GramInr:0,changePerGramInr:0,provider:'Bullions Ahmedabad 24K gold spot rate',sourceUrl:AHMEDABAD_BULLION_URL,lastUpdate:updated};
  }
  const row=html.match(/Silver 999 Fine[\s\S]*?<td[^>]*>([^<]+)<\/td><td[^>]*>([^<]+)<\/td><td[^>]*>([^<]+)<\/td><td[^>]*>([^<]+)<\/td>/i);
  const ratePerGramInr=money(row?.[1]||''),ratePerKgInr=money(row?.[4]||'');
  if(!Number.isFinite(ratePerKgInr))throw new Error('Ahmedabad silver spot unavailable');
  return{symbol:'SILVER-999-AHD',ratePerKgInr,ratePerGramInr:Number.isFinite(ratePerGramInr)?ratePerGramInr:ratePerKgInr/1000,previousPerKgInr:null,previousPerGramInr:null,changePerKgInr:0,changePerGramInr:0,provider:'Bullions Ahmedabad 999 silver spot rate',sourceUrl:AHMEDABAD_BULLION_URL,lastUpdate:updated};
}

async function hyderabadGold24k(){
  const res=await fetch(HYDERABAD_GOLD_URL,{headers:{'User-Agent':'Mozilla/5.0 AssetManager/1.0',Accept:'text/html,*/*'},cache:'no-store'});
  if(!res.ok)throw new Error('Hyderabad gold rate request failed');
  const html=await res.text();
  const section=html.match(/Today 24 Carat Gold Rate Per Gram in Hyderabad[\s\S]*?<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1]||'';
  const firstRow=section.match(/<tr[^>]*>([\s\S]*?)<\/tr>/i)?.[1]||'';
  const cells=Array.from(firstRow.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map(m=>m[1].replace(/<[^>]+>/g,' '));
  const ratePerGramInr=money(cells[1]||'');
  const previousPerGramInr=money(cells[2]||'');
  const changePerGramInr=Number.isFinite(ratePerGramInr)&&Number.isFinite(previousPerGramInr)?ratePerGramInr-previousPerGramInr:money(cells[3]||'');
  if(!Number.isFinite(ratePerGramInr))throw new Error('Hyderabad 24K gold rate unavailable');
  return{ratePerGramInr,previousPerGramInr:Number.isFinite(previousPerGramInr)?previousPerGramInr:null,changePerGramInr:Number.isFinite(changePerGramInr)?changePerGramInr:0};
}

async function hyderabadSilver(){
  const res=await fetch(HYDERABAD_SILVER_URL,{headers:{'User-Agent':'Mozilla/5.0 AssetManager/1.0',Accept:'text/html,*/*'},cache:'no-store'});
  if(!res.ok)throw new Error('Hyderabad silver rate request failed');
  const html=await res.text();
  const marker=html.search(/Today Silver Price Per Gram\/Kg in Hyderabad|Silver Price Per Gram\/Kg in Hyderabad/i);
  const chunk=html.slice(Math.max(0,marker),Math.max(0,marker)+8000);
  const rows=Array.from(chunk.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)).map(r=>Array.from(r[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)).map(c=>c[1].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim())).filter(r=>r.length>=2);
  let ratePerGramInr=NaN,previousPerGramInr=NaN,ratePerKgInr=NaN;
  for(const row of rows){
    const label=String(row[0]||'').toLowerCase();
    if(!Number.isFinite(ratePerGramInr)&&(/1\s*gram|^1$/.test(label)||label.includes('gram')))ratePerGramInr=money(row[1]||'');
    if(!Number.isFinite(previousPerGramInr)&&(/1\s*gram|^1$/.test(label)||label.includes('gram')))previousPerGramInr=money(row[2]||'');
    if(!Number.isFinite(ratePerKgInr)&&(/1\s*kg|kilogram|kg/.test(label)))ratePerKgInr=money(row[1]||'');
  }
  if(!Number.isFinite(ratePerGramInr)){
    const values=rows.flatMap(r=>r.map(money)).filter(Number.isFinite);
    ratePerGramInr=values.find(v=>v>50&&v<1000)??NaN;
  }
  if(!Number.isFinite(ratePerKgInr)&&Number.isFinite(ratePerGramInr))ratePerKgInr=ratePerGramInr*1000;
  const previousPerKgInr=Number.isFinite(previousPerGramInr)?previousPerGramInr*1000:null;
  const changePerKgInr=Number.isFinite(previousPerKgInr)?ratePerKgInr-previousPerKgInr:0;
  if(!Number.isFinite(ratePerKgInr))throw new Error('Hyderabad silver rate unavailable');
  return{ratePerKgInr,ratePerGramInr:Number.isFinite(ratePerGramInr)?ratePerGramInr:ratePerKgInr/1000,previousPerKgInr,changePerKgInr};
}

async function addRetailDailyMove(asset:'gold'|'silver',rate:any){
  const current=Number(rate.ratePerGramInr);
  if(!Number.isFinite(current)||Number(rate.changePerGramInr))return rate;
  try{
    const move:any=asset==='gold'?await hyderabadGold24k():await hyderabadSilver();
    const changePerGramInr=asset==='gold'?Number(move.changePerGramInr):Number(move.changePerKgInr)/1000;
    if(!Number.isFinite(changePerGramInr)||!changePerGramInr)return rate;
    const previousPerGramInr=current-changePerGramInr;
    return {
      ...rate,
      previousPerGramInr,
      previousPer10GramInr:asset==='gold'?previousPerGramInr*10:rate.previousPer10GramInr,
      previousPerKgInr:asset==='silver'?previousPerGramInr*1000:rate.previousPerKgInr,
      changePerGramInr,
      changePer10GramInr:asset==='gold'?changePerGramInr*10:rate.changePer10GramInr,
      changePerKgInr:asset==='silver'?changePerGramInr*1000:rate.changePerKgInr,
      movementProvider:`${rate.provider} + Goodreturns Hyderabad daily move`
    };
  }catch{
    return rate;
  }
}

async function metalsDevMcxSpot(asset:'gold'|'silver'){
  const apiKey=process.env.METALS_DEV_API_KEY?.trim();
  if(!apiKey)throw new Error('Missing METALS_DEV_API_KEY');
  const url=`${METALS_DEV_URL}?api_key=${encodeURIComponent(apiKey)}&currency=INR&unit=g`;
  const res=await fetch(url,{headers:{Accept:'application/json','User-Agent':'Mozilla/5.0 AssetManager/1.0'},cache:'no-store'});
  if(!res.ok)throw new Error(`MCX spot ${asset} request failed`);
  const data=await res.json();
  const metals=data?.metals||data?.data?.metals||data?.rates||data?.data||{};
  const key=asset==='gold'?'mcx_gold':'mcx_silver';
  const previousKey=asset==='gold'?'mcx_gold_prev':'mcx_silver_prev';
  const ratePerGramInr=Number(metals[key]??metals[key.toUpperCase()]??metals[`mcx_${asset}_pm`]??metals[`mcx_${asset}_am`]);
  const previousPerGramInr=Number(metals[previousKey]??metals[`${key}_previous`]??metals[`${key}_prev_close`]);
  if(!Number.isFinite(ratePerGramInr))throw new Error(`MCX spot ${asset} unavailable`);
  const changePerGramInr=Number.isFinite(previousPerGramInr)?ratePerGramInr-previousPerGramInr:0;
  const time=data?.timestamps?.metal||data?.timestamp||data?.updated_at||new Date().toISOString();
  if(asset==='gold'){
    return{symbol:'MCX-GOLD-SPOT',ratePerGramInr,ratePer10GramInr:ratePerGramInr*10,previousPerGramInr:Number.isFinite(previousPerGramInr)?previousPerGramInr:null,previousPer10GramInr:Number.isFinite(previousPerGramInr)?previousPerGramInr*10:null,changePerGramInr,changePer10GramInr:changePerGramInr*10,provider:'Metals.dev MCX gold spot',sourceUrl:'https://metals.dev/',timeStamp:time};
  }
  return{symbol:'MCX-SILVER-SPOT',ratePerGramInr,ratePerKgInr:ratePerGramInr*1000,previousPerGramInr:Number.isFinite(previousPerGramInr)?previousPerGramInr:null,previousPerKgInr:Number.isFinite(previousPerGramInr)?previousPerGramInr*1000:null,changePerGramInr,changePerKgInr:changePerGramInr*1000,provider:'Metals.dev MCX silver spot',sourceUrl:'https://metals.dev/',timeStamp:time};
}

async function moneycontrolMcxQuote(asset:'gold'|'silver'){
  const res=await fetch(MONEYCONTROL_MCX_URL,{headers:{Accept:'application/json','User-Agent':'Mozilla/5.0 AssetManager/1.0',Referer:MONEYCONTROL_COMMODITY_URL},cache:'no-store'});
  if(!res.ok)throw new Error(`Moneycontrol MCX ${asset} request failed`);
  const data=await res.json(),symbol=asset==='gold'?'GOLD':'SILVER';
  const row=data?.data?.list?.find((item:any)=>String(item?.symbol||'').toUpperCase()===symbol);
  const price=Number(row?.lastPrice),change=Number(row?.priceChange);
  if(!Number.isFinite(price))throw new Error(`Moneycontrol MCX ${asset} unavailable`);
  if(asset==='gold'){
    const ratePer10GramInr=price,changePer10GramInr=Number.isFinite(change)?change:0;
    return{symbol:'MCX-GOLD',ratePer10GramInr,ratePerGramInr:ratePer10GramInr/10,previousPer10GramInr:ratePer10GramInr-changePer10GramInr,previousPerGramInr:(ratePer10GramInr-changePer10GramInr)/10,changePer10GramInr,changePerGramInr:changePer10GramInr/10,provider:'Moneycontrol MCX gold quote',sourceUrl:MONEYCONTROL_COMMODITY_URL,lastUpdate:data?.data?.lastUpdated||null};
  }
  const ratePerKgInr=price,changePerKgInr=Number.isFinite(change)?change:0;
  return{symbol:'MCX-SILVER',ratePerKgInr,ratePerGramInr:ratePerKgInr/1000,previousPerKgInr:ratePerKgInr-changePerKgInr,previousPerGramInr:(ratePerKgInr-changePerKgInr)/1000,changePerKgInr,changePerGramInr:changePerKgInr/1000,provider:'Moneycontrol MCX silver quote',sourceUrl:MONEYCONTROL_COMMODITY_URL,lastUpdate:data?.data?.lastUpdated||null};
}

async function bullionSpot(asset:'gold'|'silver'){
  try{
    return await moneycontrolMcxQuote(asset);
  }catch{
    try{
      return await metalsDevMcxSpot(asset);
    }catch{
      return addRetailDailyMove(asset,await ahmedabadBullionSpot(asset));
    }
  }
}

export async function GET(request:Request){
  const {searchParams}=new URL(request.url);
  const asset=String(searchParams.get('asset')||'gold').toLowerCase();
  const symbol=symbols[asset];
  if(!symbol)return NextResponse.json({error:'Unsupported asset'},{status:400});
  try{
    if(asset==='gold'){
      const rate=await bullionSpot('gold');
      return NextResponse.json({asset,...rate,currency:'INR',unit:'10g',market:'Bullion spot',time:new Date().toISOString()},{headers:{'Cache-Control':'no-store, max-age=0'}});
    }
    if(asset==='silver'){
      const rate=await bullionSpot('silver');
      return NextResponse.json({asset,...rate,currency:'INR',unit:'kg',market:'Bullion spot',time:new Date().toISOString()},{headers:{'Cache-Control':'no-store, max-age=0'}});
    }
    if(asset==='crude'){
      const usdPerBarrel=await yahooPrice(symbol);
      return NextResponse.json({asset,symbol,usdPerBarrel,currency:'USD',unit:'barrel',provider:'Yahoo Finance WTI crude futures',time:new Date().toISOString()},{headers:{'Cache-Control':'no-store, max-age=0'}});
    }
    const [usdPerOz,usdInr]=await Promise.all([yahooPrice(symbol),yahooPrice('USDINR=X')]);
    const ratePerGramInr=usdPerOz*usdInr/TROY_OZ_GRAMS;
    return NextResponse.json({asset,symbol,usdPerOz,usdInr,ratePerGramInr,currency:'INR',unit:'gram',provider:'Yahoo Finance futures + USDINR',time:new Date().toISOString()},{headers:{'Cache-Control':'no-store, max-age=0'}});
  }catch(e:any){
    return NextResponse.json({error:e?.message||'Rate failed'},{status:500});
  }
}
