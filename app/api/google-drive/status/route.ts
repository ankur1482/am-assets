import {NextRequest,NextResponse} from 'next/server';
import {GOOGLE_DRIVE_TOKEN_COOKIE,clearGoogleOAuthCookieOptions,hasGoogleDriveOAuth} from '@/lib/googleDriveOAuth';

export const runtime='nodejs';

export async function GET(req:NextRequest){
  return NextResponse.json({connected:hasGoogleDriveOAuth(req)});
}

export async function DELETE(){
  const res=NextResponse.json({ok:true});
  res.cookies.set(GOOGLE_DRIVE_TOKEN_COOKIE,'',clearGoogleOAuthCookieOptions());
  return res;
}
