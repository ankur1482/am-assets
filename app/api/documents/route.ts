import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {deleteAssetDocument,downloadAssetDocument,googleDrivePath,isGoogleDrivePath,uploadAssetDocument} from '@/lib/googleDrive';
import {deleteOAuthAssetDocument,downloadOAuthAssetDocument,hasGoogleDriveOAuth,uploadOAuthAssetDocument} from '@/lib/googleDriveOAuth';

export const runtime='nodejs';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
const documentBucket='asset-documents';
const MAX_DOCUMENT_BYTES=50*1024*1024;
const ALLOWED_DOCUMENT_MIME_TYPES=new Set([
  'application/pdf','image/jpeg','image/png','image/webp','image/gif',
  'text/plain','text/csv','application/json',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);

function jsonError(message:string,status=500,code?:string){
  return NextResponse.json({error:message,code},{status});
}

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

async function requireUser(req:NextRequest){
  if(!url||!anonKey)return {error:jsonError('Missing Supabase server env vars',500,'SUPABASE_ENV_MISSING')};
  const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(!token)return {error:jsonError('Missing authorization token',401)};
  const supabase=createClient(url,anonKey,{global:{headers:{Authorization:`Bearer ${token}`}}});
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return {error:jsonError('Invalid session',401)};
  return {user,supabase};
}

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
    if(!ALLOWED_DOCUMENT_MIME_TYPES.has(file.type))return jsonError('This document type is not allowed',415,'DOCUMENT_TYPE_NOT_ALLOWED');
    const buffer=Buffer.from(await file.arrayBuffer());
    if(workspaceId){
      const {data:access,error:accessError}=await auth.supabase.rpc('workspace_access',{target_workspace:workspaceId});
      if(accessError)throw accessError;
      if(!access?.can_upload_documents||!access?.can_edit)return jsonError('Document upload permission is required',403);
      if(!url||!serviceRoleKey)return jsonError('Document service is not configured',500);
      const storagePath=[
        workspaceId,
        cleanPathPart(moduleKey),
        `${new Date().toISOString().replace(/[:.]/g,'-')} ${cleanPathPart(file.name)}`
      ].join('/');
      await ensureDocumentBucket();
      const serviceClient=createClient(url,serviceRoleKey);
      const stored=await serviceClient.storage.from(documentBucket).upload(storagePath,buffer,{
        contentType:file.type||'application/octet-stream',
        upsert:false
      });
      if(stored.error)throw stored.error;
      return NextResponse.json({
        document:{
          file_name:file.name,
          file_path:storagePath,
          mime_type:file.type||'application/octet-stream',
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
        mimeType:file.type||'application/octet-stream',
        buffer,
        folderParts
      });
      return NextResponse.json({
        document:{
          file_name:file.name,
          file_path:googleDrivePath(uploaded.fileId),
          mime_type:file.type||'application/octet-stream',
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
        mimeType:file.type||'application/octet-stream',
        buffer
      });
      return NextResponse.json({
        document:{
          file_name:file.name,
          file_path:googleDrivePath(uploaded.fileId),
          mime_type:file.type||'application/octet-stream',
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
      contentType:file.type||'application/octet-stream',
      upsert:false
    });
    if(stored.error)throw stored.error;
    return NextResponse.json({
      document:{
        file_name:file.name,
        file_path:storagePath,
        mime_type:file.type||'application/octet-stream',
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
    let file;
    if(await hasGoogleDriveOAuth(auth.user.id))file=await downloadOAuthAssetDocument(auth.user.id,doc.file_path);
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
    if(isGoogleDrivePath(doc.file_path)){
      if(await hasGoogleDriveOAuth(auth.user.id))await deleteOAuthAssetDocument(auth.user.id,doc.file_path);
      else await deleteAssetDocument(doc.file_path);
    }
    else{
      if(!url||!serviceRoleKey)return jsonError('Document service is not configured',500);
      const serviceClient=createClient(url,serviceRoleKey);
      const rm=await serviceClient.storage.from(documentBucket).remove([doc.file_path]);
      if(rm.error)throw rm.error;
    }
    const del=await auth.supabase.from('asset_documents').delete().eq('id',id);
    if(del.error)throw del.error;
    return NextResponse.json({ok:true});
  }catch(e:any){
    console.error('Document delete failed',e);
    return jsonError(e?.message||'Could not delete document',500,'DOCUMENT_DELETE_FAILED');
  }
}
