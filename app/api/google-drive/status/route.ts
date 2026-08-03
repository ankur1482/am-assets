import {NextRequest,NextResponse} from 'next/server';
import {GOOGLE_DRIVE_TOKEN_COOKIE,clearGoogleOAuthCookieOptions,hasGoogleDriveOAuth} from '@/lib/googleDriveOAuth';
import {authenticateRequest} from '@/lib/serverAuth';
import {deleteOAuthCredential} from '@/lib/oauthCredentials';

export const runtime='nodejs';

export async function GET(req:NextRequest){
  const auth=await authenticateRequest(req);
  if(!auth)return NextResponse.json({connected:false,error:'Invalid session'},{status:401});
  return NextResponse.json({connected:await hasGoogleDriveOAuth(auth.user.id)});
}

export async function DELETE(req:NextRequest){
  const auth=await authenticateRequest(req);
  if(!auth)return NextResponse.json({error:'Invalid session'},{status:401});
  await deleteOAuthCredential(auth.user.id,'google-drive');
  const res=NextResponse.json({ok:true});
  res.cookies.set(GOOGLE_DRIVE_TOKEN_COOKIE,'',clearGoogleOAuthCookieOptions());
  return res;
}
