import {NextRequest,NextResponse} from 'next/server';
import {GOOGLE_DRIVE_STATE_COOKIE,GOOGLE_DRIVE_TOKEN_COOKIE,clearGoogleOAuthCookieOptions,getGoogleOAuthClient,googleOAuthCookieOptions,packGoogleTokens} from '@/lib/googleDriveOAuth';

export const runtime='nodejs';

function html(message:string,ok=true){
  const payload=JSON.stringify({type:ok?'google-drive-connected':'google-drive-error',message});
  return new NextResponse(`<!doctype html><html><head><title>Google Drive</title></head><body><script>window.opener&&window.opener.postMessage(${payload},window.location.origin);window.close();</script><p>${message}</p></body></html>`,{
    headers:{'Content-Type':'text/html; charset=utf-8'}
  });
}

export async function GET(req:NextRequest){
  const code=req.nextUrl.searchParams.get('code')||'';
  const state=req.nextUrl.searchParams.get('state')||'';
  const expected=req.cookies.get(GOOGLE_DRIVE_STATE_COOKIE)?.value||'';
  if(!code)return html('Google Drive connection was cancelled.',false);
  if(!state||state!==expected)return html('Google Drive connection state did not match. Try again.',false);
  try{
    const client=getGoogleOAuthClient();
    const {tokens}=await client.getToken(code);
    if(!tokens.refresh_token&&!tokens.access_token)throw new Error('Google did not return a Drive token. Try connecting again.');
    const res=html('Google Drive connected.');
    res.cookies.set(GOOGLE_DRIVE_TOKEN_COOKIE,packGoogleTokens(tokens),googleOAuthCookieOptions());
    res.cookies.set(GOOGLE_DRIVE_STATE_COOKIE,'',clearGoogleOAuthCookieOptions());
    return res;
  }catch(e:any){
    return html(e?.message||'Could not connect Google Drive.',false);
  }
}
