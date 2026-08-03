-- Apply this migration before deploying the server-side OAuth credential code.
create table if not exists public.oauth_credentials (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('upstox','google-drive')),
  encrypted_value text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id,provider)
);

create index if not exists idx_oauth_credentials_user_id on public.oauth_credentials(user_id);

drop trigger if exists oauth_credentials_set_updated_at on public.oauth_credentials;
create trigger oauth_credentials_set_updated_at
before update on public.oauth_credentials
for each row execute function public.set_updated_at();

alter table public.oauth_credentials enable row level security;

-- Intentionally no authenticated/anon policies. Only the service role can read
-- encrypted provider credentials after an API route validates the Supabase user.
