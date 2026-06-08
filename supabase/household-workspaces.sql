-- Household workspaces: primary/parent accounts with shared member access.
-- Run once in the Supabase SQL editor, after supabase/schema.sql.

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My Household',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workspaces_owner_unique
  on public.workspaces(owner_user_id);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'viewer'
    check (member_role in ('owner','editor','viewer','custom')),
  status text not null default 'active'
    check (status in ('active','suspended')),
  permissions jsonb not null default jsonb_build_object(
    'all_modules', true,
    'modules', '[]'::jsonb,
    'can_edit', false,
    'can_delete', false,
    'can_manage_members', false,
    'can_view_documents', true,
    'can_upload_documents', false
  ),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,user_id)
);

alter table public.accounts add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.records add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.asset_documents add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

create index if not exists workspace_members_user_idx on public.workspace_members(user_id);
create index if not exists workspace_members_workspace_idx on public.workspace_members(workspace_id);
create index if not exists accounts_workspace_idx on public.accounts(workspace_id);
create index if not exists records_workspace_module_idx on public.records(workspace_id,module_key);
create index if not exists asset_documents_workspace_idx on public.asset_documents(workspace_id);

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at before update on public.workspaces
for each row execute function public.set_updated_at();
drop trigger if exists workspace_members_set_updated_at on public.workspace_members;
create trigger workspace_members_set_updated_at before update on public.workspace_members
for each row execute function public.set_updated_at();

do $$
declare
  uid uuid;
  wid uuid;
begin
  for uid in
    select distinct user_id from public.accounts
    union select distinct user_id from public.records
    union select distinct user_id from public.asset_documents
    union select id from public.profiles
  loop
    insert into public.workspaces(owner_user_id,name)
    values(uid,'My Household')
    on conflict(owner_user_id) do update set owner_user_id=excluded.owner_user_id
    returning id into wid;

    if wid is null then
      select id into wid from public.workspaces where owner_user_id=uid;
    end if;

    insert into public.workspace_members(
      workspace_id,user_id,member_role,status,permissions,invited_by
    ) values(
      wid,uid,'owner','active',
      jsonb_build_object(
        'all_modules',true,
        'modules','[]'::jsonb,
        'can_edit',true,
        'can_delete',true,
        'can_manage_members',true,
        'can_view_documents',true,
        'can_upload_documents',true
      ),
      uid
    ) on conflict(workspace_id,user_id) do nothing;

    update public.accounts set workspace_id=wid where user_id=uid and workspace_id is null;
    update public.records set workspace_id=wid where user_id=uid and workspace_id is null;
    update public.asset_documents set workspace_id=wid where user_id=uid and workspace_id is null;
  end loop;
end $$;

alter table public.accounts alter column workspace_id set not null;
alter table public.records alter column workspace_id set not null;
alter table public.asset_documents alter column workspace_id set not null;

create or replace function public.workspace_access(target_workspace uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  select case
    when w.owner_user_id=auth.uid() then jsonb_build_object(
      'member_role','owner','status','active','all_modules',true,
      'modules','[]'::jsonb,'can_edit',true,'can_delete',true,
      'can_manage_members',true,'can_view_documents',true,'can_upload_documents',true
    )
    else jsonb_build_object(
      'member_role',m.member_role,'status',m.status,
      'all_modules',coalesce((m.permissions->>'all_modules')::boolean,false),
      'modules',coalesce(m.permissions->'modules','[]'::jsonb),
      'can_edit',coalesce((m.permissions->>'can_edit')::boolean,false),
      'can_delete',coalesce((m.permissions->>'can_delete')::boolean,false),
      'can_manage_members',coalesce((m.permissions->>'can_manage_members')::boolean,false),
      'can_view_documents',coalesce((m.permissions->>'can_view_documents')::boolean,false),
      'can_upload_documents',coalesce((m.permissions->>'can_upload_documents')::boolean,false)
    ) end
  from public.workspaces w
  left join public.workspace_members m
    on m.workspace_id=w.id and m.user_id=auth.uid()
  where w.id=target_workspace
    and (w.owner_user_id=auth.uid() or m.status='active')
  limit 1;
$$;

create or replace function public.can_view_workspace(target_workspace uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.workspace_access(target_workspace) is not null;
$$;

create or replace function public.can_view_workspace_module(target_workspace uuid,target_module text)
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(
    (public.workspace_access(target_workspace)->>'all_modules')::boolean
    or (public.workspace_access(target_workspace)->'modules') ? target_module,
    false
  );
$$;

create or replace function public.can_edit_workspace(target_workspace uuid,target_module text default null)
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(
    (public.workspace_access(target_workspace)->>'can_edit')::boolean
    and (target_module is null or public.can_view_workspace_module(target_workspace,target_module)),
    false
  );
$$;

create or replace function public.can_delete_workspace(target_workspace uuid,target_module text default null)
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(
    (public.workspace_access(target_workspace)->>'can_delete')::boolean
    and (target_module is null or public.can_view_workspace_module(target_workspace,target_module)),
    false
  );
$$;

create or replace function public.can_manage_workspace(target_workspace uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(
    (public.workspace_access(target_workspace)->>'can_manage_members')::boolean,
    false
  );
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

drop policy if exists "workspaces_read_members" on public.workspaces;
create policy "workspaces_read_members" on public.workspaces for select to authenticated
using (public.can_view_workspace(id));
drop policy if exists "workspaces_update_owner" on public.workspaces;
create policy "workspaces_update_owner" on public.workspaces for update to authenticated
using (owner_user_id=auth.uid()) with check (owner_user_id=auth.uid());

drop policy if exists "workspace_members_read_members" on public.workspace_members;
create policy "workspace_members_read_members" on public.workspace_members for select to authenticated
using (user_id=auth.uid() or public.can_manage_workspace(workspace_id));

drop policy if exists "accounts_select_own" on public.accounts;
drop policy if exists "accounts_insert_own" on public.accounts;
drop policy if exists "accounts_update_own" on public.accounts;
drop policy if exists "accounts_delete_admin_own" on public.accounts;
drop policy if exists "accounts_workspace_select" on public.accounts;
drop policy if exists "accounts_workspace_insert" on public.accounts;
drop policy if exists "accounts_workspace_update" on public.accounts;
drop policy if exists "accounts_workspace_delete" on public.accounts;
create policy "accounts_workspace_select" on public.accounts for select to authenticated
using (public.can_view_workspace_module(workspace_id,'accounts'));
create policy "accounts_workspace_insert" on public.accounts for insert to authenticated
with check (public.can_edit_workspace(workspace_id,'accounts'));
create policy "accounts_workspace_update" on public.accounts for update to authenticated
using (public.can_edit_workspace(workspace_id,'accounts')) with check (public.can_edit_workspace(workspace_id,'accounts'));
create policy "accounts_workspace_delete" on public.accounts for delete to authenticated
using (public.can_delete_workspace(workspace_id,'accounts'));

drop policy if exists "records_select_own" on public.records;
drop policy if exists "records_insert_own" on public.records;
drop policy if exists "records_update_own" on public.records;
drop policy if exists "records_delete_admin_own" on public.records;
drop policy if exists "records_workspace_select" on public.records;
drop policy if exists "records_workspace_insert" on public.records;
drop policy if exists "records_workspace_update" on public.records;
drop policy if exists "records_workspace_delete" on public.records;
create policy "records_workspace_select" on public.records for select to authenticated
using (public.can_view_workspace_module(workspace_id,module_key));
create policy "records_workspace_insert" on public.records for insert to authenticated
with check (public.can_edit_workspace(workspace_id,module_key));
create policy "records_workspace_update" on public.records for update to authenticated
using (public.can_edit_workspace(workspace_id,module_key))
with check (public.can_edit_workspace(workspace_id,module_key));
create policy "records_workspace_delete" on public.records for delete to authenticated
using (public.can_delete_workspace(workspace_id,module_key));

drop policy if exists "asset_documents_select_own" on public.asset_documents;
drop policy if exists "asset_documents_insert_own" on public.asset_documents;
drop policy if exists "asset_documents_update_own" on public.asset_documents;
drop policy if exists "asset_documents_delete_own" on public.asset_documents;
drop policy if exists "asset_documents_workspace_select" on public.asset_documents;
drop policy if exists "asset_documents_workspace_insert" on public.asset_documents;
drop policy if exists "asset_documents_workspace_update" on public.asset_documents;
drop policy if exists "asset_documents_workspace_delete" on public.asset_documents;
create policy "asset_documents_workspace_select" on public.asset_documents for select to authenticated
using (
  public.can_view_workspace_module(workspace_id,module_key)
  and coalesce((public.workspace_access(workspace_id)->>'can_view_documents')::boolean,false)
);
create policy "asset_documents_workspace_insert" on public.asset_documents for insert to authenticated
with check (
  public.can_edit_workspace(workspace_id,module_key)
  and coalesce((public.workspace_access(workspace_id)->>'can_upload_documents')::boolean,false)
);
create policy "asset_documents_workspace_update" on public.asset_documents for update to authenticated
using (public.can_edit_workspace(workspace_id,module_key))
with check (public.can_edit_workspace(workspace_id,module_key));
create policy "asset_documents_workspace_delete" on public.asset_documents for delete to authenticated
using (public.can_delete_workspace(workspace_id,module_key));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  assigned_role text;
  new_workspace uuid;
begin
  assigned_role := case when not exists (select 1 from public.user_roles where access_role='admin') then 'admin' else 'normal' end;
  insert into public.profiles(id,email,full_name) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name','')) on conflict(id) do nothing;
  insert into public.user_roles(user_id,access_role) values(new.id,assigned_role) on conflict(user_id) do nothing;
  insert into public.workspaces(owner_user_id,name)
    values(new.id,coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'My') || ' Household')
    returning id into new_workspace;
  insert into public.workspace_members(workspace_id,user_id,member_role,status,permissions,invited_by)
    values(new_workspace,new.id,'owner','active',
      jsonb_build_object(
        'all_modules',true,'modules','[]'::jsonb,'can_edit',true,'can_delete',true,
        'can_manage_members',true,'can_view_documents',true,'can_upload_documents',true
      ),new.id);
  return new;
end; $$;
