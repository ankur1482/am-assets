import crypto from 'crypto';
import {NextRequest,NextResponse} from 'next/server';
import {UPSTOX_AUTH_URL,UPSTOX_STATE_COOKIE,upstoxConfig,upstoxCookieOptions} from '@/lib/upstox';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(req:NextRequest){
  try{
    const {clientId,redirectUri}=upstoxConfig(req.nextUrl.origin);
    const state=crypto.randomBytes(24).toString('base64url');
    const url=new URL(UPSTOX_AUTH_URL);
    url.searchParams.set('response_type','code');
    url.searchParams.set('client_id',clientId);
    url.searchParams.set('redirect_uri',redirectUri);
    url.searchParams.set('state',state);
    const res=NextResponse.json({authUrl:url.toString(),redirectUri});
    res.cookies.set(UPSTOX_STATE_COOKIE,state,upstoxCookieOptions(60*10));
    return res;
  }catch(e:any){
    return NextResponse.json({error:e?.message||'Could not start Upstox login'},{status:500});
  }
}
