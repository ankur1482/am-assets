import {NextRequest,NextResponse} from 'next/server';
import {GOOGLE_DRIVE_STATE_COOKIE,GOOGLE_DRIVE_TOKEN_COOKIE,clearGoogleOAuthCookieOptions,getGoogleOAuthClient} from '@/lib/googleDriveOAuth';
import {secureEqual,verifyOAuthState} from '@/lib/oauthState';
import {saveOAuthCredential} from '@/lib/oauthCredentials';
import {escapeHtml,safeJsonForInlineScript} from '@/lib/security';

export const runtime='nodejs';

function html(message:string,ok=true){
  const safe=escapeHtml(message);
  const eventType=ok?'google-drive-connected':'google-drive-error';
  return new NextResponse(`<!doctype html><html><head><title>Google Drive</title></head><body><script>window.opener&&window.opener.postMessage({type:${safeJsonForInlineScript(eventType)},message:${safeJsonForInlineScript(message)}},window.location.origin);window.close();</script><p>${safe}</p></body></html>`,{
    status:ok?200:400,
    headers:{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store, max-age=0'}
  });
}

export async function GET(req:NextRequest){
  const code=req.nextUrl.searchParams.get('code')||'';
  const state=req.nextUrl.searchParams.get('state')||'';
  const expected=req.cookies.get(GOOGLE_DRIVE_STATE_COOKIE)?.value||'';
  if(!code)return html('Google Drive connection was cancelled.',false);
  if(!expected||!state||!secureEqual(state,expected))return html('Google Drive connection state did not match. Try again.',false);
  try{
    const stateData=verifyOAuthState(state,'google-drive');
    const client=getGoogleOAuthClient();
    const {tokens}=await client.getToken(code);
    if(!tokens.refresh_token&&!tokens.access_token)throw new Error('Token missing');
    await saveOAuthCredential(stateData.userId,'google-drive',tokens);
    const res=html('Google Drive connected.');
    res.cookies.set(GOOGLE_DRIVE_TOKEN_COOKIE,'',clearGoogleOAuthCookieOptions());
    res.cookies.set(GOOGLE_DRIVE_STATE_COOKIE,'',clearGoogleOAuthCookieOptions());
    return res;
  }catch{
    return html('Could not connect Google Drive. Please try again.',false);
  }
}
