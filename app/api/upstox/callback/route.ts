import {NextRequest,NextResponse} from 'next/server';
import {UPSTOX_STATE_COOKIE,UPSTOX_TOKEN_COOKIE,UPSTOX_TOKEN_URL,clearUpstoxCookieOptions,upstoxConfig} from '@/lib/upstox';
import {secureEqual,verifyOAuthState} from '@/lib/oauthState';
import {saveOAuthCredential} from '@/lib/oauthCredentials';
import {escapeHtml} from '@/lib/security';

export const runtime='nodejs';
export const dynamic='force-dynamic';

function html(message:string,ok=true){
  const title=ok?'Upstox connected':'Upstox connection failed';
  const safeMessage=escapeHtml(message);
  return new NextResponse(`<!doctype html><html><head><title>${title}</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:system-ui;margin:32px;line-height:1.5"><h1>${title}</h1><p>${safeMessage}</p><p>You can close this tab.</p></body></html>`,{
    status:ok?200:400,
    headers:{
      'Content-Type':'text/html; charset=utf-8',
      'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer',
      'Cache-Control':'no-store, max-age=0'
    }
  });
}

export async function GET(req:NextRequest){
  const code=req.nextUrl.searchParams.get('code')||'';
  const state=req.nextUrl.searchParams.get('state')||'';
  const expected=req.cookies.get(UPSTOX_STATE_COOKIE)?.value||'';
  if(req.nextUrl.searchParams.has('error'))return html('Upstox declined or cancelled the connection.',false);
  if(!code)return html('Upstox did not send an authorization code.',false);
  if(!expected||!state||!secureEqual(state,expected))return html('Upstox login state did not match. Try connecting again.',false);
  try{
    const stateData=verifyOAuthState(state,'upstox');
    const {clientId,clientSecret,redirectUri}=upstoxConfig();
    const body=new URLSearchParams({code,client_id:clientId,client_secret:clientSecret,redirect_uri:redirectUri,grant_type:'authorization_code'});
    const tokenRes=await fetch(UPSTOX_TOKEN_URL,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body,cache:'no-store'});
    const tokenData=await tokenRes.json().catch(()=>({}));
    if(!tokenRes.ok||!tokenData?.access_token)throw new Error('Upstox token exchange failed');
    const expiresIn=Number(tokenData.expires_in)||60*60*12;
    await saveOAuthCredential(stateData.userId,'upstox',tokenData,new Date(Date.now()+expiresIn*1000).toISOString());
    const res=html('Upstox login completed securely.');
    res.cookies.set(UPSTOX_TOKEN_COOKIE,'',clearUpstoxCookieOptions());
    res.cookies.set(UPSTOX_STATE_COOKIE,'',clearUpstoxCookieOptions());
    return res;
  }catch{
    return html('Could not complete Upstox login. Please try again.',false);
  }
}
