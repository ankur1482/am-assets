import crypto from 'crypto';
import {createClient} from '@supabase/supabase-js';

export type OAuthProvider='upstox'|'google-drive'|'kotak';

function adminClient(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error('OAuth credential storage is not configured');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

function key(){
  const secret=process.env.OAUTH_TOKEN_ENCRYPTION_KEY||process.env.GOOGLE_OAUTH_COOKIE_SECRET||process.env.NEXTAUTH_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!secret)throw new Error('Missing OAUTH_TOKEN_ENCRYPTION_KEY');
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(value:unknown){
  const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key(),iv);
  const body=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64url');
}

function decrypt(value:string){
  const raw=Buffer.from(value,'base64url');
  if(raw.length<29)throw new Error('Stored OAuth credential is invalid');
  const decipher=crypto.createDecipheriv('aes-256-gcm',key(),raw.subarray(0,12));
  decipher.setAuthTag(raw.subarray(12,28));
  return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)),decipher.final()]).toString('utf8'));
}

export async function saveOAuthCredential(userId:string,provider:OAuthProvider,value:unknown,expiresAt?:string|null){
  const {error}=await adminClient().from('oauth_credentials').upsert({user_id:userId,provider,encrypted_value:encrypt(value),expires_at:expiresAt||null,updated_at:new Date().toISOString()},{onConflict:'user_id,provider'});
  if(error)throw new Error(`Could not store ${provider} credentials: ${error.message}`);
}

export async function readOAuthCredential<T=any>(userId:string,provider:OAuthProvider):Promise<T|null>{
  const {data,error}=await adminClient().from('oauth_credentials').select('encrypted_value,expires_at').eq('user_id',userId).eq('provider',provider).maybeSingle();
  if(error)throw new Error(`Could not read ${provider} credentials: ${error.message}`);
  if(!data)return null;
  if(data.expires_at&&new Date(data.expires_at).getTime()<=Date.now())return null;
  try{return decrypt(data.encrypted_value) as T}catch{return null}
}

export async function deleteOAuthCredential(userId:string,provider:OAuthProvider){
  const {error}=await adminClient().from('oauth_credentials').delete().eq('user_id',userId).eq('provider',provider);
  if(error)throw new Error(`Could not remove ${provider} credentials: ${error.message}`);
}
