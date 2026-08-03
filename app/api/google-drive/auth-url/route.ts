import {NextRequest,NextResponse} from 'next/server';
import {GOOGLE_DRIVE_STATE_COOKIE,googleOAuthCookieOptions,makeGoogleDriveAuthUrl} from '@/lib/googleDriveOAuth';
import {authenticateRequest} from '@/lib/serverAuth';
import {createOAuthState} from '@/lib/oauthState';

export const runtime='nodejs';

export async function GET(req:NextRequest){
  try{
    const auth=await authenticateRequest(req);
    if(!auth)return NextResponse.json({error:'Invalid session'},{status:401});
    const state=createOAuthState('google-drive',auth.user.id);
    const authUrl=makeGoogleDriveAuthUrl(req,state);
    const res=NextResponse.json({authUrl});
    res.cookies.set(GOOGLE_DRIVE_STATE_COOKIE,state,googleOAuthCookieOptions(60*10));
    return res;
  }catch(e:any){
    return NextResponse.json({error:e?.message||'Could not start Google Drive connection'},{status:500});
  }
}
