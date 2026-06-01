import {NextRequest,NextResponse} from 'next/server';
import {UPSTOX_STATE_COOKIE,UPSTOX_TOKEN_COOKIE,UPSTOX_TOKEN_URL,clearUpstoxCookieOptions,upstoxConfig,upstoxCookieOptions} from '@/lib/upstox';

export const runtime='nodejs';
export const dynamic='force-dynamic';

function html(message:string,ok=true){
  const title=ok?'Upstox connected':'Upstox connection failed';
  return new NextResponse(`<!doctype html><html><head><title>${title}</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:system-ui;margin:32px;line-height:1.5"><h1>${title}</h1><p>${message}</p><p>You can close this tab.</p></body></html>`,{
    status:ok?200:400,
    headers:{'Content-Type':'text/html; charset=utf-8'}
  });
}

export async function GET(req:NextRequest){
  const code=req.nextUrl.searchParams.get('code')||'';
  const state=req.nextUrl.searchParams.get('state')||'';
  const expected=req.cookies.get(UPSTOX_STATE_COOKIE)?.value||'';
  const error=req.nextUrl.searchParams.get('error')||'';
  if(error)return html(`Upstox returned: ${error}`,false);
  if(!code)return html('Upstox did not send an authorization code.',false);
  if(expected&&state&&state!==expected)return html('Upstox login state did not match. Try connecting again.',false);
  try{
    const {clientId,clientSecret,redirectUri}=upstoxConfig(req.nextUrl.origin);
    const body=new URLSearchParams({
      code,
      client_id:clientId,
      client_secret:clientSecret,
      redirect_uri:redirectUri,
      grant_type:'authorization_code'
    });
    const tokenRes=await fetch(UPSTOX_TOKEN_URL,{
      method:'POST',
      headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},
      body,
      cache:'no-store'
    });
    const tokenData=await tokenRes.json().catch(()=>({}));
    if(!tokenRes.ok||!tokenData?.access_token){
      const message=tokenData?.errors?.[0]?.message||tokenData?.message||'Upstox token exchange failed';
      throw new Error(message);
    }
    const res=html('Upstox login completed and the access token was stored securely for this browser.');
    res.cookies.set(UPSTOX_TOKEN_COOKIE,tokenData.access_token,upstoxCookieOptions(Number(tokenData.expires_in)||60*60*12));
    res.cookies.set(UPSTOX_STATE_COOKIE,'',clearUpstoxCookieOptions());
    return res;
  }catch(e:any){
    return html(e?.message||'Could not complete Upstox login.',false);
  }
}
