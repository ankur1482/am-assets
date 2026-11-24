import {NextRequest,NextResponse} from 'next/server';
import {GOOGLE_DRIVE_TOKEN_COOKIE,clearGoogleOAuthCookieOptions,driveConfigured,hasGoogleDriveOAuth} from '@/lib/googleDriveOAuth';
import {householdOwner,requireUser} from '@/lib/documentAccess';
import {authenticateRequest} from '@/lib/serverAuth';
import {deleteOAuthCredential} from '@/lib/oauthCredentials';

export const runtime='nodejs';

export async function GET(req:NextRequest){
  const auth=await requireUser(req);
  if(auth.error)return NextResponse.json({connected:false,error:'Invalid session'},{status:401});
  const configured=driveConfigured();
  const connected=configured&&await hasGoogleDriveOAuth(auth.user.id);
  const workspaceId=req.nextUrl.searchParams.get('workspaceId')||'';
  // Household documents go to the owner's Drive, which may not be the signed-in person's.
  const ownerId=workspaceId?await householdOwner(auth.supabase,workspaceId):auth.user.id;
  const mine=ownerId===auth.user.id;
  return NextResponse.json({connected,household:{configured,connected:mine?connected:configured&&!!ownerId&&await hasGoogleDriveOAuth(ownerId),mine}});
}

export async function DELETE(req:NextRequest){
  const auth=await authenticateRequest(req);
  if(!auth)return NextResponse.json({error:'Invalid session'},{status:401});
  await deleteOAuthCredential(auth.user.id,'google-drive');
  const res=NextResponse.json({ok:true});
  res.cookies.set(GOOGLE_DRIVE_TOKEN_COOKIE,'',clearGoogleOAuthCookieOptions());
  return res;
}
