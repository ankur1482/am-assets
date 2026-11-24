import {NextRequest,NextResponse} from 'next/server';
import {driveNotConnected,householdAccess,householdOwner,jsonError,mayUpload,requireUser} from '@/lib/documentAccess';
import {documentMime,MAX_DOCUMENT_BYTES,UPLOAD_CHUNK_BYTES} from '@/lib/documentRules';
import {continueOAuthUpload,driveConfigured,hasGoogleDriveOAuth,isDriveSignInExpired,startOAuthUpload} from '@/lib/googleDriveOAuth';
import {openJson,sealJson} from '@/lib/oauthCredentials';

export const runtime='nodejs';

// For files over 4 MB, which Vercel will not take in one request. POST starts the upload; PUT passes one piece at a time.
type Upload={address:string;driveUser:string;userId:string;fileName:string;mimeType:string;size:number;exp:number};

export async function POST(req:NextRequest){
  let ownerId='',userId='';
  try{
    const auth=await requireUser(req);
    if(auth.error)return auth.error;
    userId=auth.user.id;
    const body=await req.json().catch(()=>({}));
    const moduleKey=String(body.moduleKey||'documents'),workspaceId=String(body.workspaceId||''),fileName=String(body.fileName||'document'),size=Number(body.size);
    if(!Number.isInteger(size)||size<=0)return jsonError('Document file is required',400);
    if(size>MAX_DOCUMENT_BYTES)return jsonError('Document must be 50 MB or smaller',413,'DOCUMENT_TOO_LARGE');
    const mimeType=documentMime(fileName,String(body.mimeType||''));
    if(!mimeType)return jsonError('This document type is not allowed',415,'DOCUMENT_TYPE_NOT_ALLOWED');
    if(workspaceId&&!mayUpload(await householdAccess(auth.supabase,workspaceId),moduleKey))return jsonError('Document upload permission is required',403);
    if(!driveConfigured())return jsonError('Files over 4 MB need Google Drive, which is not set up on the server yet.',409,'GOOGLE_DRIVE_NOT_SET_UP');
    ownerId=workspaceId?await householdOwner(auth.supabase,workspaceId):userId;
    if(!ownerId||!await hasGoogleDriveOAuth(ownerId))return driveNotConnected(ownerId,userId);
    const folderParts=Array.isArray(body.folderParts)?body.folderParts.map((part:unknown)=>String(part||'')).filter(Boolean):[];
    const address=await startOAuthUpload(ownerId,{userId,moduleKey,fileName,mimeType,folderParts,workspaceId:workspaceId||undefined,size});
    const upload:Upload={address,driveUser:ownerId,userId,fileName,mimeType,size,exp:Date.now()+60*60*1000};
    return NextResponse.json({token:sealJson(upload)});
  }catch(e:any){
    if(isDriveSignInExpired(e))return driveNotConnected(ownerId,userId);
    console.error('Large document upload could not start',e);
    return jsonError(e?.message||'Google Drive upload failed',500,'GOOGLE_DRIVE_UPLOAD_FAILED');
  }
}

export async function PUT(req:NextRequest){
  try{
    const auth=await requireUser(req);
    if(auth.error)return auth.error;
    let upload:Upload;
    try{upload=openJson(req.headers.get('x-upload-token')||'') as Upload;}
    catch{return jsonError('This upload is not valid. Start it again.',400);}
    if(upload.userId!==auth.user.id)return jsonError('This upload belongs to someone else.',403);
    if(!(upload.exp>Date.now()))return jsonError('This upload took too long. Start it again.',400);
    const start=Number(req.nextUrl.searchParams.get('start'));
    const piece=await req.arrayBuffer();
    const expected=Math.min(UPLOAD_CHUNK_BYTES,upload.size-start);
    if(!Number.isInteger(start)||start<0||start%UPLOAD_CHUNK_BYTES||expected<=0||piece.byteLength!==expected)return jsonError('Part of the file did not arrive. Start it again.',400);
    const result=await continueOAuthUpload(upload.driveUser,upload.address,piece,start,upload.size);
    if(!result.done)return NextResponse.json({done:false});
    return NextResponse.json({
      done:true,
      storage:'drive',
      document:{file_name:upload.fileName,file_path:`gdrive:${result.fileId}`,mime_type:upload.mimeType,file_size:upload.size,notes:result.webViewLink?`Google Drive: ${result.webViewLink}`:'Google Drive'}
    });
  }catch(e:any){
    console.error('Large document upload failed',e);
    return jsonError(e?.message||'Google Drive upload failed',500,'GOOGLE_DRIVE_UPLOAD_FAILED');
  }
}
