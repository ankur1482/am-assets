import {NextRequest,NextResponse} from 'next/server';
import {UPSTOX_AUTH_URL,UPSTOX_STATE_COOKIE,upstoxConfig,upstoxCookieOptions} from '@/lib/upstox';
import {authenticateRequest} from '@/lib/serverAuth';
import {createOAuthState} from '@/lib/oauthState';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(req:NextRequest){
  try{
    const auth=await authenticateRequest(req);
    if(!auth)return NextResponse.json({error:'Invalid session'},{status:401});
    const {clientId,redirectUri}=upstoxConfig();
    const state=createOAuthState('upstox',auth.user.id);
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
