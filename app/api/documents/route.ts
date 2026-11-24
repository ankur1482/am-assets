import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {deleteAssetDocument,downloadAssetDocument,googleDrivePath,isGoogleDrivePath,uploadAssetDocument} from '@/lib/googleDrive';
import {downloadOAuthAssetDocument,driveConfigured,hasGoogleDriveOAuth,isDriveSignInExpired,trashOAuthAssetDocument,uploadOAuthAssetDocument} from '@/lib/googleDriveOAuth';
import {driveNotConnected,householdAccess,householdOwner,jsonError,mayUpload,mayUseAppStorage,requireUser} from '@/lib/documentAccess';
import {documentMime,MAX_DOCUMENT_BYTES} from '@/lib/documentRules';

export const runtime='nodejs';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
const documentBucket='asset-documents';

function cleanPathPart(value:string){
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]+/g,'_').replace(/\s+/g,' ').trim()||'document';
}

function shouldFallbackToSupabase(error:any){
  const message=String(error?.response?.data?.error?.message||error?.message||'');
  return /service accounts do not have storage quota/i.test(message);
}

function parseFolderParts(value:FormDataEntryValue|null){
  if(!value)return [] as string[];
  try{
    const parsed=JSON.parse(String(value));
    return Array.isArray(parsed)?parsed.map(v=>String(v||'')).filter(Boolean):[];
  }catch{return [] as string[]}
}

async function ensureDocumentBucket(){
  if(!url||!serviceRoleKey)return;
  const serviceClient=createClient(url,serviceRoleKey);
  const {data}=await serviceClient.storage.getBucket(documentBucket);
  if(data)return;
  const created=await serviceClient.storage.createBucket(documentBucket,{
    public:false,
    fileSizeLimit:52428800
  });
  if(created.error&&created.error.message!=='The resource already exists')throw created.error;
}

/** The Drives a household file may be in: the owner's, or the signed-in person's own for older files. */
async function driveHolders(auth:{user:{id:string};supabase:any},workspaceId:string){
  const ownerId=workspaceId?await householdOwner(auth.supabase,workspaceId):auth.user.id;
  const holders:string[]=[];
  for(const id of new Set([ownerId,auth.user.id].filter(Boolean)))if(await hasGoogleDriveOAuth(id))holders.push(id);
  return {ownerId,holders};
}

/** Tries each Drive in turn. In someone else's Drive, only files saved for this household are allowed. */
async function inDrive<T>(holders:string[],userId:string,workspaceId:string,work:(holder:string,onlyWorkspace?:string)=>Promise<T>){
  let last:any=null;
  for(const holder of holders){
    try{return await work(holder,holder===userId?undefined:workspaceId);}
    catch(e:any){
      last=last&&Number(last?.status)===403?last:e;
      if(![403,404].includes(Number(e?.status??e?.code??e?.response?.status)))throw e;
    }
  }
  throw last||Object.assign(new Error('File not found in Google Drive'),{status:404});
}

const statusOf=(e:any)=>Number(e?.status??e?.code??e?.response?.status);

export async function POST(req:NextRequest){
  try{
    const contentLength=Number(req.headers.get('content-length')||0);
    if(contentLength>MAX_DOCUMENT_BYTES+1024*1024)return jsonError('Document must be 50 MB or smaller',413,'DOCUMENT_TOO_LARGE');
    const auth=await requireUser(req);
    if(auth.error)return auth.error;
    const form=await req.formData();
    const file=form.get('file');
    const moduleKey=String(form.get('moduleKey')||'documents');
    const workspaceId=String(form.get('workspaceId')||'');
    const folderParts=parseFolderParts(form.get('folderParts'));
    if(!(file instanceof File))return jsonError('Document file is required',400);
    if(file.size>MAX_DOCUMENT_BYTES)return jsonError('Document must be 50 MB or smaller',413,'DOCUMENT_TOO_LARGE');
    const mimeType=documentMime(file.name,file.type);
    if(!mimeType)return jsonError('This document type is not allowed',415,'DOCUMENT_TYPE_NOT_ALLOWED');
    const buffer=Buffer.from(await file.arrayBuffer());
    if(workspaceId){
      const access=await householdAccess(auth.supabase,workspaceId);
      if(!mayUpload(access,moduleKey))return jsonError('Document upload permission is required',403);
      if(driveConfigured()){
        const ownerId=await householdOwner(auth.supabase,workspaceId);
        try{
          if(ownerId&&await hasGoogleDriveOAuth(ownerId)){
            const uploaded=await uploadOAuthAssetDocument(ownerId,{userId:auth.user.id,moduleKey,fileName:file.name,mimeType,buffer,folderParts,workspaceId});
            return NextResponse.json({
              storage:'drive',
              document:{file_name:file.name,file_path:googleDrivePath(uploaded.fileId),mime_type:mimeType,file_size:file.size,notes:uploaded.webViewLink?`Google Drive: ${uploaded.webViewLink}`:'Google Drive'}
            });
          }
          if(!mayUseAppStorage(moduleKey))return driveNotConnected(ownerId,auth.user.id);
        }catch(e:any){
          if(!mayUseAppStorage(moduleKey)){
            if(isDriveSignInExpired(e))return driveNotConnected(ownerId,auth.user.id);
            throw e;
          }
          console.warn('Google Drive could not take a monthly document; kept in app storage instead.');
        }
      }
      if(!url||!serviceRoleKey)return jsonError('Document service is not configured',500);
      const storagePath=[
        workspaceId,
        cleanPathPart(moduleKey),
        `${new Date().toISOString().replace(/[:.]/g,'-')} ${cleanPathPart(file.name)}`
      ].join('/');
      await ensureDocumentBucket();
      const serviceClient=createClient(url,serviceRoleKey);
      const stored=await serviceClient.storage.from(documentBucket).upload(storagePath,buffer,{
        contentType:mimeType,
        upsert:false
      });
      if(stored.error)throw stored.error;
      return NextResponse.json({
        storage:'app',
        document:{
          file_name:file.name,
          file_path:storagePath,
          mime_type:mimeType,
          file_size:file.size,
          notes:'Shared household document'
        }
      });
    }
    if(await hasGoogleDriveOAuth(auth.user.id)){
      const uploaded=await uploadOAuthAssetDocument(auth.user.id,{
        userId:auth.user.id,
        moduleKey,
        fileName:file.name,
        mimeType,
        buffer,
        folderParts
      });
      return NextResponse.json({
        document:{
          file_name:file.name,
          file_path:googleDrivePath(uploaded.fileId),
          mime_type:mimeType,
          file_size:file.size,
          notes:uploaded.webViewLink?`Google Drive: ${uploaded.webViewLink}`:'Google Drive'
        },
        drive:uploaded
      });
    }
    if(process.env.GOOGLE_OAUTH_CLIENT_ID&&process.env.GOOGLE_OAUTH_CLIENT_SECRET){
      return jsonError('Connect Google Drive and try again.',409,'GOOGLE_DRIVE_NOT_CONNECTED');
    }
    try{
      const uploaded=await uploadAssetDocument({
        userId:auth.user.id,
        moduleKey,
        fileName:file.name,
        mimeType,
        buffer
      });
      return NextResponse.json({
        document:{
          file_name:file.name,
          file_path:googleDrivePath(uploaded.fileId),
          mime_type:mimeType,
          file_size:file.size,
          notes:uploaded.webViewLink?`Google Drive: ${uploaded.webViewLink}`:'Google Drive'
        },
        drive:uploaded
      });
    }catch(e:any){
      if(!shouldFallbackToSupabase(e))throw e;
      console.warn('Google Drive rejected service-account storage quota; falling back to Supabase Storage.');
    }
    const storagePath=[
      workspaceId||auth.user.id,
      cleanPathPart(moduleKey),
      `${new Date().toISOString().replace(/[:.]/g,'-')} ${cleanPathPart(file.name)}`
    ].join('/');
    await ensureDocumentBucket();
    const stored=await auth.supabase.storage.from(documentBucket).upload(storagePath,buffer,{
      contentType:mimeType,
      upsert:false
    });
    if(stored.error)throw stored.error;
    return NextResponse.json({
      document:{
        file_name:file.name,
        file_path:storagePath,
        mime_type:mimeType,
        file_size:file.size,
        notes:'Supabase Storage fallback: Google Drive service account has no storage quota'
      }
    });
  }catch(e:any){
    console.error('Google Drive upload failed',e);
    return jsonError(e?.message||'Google Drive upload failed',500,'GOOGLE_DRIVE_UPLOAD_FAILED');
  }
}

export async function GET(req:NextRequest){
  try{
    const auth=await requireUser(req);
    if(auth.error)return auth.error;
    const id=req.nextUrl.searchParams.get('id')||'';
    if(!id)return jsonError('Document id is required',400);
    const {data:doc,error}=await auth.supabase.from('asset_documents').select('*').eq('id',id).maybeSingle();
    if(error)throw error;
    if(!doc)return jsonError('Document not found',404);
    if(!isGoogleDrivePath(doc.file_path)){
      if(!url||!serviceRoleKey)return jsonError('Document service is not configured',500);
      const serviceClient=createClient(url,serviceRoleKey);
      const {data,error}=await serviceClient.storage.from(documentBucket).createSignedUrl(doc.file_path,60);
      if(error)throw error;
      return NextResponse.redirect(data.signedUrl,307);
    }
    const {ownerId,holders}=await driveHolders({user:auth.user,supabase:auth.supabase},doc.workspace_id||'');
    let file;
    if(holders.length)file=await inDrive(holders,auth.user.id,doc.workspace_id||'',(holder,only)=>downloadOAuthAssetDocument(holder,doc.file_path,only));
    else if(driveConfigured())return driveNotConnected(ownerId,auth.user.id);
    else file=await downloadAssetDocument(doc.file_path);
    const encoded=encodeURIComponent(file.name);
    return new NextResponse(file.body,{
      headers:{
        'Content-Type':file.mimeType,
        'Content-Disposition':`inline; filename="${file.name.replace(/"/g,'') || 'document'}"; filename*=UTF-8''${encoded}`,
        'Cache-Control':'private, max-age=0, must-revalidate'
      }
    });
  }catch(e:any){
    if(isDriveSignInExpired(e))return jsonError('Google Drive is not connected. The household owner needs to connect it again.',409,'GOOGLE_DRIVE_NOT_CONNECTED');
    if(statusOf(e)===403)return jsonError(e?.message||'You cannot open this file',403);
    if(statusOf(e)===404)return jsonError('This file is no longer in Google Drive.',404);
    console.error('Document open failed',e);
    return jsonError(e?.message||'Could not open document',500,'DOCUMENT_OPEN_FAILED');
  }
}

export async function DELETE(req:NextRequest){
  try{
    const auth=await requireUser(req);
    if(auth.error)return auth.error;
    const id=req.nextUrl.searchParams.get('id')||'';
    if(!id)return jsonError('Document id is required',400);
    const {data:doc,error}=await auth.supabase.from('asset_documents').select('*').eq('id',id).maybeSingle();
    if(error)throw error;
    if(!doc)return jsonError('Document not found',404);
    // Checked before the file is touched: the database only guards the entry, not the file itself.
    if(doc.workspace_id&&!(await householdAccess(auth.supabase,doc.workspace_id))?.can_delete)return jsonError('Permission to delete documents is required',403);
    if(isGoogleDrivePath(doc.file_path)){
      const {ownerId,holders}=await driveHolders({user:auth.user,supabase:auth.supabase},doc.workspace_id||'');
      try{
        if(holders.length)await inDrive(holders,auth.user.id,doc.workspace_id||'',(holder,only)=>trashOAuthAssetDocument(holder,doc.file_path,only));
        else if(driveConfigured())return driveNotConnected(ownerId,auth.user.id);
        else await deleteAssetDocument(doc.file_path);
      }catch(e:any){
        // Already gone from Drive: only the entry is left to remove.
        if(statusOf(e)!==404)throw e;
      }
    }
    else{
      if(!url||!serviceRoleKey)return jsonError('Document service is not configured',500);
      const serviceClient=createClient(url,serviceRoleKey);
      const rm=await serviceClient.storage.from(documentBucket).remove([doc.file_path]);
      if(rm.error)throw rm.error;
    }
    const del=await auth.supabase.from('asset_documents').delete().eq('id',id).select('id');
    if(del.error)throw del.error;
    if(!del.data?.length)return jsonError('Permission to delete documents is required',403);
    return NextResponse.json({ok:true});
  }catch(e:any){
    if(isDriveSignInExpired(e))return jsonError('Google Drive is not connected. The household owner needs to connect it again.',409,'GOOGLE_DRIVE_NOT_CONNECTED');
    if(statusOf(e)===403)return jsonError(e?.message||'You cannot delete this file',403);
    console.error('Document delete failed',e);
    return jsonError(e?.message||'Could not delete document',500,'DOCUMENT_DELETE_FAILED');
  }
}
