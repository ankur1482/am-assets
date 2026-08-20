-- Allow 'kotak' as a stored credential provider alongside upstox/google-drive.
-- Run once in the Supabase SQL editor, after supabase/schema.sql.
alter table public.oauth_credentials drop constraint if exists oauth_credentials_provider_check;
alter table public.oauth_credentials add constraint oauth_credentials_provider_check
  check (provider in ('upstox','google-drive','kotak'));
