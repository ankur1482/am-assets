import {Readable} from 'stream';
import {google} from 'googleapis';
import type {NextRequest} from 'next/server';
import {readOAuthCredential} from '@/lib/oauthCredentials';

const FOLDER_MIME='application/vnd.google-apps.folder';
const DRIVE_PREFIX='gdrive:';
export const GOOGLE_DRIVE_TOKEN_COOKIE='am_google_drive_tokens';
export const GOOGLE_DRIVE_STATE_COOKIE='am_google_drive_state';
const APP_FOLDER_NAME='Important Documents';
const MODULE_FOLDER_NAMES:Record<string,string>={
  stocks:'Stocks',
  mutualFunds:'Mutual Funds',
  ulips:'ULIPs',
  bullion:'Bullion',
  nsel:'NSEL e-Series',
  fixedIncome:'Fixed Income',
  insurance:'Insurance',
  property:'Property',
  otherAssets:'Other Assets',
  loans:'Loans',
  borrowings:'Borrowings',
  goals:'Goals',
  watchlist:'Watchlist',
  alerts:'Alerts',
  documents:'Documents'
};

type DriveUploadInput={
  userId:string;
  moduleKey:string;
  fileName:string;
  mimeType:string;
  buffer:Buffer;
  folderParts?:string[];
};

function cleanName(value:string){
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]+/g,'_').replace(/\s+/g,' ').trim()||'Document';
}

function escapeDriveQuery(value:string){
  return value.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
}

function googleDriveFileId(path:string){
  return String(path||'').startsWith(DRIVE_PREFIX)?path.slice(DRIVE_PREFIX.length):path;
}

export function googleOAuthCookieOptions(maxAge=60*60*24*180){
  return {httpOnly:true,sameSite:'lax' as const,secure:process.env.NODE_ENV==='production',path:'/',maxAge};
}

export function clearGoogleOAuthCookieOptions(){
  return {httpOnly:true,sameSite:'lax' as const,secure:process.env.NODE_ENV==='production',path:'/',maxAge:0};
}

function oauthConfig(){
  const clientId=process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret=process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if(!clientId||!clientSecret)throw new Error('Missing Google OAuth credentials. Add GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET to .env.local.');
  const origin=process.env.NEXT_PUBLIC_APP_URL||'https://gupta.vercel.app';
  const redirectUri=process.env.GOOGLE_OAUTH_REDIRECT_URI||`${origin}/api/google-drive/callback`;
  return {clientId,clientSecret,redirectUri};
}

export function getGoogleOAuthClient(){
  const {clientId,clientSecret,redirectUri}=oauthConfig();
  return new google.auth.OAuth2(clientId,clientSecret,redirectUri);
}

export function makeGoogleDriveAuthUrl(_req:NextRequest,state:string){
  const client=getGoogleOAuthClient();
  return client.generateAuthUrl({
    access_type:'offline',
    prompt:'consent',
    state,
    scope:['https://www.googleapis.com/auth/drive']
  });
}

export async function readGoogleTokens(userId:string){
  return readOAuthCredential<any>(userId,'google-drive');
}

export async function hasGoogleDriveOAuth(userId:string){
  const tokens=await readGoogleTokens(userId);
  return !!tokens?.refresh_token||!!tokens?.access_token;
}

async function getOAuthDrive(userId:string){
  const tokens=await readGoogleTokens(userId);
  if(!tokens?.refresh_token&&!tokens?.access_token)throw new Error('Google Drive is not connected. Connect Google Drive and try again.');
  const auth=getGoogleOAuthClient();
  auth.setCredentials(tokens);
  return google.drive({version:'v3',auth});
}

async function ensureFolder(drive:ReturnType<typeof google.drive>,parentId:string,name:string){
  const safeName=cleanName(name);
  const q=[
    `mimeType='${FOLDER_MIME}'`,
    `name='${escapeDriveQuery(safeName)}'`,
    `'${parentId}' in parents`,
    'trashed=false'
  ].join(' and ');
  const existing=await drive.files.list({q,fields:'files(id,name)',pageSize:1});
  const found=existing.data.files?.[0]?.id;
  if(found)return found;
  const created=await drive.files.create({
    requestBody:{name:safeName,mimeType:FOLDER_MIME,parents:[parentId]},
    fields:'id'
  });
  if(!created.data.id)throw new Error(`Could not create Google Drive folder ${safeName}`);
  return created.data.id;
}

export async function uploadOAuthAssetDocument(userId:string,input:DriveUploadInput){
  const drive=await getOAuthDrive(userId);
  let rootFolder=process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID||'';
  if(rootFolder)await drive.files.get({fileId:rootFolder,fields:'id,name'});
  else rootFolder=await ensureFolder(drive,'root',APP_FOLDER_NAME);
  let moduleFolder=rootFolder;
  const parts=(input.folderParts?.length?input.folderParts:[MODULE_FOLDER_NAMES[input.moduleKey]||input.moduleKey||'Documents']).map(cleanName).filter(Boolean);
  for(const part of parts)moduleFolder=await ensureFolder(drive,moduleFolder,part);
  const fileName=cleanName(`${new Date().toISOString().replace(/[:.]/g,'-')} ${input.fileName}`);
  const uploaded=await drive.files.create({
    requestBody:{name:fileName,parents:[moduleFolder]},
    media:{mimeType:input.mimeType||'application/octet-stream',body:Readable.from(input.buffer)},
    fields:'id,name,mimeType,size,webViewLink,webContentLink'
  });
  if(!uploaded.data.id)throw new Error('Google Drive upload did not return a file ID');
  return {
    fileId:uploaded.data.id,
    fileName:uploaded.data.name||input.fileName,
    folderId:moduleFolder,
    webViewLink:uploaded.data.webViewLink||'',
    webContentLink:uploaded.data.webContentLink||''
  };
}

export async function downloadOAuthAssetDocument(userId:string,filePath:string){
  const drive=await getOAuthDrive(userId);
  const fileId=googleDriveFileId(filePath);
  const [meta,content]=await Promise.all([
    drive.files.get({fileId,fields:'name,mimeType,size'}),
    drive.files.get({fileId,alt:'media'},{responseType:'arraybuffer'} as any)
  ]);
  return {
    name:meta.data.name||'document',
    mimeType:meta.data.mimeType||'application/octet-stream',
    body:Buffer.from(content.data as unknown as ArrayBuffer)
  };
}

export async function deleteOAuthAssetDocument(userId:string,filePath:string){
  const drive=await getOAuthDrive(userId);
  await drive.files.delete({fileId:googleDriveFileId(filePath)});
}
