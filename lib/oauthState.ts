import crypto from 'crypto';

type OAuthStatePayload={provider:'upstox'|'google-drive';userId:string;nonce:string;exp:number};

function stateSecret(){
  const value=process.env.OAUTH_STATE_SECRET||process.env.GOOGLE_OAUTH_COOKIE_SECRET||process.env.NEXTAUTH_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!value)throw new Error('Missing OAUTH_STATE_SECRET');
  return crypto.createHash('sha256').update(value).digest();
}

function signature(payload:string){
  return crypto.createHmac('sha256',stateSecret()).update(payload).digest('base64url');
}

export function createOAuthState(provider:OAuthStatePayload['provider'],userId:string,ttlSeconds=600){
  const payload:OAuthStatePayload={provider,userId,nonce:crypto.randomBytes(24).toString('base64url'),exp:Math.floor(Date.now()/1000)+ttlSeconds};
  const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${signature(encoded)}`;
}

export function verifyOAuthState(value:string,provider:OAuthStatePayload['provider']){
  const [encoded,supplied,...extra]=value.split('.');
  if(!encoded||!supplied||extra.length)throw new Error('OAuth state is invalid');
  const expected=signature(encoded);
  const a=Buffer.from(supplied),b=Buffer.from(expected);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))throw new Error('OAuth state is invalid');
  const payload=JSON.parse(Buffer.from(encoded,'base64url').toString('utf8')) as OAuthStatePayload;
  if(payload.provider!==provider||!payload.userId||!payload.nonce||!Number.isFinite(payload.exp))throw new Error('OAuth state is invalid');
  if(payload.exp<Math.floor(Date.now()/1000))throw new Error('OAuth state has expired');
  return payload;
}

export function secureEqual(a:string,b:string){
  if(!a||!b)return false;
  const left=Buffer.from(a),right=Buffer.from(b);
  return left.length===right.length&&crypto.timingSafeEqual(left,right);
}
