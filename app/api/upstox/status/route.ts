import {NextResponse} from 'next/server';
import {UPSTOX_TOKEN_COOKIE,clearUpstoxCookieOptions,fetchUpstoxProfile,getUpstoxAccessToken} from '@/lib/upstox';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(){
  try{
    const token=await getUpstoxAccessToken();
    if(!token)return NextResponse.json({connected:false,error:'Missing Upstox access token'},{status:401});
    const profile=await fetchUpstoxProfile(token);
    const data=profile?.data||{};
    return NextResponse.json({
      connected:true,
      broker:data.broker||'UPSTOX',
      userId:data.user_id||'',
      userName:data.user_name||'',
      exchanges:data.exchanges||[],
      products:data.products||[],
      isActive:data.is_active
    },{headers:{'Cache-Control':'no-store, max-age=0'}});
  }catch(e:any){
    const res=NextResponse.json({connected:false,error:e?.message||'Upstox status failed'},{status:401});
    res.cookies.set(UPSTOX_TOKEN_COOKIE,'',clearUpstoxCookieOptions());
    return res;
  }
}
