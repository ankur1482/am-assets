import {NextRequest,NextResponse} from 'next/server';
import {isBackupFile,MAX_BACKUP_BYTES} from '@/lib/backups';
import {hasGoogleDriveOAuth,uploadOAuthAssetDocument} from '@/lib/googleDriveOAuth';
import {authenticateRequest} from '@/lib/serverAuth';

export const runtime='nodejs';

// Saves a backup file into the signed-in user's own Google Drive.
export async function POST(req:NextRequest){
  const auth=await authenticateRequest(req);
  if(!auth)return NextResponse.json({error:'Invalid session'},{status:401});
  const text=await req.text();
  if(Buffer.byteLength(text)>MAX_BACKUP_BYTES)return NextResponse.json({error:'This backup is too large to send to Google Drive. Save it to your PC instead.',code:'BACKUP_TOO_LARGE'},{status:413});
  if(!isBackupFile(text))return NextResponse.json({error:'Not an Asset Manager backup'},{status:400});
  if(!await hasGoogleDriveOAuth(auth.user.id))return NextResponse.json({error:'Connect Google Drive and try again.',code:'GOOGLE_DRIVE_NOT_CONNECTED'},{status:409});
  try{
    const uploaded=await uploadOAuthAssetDocument(auth.user.id,{userId:auth.user.id,moduleKey:'backups',fileName:'asset-manager-backup.json',mimeType:'application/json',buffer:Buffer.from(text),folderParts:['Backups']});
    return NextResponse.json({ok:true,fileName:uploaded.fileName,webViewLink:uploaded.webViewLink});
  }catch(e:any){
    console.error('Backup upload failed',e);
    return NextResponse.json({error:e?.message||'Could not save the backup to Google Drive',code:'BACKUP_UPLOAD_FAILED'},{status:502});
  }
}
