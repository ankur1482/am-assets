import {cookies} from 'next/headers';

export const UPSTOX_TOKEN_COOKIE='am_upstox_access_token';
export const UPSTOX_STATE_COOKIE='am_upstox_oauth_state';
export const UPSTOX_AUTH_URL='https://api.upstox.com/v2/login/authorization/dialog';
export const UPSTOX_TOKEN_URL='https://api.upstox.com/v2/login/authorization/token';
export const UPSTOX_PROFILE_URL='https://api.upstox.com/v2/user/profile';

export function upstoxConfig(){
  const clientId=process.env.UPSTOX_API_KEY?.trim();
  const clientSecret=process.env.UPSTOX_API_SECRET?.trim();
  const redirectUri=(process.env.UPSTOX_REDIRECT_URI||`${process.env.NEXT_PUBLIC_APP_URL||'https://am-assets.vercel.app'}/api/upstox/callback`).trim();
  if(!clientId||!clientSecret)throw new Error('Missing UPSTOX_API_KEY or UPSTOX_API_SECRET');
  return {clientId,clientSecret,redirectUri};
}

export function upstoxCookieOptions(maxAge=60*60*12){
  return {httpOnly:true,secure:true,sameSite:'lax' as const,path:'/',maxAge};
}

export function clearUpstoxCookieOptions(){
  return {httpOnly:true,secure:true,sameSite:'lax' as const,path:'/',maxAge:0};
}

export async function getUpstoxAccessToken(){
  const store=await cookies();
  return store.get(UPSTOX_TOKEN_COOKIE)?.value||process.env.UPSTOX_ACCESS_TOKEN?.trim()||'';
}

export async function fetchUpstoxProfile(token:string){
  const res=await fetch(UPSTOX_PROFILE_URL,{
    headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},
    cache:'no-store'
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok||data?.status==='error')throw new Error(data?.errors?.[0]?.message||data?.message||'Upstox profile request failed');
  return data;
}
