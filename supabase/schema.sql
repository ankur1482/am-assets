-- Asset Manager Cloud: Supabase schema
-- Run this in Supabase SQL Editor once.
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text default '',
  city text default '',
  phone text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_role text not null default 'normal' check (access_role in ('admin','normal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relation text default 'Other',
  type text default 'Other',
  institution text default '',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_key text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id uuid not null references public.records(id) on delete cascade,
  module_key text not null,
  file_name text not null,
  file_path text not null,
  mime_type text default '',
  file_size bigint default 0,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_accounts_user_id on public.accounts(user_id);
create index if not exists idx_records_user_id on public.records(user_id);
create index if not exists idx_records_user_module on public.records(user_id,module_key);
create index if not exists idx_records_data_gin on public.records using gin(data);
create index if not exists idx_asset_documents_user_id on public.asset_documents(user_id);
create index if not exists idx_asset_documents_record_id on public.asset_documents(record_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists user_roles_set_updated_at on public.user_roles;
create trigger user_roles_set_updated_at before update on public.user_roles for each row execute function public.set_updated_at();
drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at before update on public.accounts for each row execute function public.set_updated_at();
drop trigger if exists records_set_updated_at on public.records;
create trigger records_set_updated_at before update on public.records for each row execute function public.set_updated_at();
drop trigger if exists asset_documents_set_updated_at on public.asset_documents;
create trigger asset_documents_set_updated_at before update on public.asset_documents for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and access_role = 'admin');
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare assigned_role text;
begin
  assigned_role := case when not exists (select 1 from public.user_roles where access_role='admin') then 'admin' else 'normal' end;
  insert into public.profiles(id,email,full_name) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name','')) on conflict(id) do nothing;
  insert into public.user_roles(user_id,access_role) values(new.id,assigned_role) on conflict(user_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created_asset_manager on auth.users;
create trigger on_auth_user_created_asset_manager after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.accounts enable row level security;
alter table public.records enable row level security;
alter table public.asset_documents enable row level security;

insert into storage.buckets (id, name, public, file_size_limit)
values ('asset-documents', 'asset-documents', false, 52428800)
on conflict (id) do nothing;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles for select to authenticated using (((select auth.uid()) = id) or public.is_admin());
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles for update to authenticated using (((select auth.uid()) = id) or public.is_admin()) with check (((select auth.uid()) = id) or public.is_admin());

drop policy if exists "roles_select_own_or_admin" on public.user_roles;
create policy "roles_select_own_or_admin" on public.user_roles for select to authenticated using (((select auth.uid()) = user_id) or public.is_admin());
drop policy if exists "roles_update_admin" on public.user_roles;
create policy "roles_update_admin" on public.user_roles for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "accounts_select_own" on public.accounts;
create policy "accounts_select_own" on public.accounts for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "accounts_insert_own" on public.accounts;
create policy "accounts_insert_own" on public.accounts for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "accounts_update_own" on public.accounts;
create policy "accounts_update_own" on public.accounts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "accounts_delete_admin_own" on public.accounts;
create policy "accounts_delete_admin_own" on public.accounts for delete to authenticated using ((select auth.uid()) = user_id and public.is_admin());

drop policy if exists "records_select_own" on public.records;
create policy "records_select_own" on public.records for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "records_insert_own" on public.records;
create policy "records_insert_own" on public.records for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "records_update_own" on public.records;
create policy "records_update_own" on public.records for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "records_delete_admin_own" on public.records;
create policy "records_delete_admin_own" on public.records for delete to authenticated using ((select auth.uid()) = user_id and public.is_admin());

drop policy if exists "asset_documents_select_own" on public.asset_documents;
create policy "asset_documents_select_own" on public.asset_documents for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "asset_documents_insert_own" on public.asset_documents;
create policy "asset_documents_insert_own" on public.asset_documents for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "asset_documents_update_own" on public.asset_documents;
create policy "asset_documents_update_own" on public.asset_documents for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "asset_documents_delete_own" on public.asset_documents;
create policy "asset_documents_delete_own" on public.asset_documents for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "asset_documents_storage_select_own" on storage.objects;
create policy "asset_documents_storage_select_own" on storage.objects for select to authenticated using (bucket_id = 'asset-documents' and owner = (select auth.uid()));
drop policy if exists "asset_documents_storage_insert_own" on storage.objects;
create policy "asset_documents_storage_insert_own" on storage.objects for insert to authenticated with check (bucket_id = 'asset-documents' and owner = (select auth.uid()));
drop policy if exists "asset_documents_storage_update_own" on storage.objects;
create policy "asset_documents_storage_update_own" on storage.objects for update to authenticated using (bucket_id = 'asset-documents' and owner = (select auth.uid())) with check (bucket_id = 'asset-documents' and owner = (select auth.uid()));
drop policy if exists "asset_documents_storage_delete_own" on storage.objects;
create policy "asset_documents_storage_delete_own" on storage.objects for delete to authenticated using (bucket_id = 'asset-documents' and owner = (select auth.uid()));
