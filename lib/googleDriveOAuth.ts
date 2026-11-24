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
  /** Marks the file as this household's, so a member can open it through the app but never anything else in the Drive. */
  workspaceId?:string;
};
const UPLOAD_URL='https://www.googleapis.com/upload/drive/v3/files';

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
  const origin=process.env.NEXT_PUBLIC_APP_URL||'https://ankurgupta.vercel.app';
  const redirectUri=process.env.GOOGLE_OAUTH_REDIRECT_URI||`${origin}/api/google-drive/callback`;
  return {clientId,clientSecret,redirectUri};
}

export const driveConfigured=()=>!!process.env.GOOGLE_OAUTH_CLIENT_ID&&!!process.env.GOOGLE_OAUTH_CLIENT_SECRET;

/** Google ends a sign-in when it is revoked or expires; the owner has to connect again. */
export function isDriveSignInExpired(error:any){
  const text=String(error?.response?.data?.error_description||error?.response?.data?.error||error?.message||'');
  return /invalid_grant|invalid_rapt|unauthorized_client|not connected/i.test(text);
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

async function getOAuthAuth(userId:string){
  const tokens=await readGoogleTokens(userId);
  if(!tokens?.refresh_token&&!tokens?.access_token)throw new Error('Google Drive is not connected. Connect Google Drive and try again.');
  const auth=getGoogleOAuthClient();
  auth.setCredentials(tokens);
  return auth;
}

async function getOAuthDrive(userId:string){
  return google.drive({version:'v3',auth:await getOAuthAuth(userId)});
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

/** Finds or makes the folder for a file, and the details to save with it. */
async function uploadTarget(drive:ReturnType<typeof google.drive>,input:Omit<DriveUploadInput,'buffer'>){
  let rootFolder=process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID||'';
  if(rootFolder)await drive.files.get({fileId:rootFolder,fields:'id,name'});
  else rootFolder=await ensureFolder(drive,'root',APP_FOLDER_NAME);
  let moduleFolder=rootFolder;
  const parts=(input.folderParts?.length?input.folderParts:[MODULE_FOLDER_NAMES[input.moduleKey]||input.moduleKey||'Documents']).map(cleanName).filter(Boolean);
  for(const part of parts)moduleFolder=await ensureFolder(drive,moduleFolder,part);
  const fileName=cleanName(`${new Date().toISOString().replace(/[:.]/g,'-')} ${input.fileName}`);
  return {name:fileName,parents:[moduleFolder],...(input.workspaceId?{appProperties:{workspaceId:input.workspaceId}}:{})};
}

export async function uploadOAuthAssetDocument(userId:string,input:DriveUploadInput){
  const drive=await getOAuthDrive(userId);
  const target=await uploadTarget(drive,input);
  const uploaded=await drive.files.create({
    requestBody:target,
    media:{mimeType:input.mimeType||'application/octet-stream',body:Readable.from(input.buffer)},
    fields:'id,name,mimeType,size,webViewLink,webContentLink'
  });
  if(!uploaded.data.id)throw new Error('Google Drive upload did not return a file ID');
  return {
    fileId:uploaded.data.id,
    fileName:uploaded.data.name||input.fileName,
    folderId:target.parents[0],
    webViewLink:uploaded.data.webViewLink||'',
    webContentLink:uploaded.data.webContentLink||''
  };
}

/** Starts a large upload. Google answers with a one-off address that takes the file in pieces. */
export async function startOAuthUpload(userId:string,input:Omit<DriveUploadInput,'buffer'>&{size:number}){
  const auth=await getOAuthAuth(userId);
  const target=await uploadTarget(google.drive({version:'v3',auth}),input);
  const {token}=await auth.getAccessToken();
  const response=await fetch(`${UPLOAD_URL}?uploadType=resumable&fields=id,name,webViewLink`,{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':input.mimeType,'X-Upload-Content-Length':String(input.size)},
    body:JSON.stringify(target),
    cache:'no-store'
  });
  const address=response.headers.get('location')||'';
  if(!response.ok||!address.startsWith(UPLOAD_URL))throw new Error(`Google Drive would not start the upload (${response.status})`);
  return address;
}

/** Passes one piece of a large file to Google. */
export async function continueOAuthUpload(userId:string,address:string,piece:ArrayBuffer,start:number,size:number){
  if(!address.startsWith(UPLOAD_URL))throw new Error('Upload address is not valid');
  const {token}=await (await getOAuthAuth(userId)).getAccessToken();
  const response=await fetch(address,{
    method:'PUT',
    headers:{Authorization:`Bearer ${token}`,'Content-Range':`bytes ${start}-${start+piece.byteLength-1}/${size}`},
    body:piece,
    // Google answers 308 for "send the next piece", which is not a redirect here.
    redirect:'manual',
    cache:'no-store'
  });
  if(response.status===308)return {done:false as const};
  if(!response.ok)throw new Error(`Google Drive upload failed (${response.status})`);
  const file=await response.json();
  if(!file?.id)throw new Error('Google Drive upload did not return a file ID');
  return {done:true as const,fileId:String(file.id),webViewLink:String(file.webViewLink||'')};
}

/** With a household given, only that household's files are touched. */
async function checkedMeta(drive:ReturnType<typeof google.drive>,fileId:string,workspaceId?:string){
  const meta=await drive.files.get({fileId,fields:'name,mimeType,size,appProperties,trashed'});
  if(workspaceId&&meta.data.appProperties?.workspaceId!==workspaceId)throw Object.assign(new Error('Only the household owner can open this file.'),{status:403});
  return meta.data;
}

export async function downloadOAuthAssetDocument(userId:string,filePath:string,workspaceId?:string){
  const drive=await getOAuthDrive(userId);
  const fileId=googleDriveFileId(filePath);
  const meta=await checkedMeta(drive,fileId,workspaceId);
  // Streamed, as Vercel refuses to send more than 4.5 MB in one piece.
  const content=await drive.files.get({fileId,alt:'media'},{responseType:'stream'} as any);
  const data=content.data as unknown as Readable|ReadableStream;
  return {
    name:meta.name||'document',
    mimeType:meta.mimeType||'application/octet-stream',
    body:data instanceof ReadableStream?data:Readable.toWeb(data) as unknown as ReadableStream
  };
}

/** Moves the file to Drive's bin, where Google keeps it for 30 days. */
export async function trashOAuthAssetDocument(userId:string,filePath:string,workspaceId?:string){
  const drive=await getOAuthDrive(userId);
  const fileId=googleDriveFileId(filePath);
  await checkedMeta(drive,fileId,workspaceId);
  await drive.files.update({fileId,requestBody:{trashed:true}});
}
