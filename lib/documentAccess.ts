import {NextRequest,NextResponse} from 'next/server';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {MONTHLY_UPLOAD_MODULE} from '@/lib/monthlyUploads';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function jsonError(message:string,status=500,code?:string){
  return NextResponse.json({error:message,code},{status});
}

export async function requireUser(req:NextRequest){
  if(!url||!anonKey)return {error:jsonError('Missing Supabase server env vars',500,'SUPABASE_ENV_MISSING')};
  const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(!token)return {error:jsonError('Missing authorization token',401)};
  const supabase=createClient(url,anonKey,{global:{headers:{Authorization:`Bearer ${token}`}}});
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return {error:jsonError('Invalid session',401)};
  return {user,supabase};
}

/** What the signed-in person may do in a household, or null when they are not in it. */
export async function householdAccess(supabase:SupabaseClient,workspaceId:string){
  const {data,error}=await supabase.rpc('workspace_access',{target_workspace:workspaceId});
  if(error)throw error;
  return data as {can_upload_documents?:boolean;can_edit?:boolean;can_delete?:boolean;all_modules?:boolean;modules?:string[]}|null;
}

export function mayUpload(access:Awaited<ReturnType<typeof householdAccess>>,moduleKey:string){
  return !!access?.can_upload_documents&&!!access.can_edit&&(!!access.all_modules||!!access.modules?.includes(moduleKey));
}

/** Household documents are kept in the owner's Google Drive, whoever adds them, so nothing is lost if a member leaves. */
export async function householdOwner(supabase:SupabaseClient,workspaceId:string){
  const {data,error}=await supabase.from('workspaces').select('owner_user_id').eq('id',workspaceId).maybeSingle();
  if(error)throw error;
  return String((data as {owner_user_id?:string}|null)?.owner_user_id||'');
}

/** Monthly documents lock the app when overdue, so they must save even when Google Drive cannot be used. */
export const mayUseAppStorage=(moduleKey:string)=>moduleKey===MONTHLY_UPLOAD_MODULE;

export function driveNotConnected(ownerId:string,userId:string){
  return ownerId===userId
    ?jsonError('Connect Google Drive and try again.',409,'GOOGLE_DRIVE_NOT_CONNECTED')
    :jsonError('Google Drive is not connected for this household. Ask the household owner to connect it.',409,'HOUSEHOLD_DRIVE_NOT_CONNECTED');
}
