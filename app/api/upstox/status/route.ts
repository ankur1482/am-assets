import {NextRequest,NextResponse} from 'next/server';
import {UPSTOX_TOKEN_COOKIE,clearUpstoxCookieOptions,fetchUpstoxProfile,getUpstoxAccessToken} from '@/lib/upstox';
import {authenticateRequest} from '@/lib/serverAuth';
import {deleteOAuthCredential} from '@/lib/oauthCredentials';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(req:NextRequest){
  try{
    const auth=await authenticateRequest(req);
    if(!auth)return NextResponse.json({connected:false,error:'Invalid session'},{status:401});
    const token=await getUpstoxAccessToken(auth.user.id);
    if(!token)return NextResponse.json({connected:false,error:'Missing Upstox access token'},{status:401});
    const profile=await fetchUpstoxProfile(token);
    const data=profile?.data||{};
    return NextResponse.json({connected:true,broker:data.broker||'UPSTOX',userId:data.user_id||'',userName:data.user_name||'',exchanges:data.exchanges||[],products:data.products||[],isActive:data.is_active},{headers:{'Cache-Control':'no-store, max-age=0'}});
  }catch(e:any){
    const res=NextResponse.json({connected:false,error:e?.message||'Upstox status failed'},{status:401});
    res.cookies.set(UPSTOX_TOKEN_COOKIE,'',clearUpstoxCookieOptions());
    return res;
  }
}

export async function DELETE(req:NextRequest){
  const auth=await authenticateRequest(req);
  if(!auth)return NextResponse.json({error:'Invalid session'},{status:401});
  await deleteOAuthCredential(auth.user.id,'upstox');
  const res=NextResponse.json({ok:true});
  res.cookies.set(UPSTOX_TOKEN_COOKIE,'',clearUpstoxCookieOptions());
  return res;
}
