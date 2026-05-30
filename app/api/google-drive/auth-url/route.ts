import crypto from 'crypto';
import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {GOOGLE_DRIVE_STATE_COOKIE,googleOAuthCookieOptions,makeGoogleDriveAuthUrl} from '@/lib/googleDriveOAuth';

export const runtime='nodejs';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function requireUser(req:NextRequest){
  if(!url||!anonKey)return false;
  const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(!token)return false;
  const supabase=createClient(url,anonKey,{global:{headers:{Authorization:`Bearer ${token}`}}});
  const {data:{user}}=await supabase.auth.getUser();
  return !!user;
}

export async function GET(req:NextRequest){
  try{
    if(!await requireUser(req))return NextResponse.json({error:'Invalid session'},{status:401});
    const state=crypto.randomBytes(24).toString('base64url');
    const authUrl=makeGoogleDriveAuthUrl(req,state);
    const res=NextResponse.json({authUrl});
    res.cookies.set(GOOGLE_DRIVE_STATE_COOKIE,state,googleOAuthCookieOptions(60*10));
    return res;
  }catch(e:any){
    return NextResponse.json({error:e?.message||'Could not start Google Drive connection'},{status:500});
  }
}
