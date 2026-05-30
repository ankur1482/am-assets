import {Readable} from 'stream';
import {google} from 'googleapis';

const FOLDER_MIME='application/vnd.google-apps.folder';
const DRIVE_PREFIX='gdrive:';
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
};

function parseServiceAccount(){
  const json=process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;
  if(json){
    const raw=json.trim().startsWith('{')?json:Buffer.from(json,'base64').toString('utf8');
    return JSON.parse(raw);
  }
  const client_email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const private_key=process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g,'\n');
  if(client_email&&private_key)return {client_email,private_key};
  throw new Error('Missing Google Drive credentials. Add GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY.');
}

export function isGoogleDrivePath(path:string){
  return String(path||'').startsWith(DRIVE_PREFIX);
}

export function googleDriveFileId(path:string){
  return isGoogleDrivePath(path)?path.slice(DRIVE_PREFIX.length):path;
}

export function googleDrivePath(fileId:string){
  return `${DRIVE_PREFIX}${fileId}`;
}

export function getDriveRootFolderId(){
  const id=process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if(!id)throw new Error('Missing GOOGLE_DRIVE_ROOT_FOLDER_ID. Share a Google Drive folder with the service account and add its folder ID on the server.');
  return id;
}

export function getDriveClient(){
  const credentials=parseServiceAccount();
  const auth=new google.auth.JWT({
    email:credentials.client_email,
    key:credentials.private_key,
    scopes:['https://www.googleapis.com/auth/drive']
  });
  return google.drive({version:'v3',auth});
}

function escapeDriveQuery(value:string){
  return value.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
}

function cleanName(value:string){
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]+/g,'_').replace(/\s+/g,' ').trim()||'Document';
}

async function ensureFolder(drive:ReturnType<typeof getDriveClient>,parentId:string,name:string){
  const safeName=cleanName(name);
  const q=[
    `mimeType='${FOLDER_MIME}'`,
    `name='${escapeDriveQuery(safeName)}'`,
    `'${parentId}' in parents`,
    'trashed=false'
  ].join(' and ');
  const existing=await drive.files.list({
    q,
    fields:'files(id,name)',
    pageSize:1,
    supportsAllDrives:true,
    includeItemsFromAllDrives:true
  });
  const found=existing.data.files?.[0]?.id;
  if(found)return found;
  const created=await drive.files.create({
    requestBody:{name:safeName,mimeType:FOLDER_MIME,parents:[parentId]},
    fields:'id',
    supportsAllDrives:true
  });
  if(!created.data.id)throw new Error(`Could not create Google Drive folder ${safeName}`);
  return created.data.id;
}

export async function uploadAssetDocument(input:DriveUploadInput){
  const drive=getDriveClient();
  const rootId=getDriveRootFolderId();
  const userFolder=await ensureFolder(drive,rootId,input.userId);
  const moduleFolder=await ensureFolder(drive,userFolder,MODULE_FOLDER_NAMES[input.moduleKey]||input.moduleKey||'Documents');
  const fileName=cleanName(`${new Date().toISOString().replace(/[:.]/g,'-')} ${input.fileName}`);
  const uploaded=await drive.files.create({
    requestBody:{name:fileName,parents:[moduleFolder]},
    media:{
      mimeType:input.mimeType||'application/octet-stream',
      body:Readable.from(input.buffer)
    },
    fields:'id,name,mimeType,size,webViewLink,webContentLink',
    supportsAllDrives:true
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

export async function deleteAssetDocument(filePath:string){
  const drive=getDriveClient();
  await drive.files.delete({fileId:googleDriveFileId(filePath),supportsAllDrives:true});
}

export async function downloadAssetDocument(filePath:string){
  const drive=getDriveClient();
  const fileId=googleDriveFileId(filePath);
  const [meta,content]=await Promise.all([
    drive.files.get({fileId,fields:'name,mimeType,size',supportsAllDrives:true}),
    drive.files.get({fileId,alt:'media',supportsAllDrives:true},{responseType:'arraybuffer'} as any)
  ]);
  return {
    name:meta.data.name||'document',
    mimeType:meta.data.mimeType||'application/octet-stream',
    body:Buffer.from(content.data as unknown as ArrayBuffer)
  };
}
