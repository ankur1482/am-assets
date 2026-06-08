import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;

function missingEnv(){
  if(!url||!anonKey||!serviceKey)return NextResponse.json({
    error:'Admin console is not configured on this server. Add SUPABASE_SERVICE_ROLE_KEY to the deployment environment and redeploy.',
    code:'SUPABASE_ADMIN_ENV_MISSING'
  },{status:500});
  return null;
}

async function requireAdmin(req:NextRequest){
  const envError=missingEnv();
  if(envError)return {error:envError};
  const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(!token)return {error:NextResponse.json({error:'Missing authorization token'},{status:401})};
  const userClient=createClient(url!,anonKey!,{global:{headers:{Authorization:`Bearer ${token}`}}});
  const serviceClient=createClient(url!,serviceKey!,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:{user},error:userError}=await userClient.auth.getUser();
  if(userError||!user)return {error:NextResponse.json({error:'Invalid session'},{status:401})};
  const {data:role,error:roleError}=await serviceClient.from('user_roles').select('access_role').eq('user_id',user.id).maybeSingle();
  if(roleError||role?.access_role!=='admin')return {error:NextResponse.json({error:'Admin access required'},{status:403})};
  return {user,serviceClient};
}

async function listAllAuthUsers(serviceClient:any){
  const users:any[]=[];
  for(let page=1;;page++){
    const {data,error}=await serviceClient.auth.admin.listUsers({page,perPage:100});
    if(error)throw error;
    users.push(...(data?.users||[]));
    if(!data?.users?.length||data.users.length<100)break;
  }
  return users;
}

export async function GET(req:NextRequest){
  try{
    const auth=await requireAdmin(req);
    if(auth.error)return auth.error;
    const {serviceClient}=auth;
    const [authUsers,profilesRes,rolesRes,accountsRes,recordsRes]=await Promise.all([
      listAllAuthUsers(serviceClient),
      serviceClient.from('profiles').select('id,email,full_name,city,phone,created_at,updated_at'),
      serviceClient.from('user_roles').select('user_id,access_role,updated_at'),
      serviceClient.from('accounts').select('user_id'),
      serviceClient.from('records').select('user_id,module_key')
    ]);
    if(profilesRes.error)throw profilesRes.error;
    if(rolesRes.error)throw rolesRes.error;
    if(accountsRes.error)throw accountsRes.error;
    if(recordsRes.error)throw recordsRes.error;
    const profiles=new Map((profilesRes.data||[]).map((p:any)=>[p.id,p]));
    const roles=new Map((rolesRes.data||[]).map((r:any)=>[r.user_id,r]));
    const accountCounts=(accountsRes.data||[]).reduce((m:any,r:any)=>({...m,[r.user_id]:(m[r.user_id]||0)+1}),{});
    const recordCounts=(recordsRes.data||[]).reduce((m:any,r:any)=>({...m,[r.user_id]:(m[r.user_id]||0)+1}),{});
    const moduleCounts=(recordsRes.data||[]).reduce((m:any,r:any)=>{m[r.user_id]||={};m[r.user_id][r.module_key]=(m[r.user_id][r.module_key]||0)+1;return m},{});
    const users=authUsers.map((u:any)=>{
      const p:any=profiles.get(u.id)||{},r:any=roles.get(u.id)||{};
      return {id:u.id,email:p.email||u.email||'',full_name:p.full_name||'',city:p.city||'',phone:p.phone||'',role:r.access_role||'normal',created_at:u.created_at,last_sign_in_at:u.last_sign_in_at,email_confirmed_at:u.email_confirmed_at,banned_until:u.banned_until,accounts_count:accountCounts[u.id]||0,records_count:recordCounts[u.id]||0,module_counts:moduleCounts[u.id]||{}};
    });
    return NextResponse.json({users});
  }catch(e:any){
    return NextResponse.json({error:e?.message||'Admin request failed'},{status:500});
  }
}

export async function POST(req:NextRequest){
  try{
    const auth=await requireAdmin(req);
    if(auth.error)return auth.error;
    const {user:adminUser,serviceClient}=auth;
    const body=await req.json();
    const action=String(body.action||''),targetUserId=String(body.userId||'');
    if(!action||!targetUserId)return NextResponse.json({error:'Action and userId are required'},{status:400});
    if(action==='deleteUser'&&targetUserId===adminUser.id)return NextResponse.json({error:'You cannot delete your own signed-in admin account'},{status:400});
    const {data:targetRole}=await serviceClient.from('user_roles').select('access_role').eq('user_id',targetUserId).maybeSingle();
    if((action==='deleteUser'||action==='setRole')&&targetRole?.access_role==='admin'){
      const {count,error}=await serviceClient.from('user_roles').select('user_id',{count:'exact',head:true}).eq('access_role','admin');
      if(error)throw error;
      if((count||0)<=1&&(action==='deleteUser'||body.role!=='admin'))return NextResponse.json({error:'Keep at least one admin account active'},{status:400});
    }
    if(action==='setRole'){
      const role=body.role==='admin'?'admin':'normal';
      const {error}=await serviceClient.from('user_roles').upsert({user_id:targetUserId,access_role:role});
      if(error)throw error;
      return NextResponse.json({ok:true,message:`Role changed to ${role}`});
    }
    if(action==='updateProfile'){
      const payload={id:targetUserId,email:String(body.email||''),full_name:String(body.full_name||''),city:String(body.city||''),phone:String(body.phone||'')};
      const {error}=await serviceClient.from('profiles').upsert(payload);
      if(error)throw error;
      return NextResponse.json({ok:true,message:'Profile updated'});
    }
    if(action==='resetPassword'){
      const email=String(body.email||'');
      if(!email)return NextResponse.json({error:'Email is required for password reset'},{status:400});
      const redirectTo=body.redirectTo||`${process.env.NEXT_PUBLIC_APP_URL||'https://am-assets.vercel.app'}/`;
      const {data,error}=await serviceClient.auth.admin.generateLink({type:'recovery',email,options:{redirectTo}});
      if(error)throw error;
      return NextResponse.json({ok:true,message:'Password reset link generated',action_link:data?.properties?.action_link});
    }
    if(action==='banUser'||action==='unbanUser'){
      const ban_duration=action==='banUser'?'876000h':'none';
      const {error}=await serviceClient.auth.admin.updateUserById(targetUserId,{ban_duration} as any);
      if(error)throw error;
      return NextResponse.json({ok:true,message:action==='banUser'?'User disabled':'User enabled'});
    }
    if(action==='deleteUser'){
      const {error}=await serviceClient.auth.admin.deleteUser(targetUserId);
      if(error)throw error;
      return NextResponse.json({ok:true,message:'User deleted'});
    }
    return NextResponse.json({error:'Unknown admin action'},{status:400});
  }catch(e:any){
    return NextResponse.json({error:e?.message||'Admin action failed'},{status:500});
  }
}
