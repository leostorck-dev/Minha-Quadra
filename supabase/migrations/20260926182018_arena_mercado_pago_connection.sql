-- Only server credentials may access OAuth secrets, including encrypted values.
create table public.arena_mp_connections (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  provider_user_id text not null check (provider_user_id ~ '^[0-9]+$'),
  credentials text not null check (credentials like 'v1.%'),
  expires_at timestamptz not null,
  connected_by uuid not null references auth.users(id),
  connected_at timestamptz not null,
  live_mode boolean not null
);

create table public.arena_mp_oauth_attempts (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  state_hash text not null unique,
  browser_hash text not null,
  verifier text not null check (verifier like 'v1.%'),
  expires_at timestamptz not null
);

alter table public.arena_mp_connections enable row level security;
alter table public.arena_mp_oauth_attempts enable row level security;
revoke all on public.arena_mp_connections from public, anon, authenticated;
revoke all on public.arena_mp_oauth_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.arena_mp_connections to service_role;
grant select, insert, update, delete on public.arena_mp_oauth_attempts to service_role;

create index arena_mp_connections_connected_by_idx on public.arena_mp_connections(connected_by);
create index arena_mp_oauth_attempts_owner_id_idx on public.arena_mp_oauth_attempts(owner_id);

comment on table public.arena_mp_connections is 'Server-only encrypted Mercado Pago OAuth credentials; does not enable online booking.';
comment on table public.arena_mp_oauth_attempts is 'One pending single-use OAuth attempt per arena; replaced on retry and consumed atomically.';;
