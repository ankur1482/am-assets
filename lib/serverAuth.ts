import {createClient, type User} from '@supabase/supabase-js';
import type {NextRequest} from 'next/server';

export type ServerAuth={user:User;accessToken:string};

export async function authenticateRequest(req:NextRequest|Request):Promise<ServerAuth|null>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const accessToken=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
  if(!url||!anonKey||!accessToken)return null;
  const client=createClient(url,anonKey,{global:{headers:{Authorization:`Bearer ${accessToken}`}}});
  const {data:{user},error}=await client.auth.getUser(accessToken);
  return error||!user?null:{user,accessToken};
}
