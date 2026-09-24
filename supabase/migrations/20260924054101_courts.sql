create table public.courts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null check (length(trim(name)) between 2 and 120),
  description text check (description is null or length(description) <= 1000),
  sport text not null check (length(trim(sport)) between 2 and 60),
  price_per_hour numeric(10,2) not null check (price_per_hour between 0 and 99999.99),
  status text not null default 'available' check (status in ('available', 'maintenance', 'inactive')),
  opening_time time without time zone not null,
  closing_time time without time zone not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courts_hours_valid check (
    opening_time < closing_time
    and extract(second from opening_time) = 0
    and extract(second from closing_time) = 0
  ),
  constraint courts_tenant_id_id_key unique (tenant_id, id)
);

create index courts_tenant_status_name_idx
  on public.courts (tenant_id, status, name);

alter table public.courts enable row level security;

revoke all on public.courts from public, anon, authenticated;
grant select on public.courts to authenticated;
grant insert (tenant_id, name, description, sport, price_per_hour, opening_time, closing_time, created_by)
  on public.courts to authenticated;
grant update (name, description, sport, price_per_hour, status, opening_time, closing_time, updated_at)
  on public.courts to authenticated;
grant all on public.courts to service_role;

create policy "courts_select_tenant_staff"
on public.courts for select to authenticated
using (
  tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid())
      and role in ('OWNER', 'MANAGER', 'RECEPTIONIST', 'COACH')
  )
);

create policy "courts_insert_tenant_managers"
on public.courts for insert to authenticated
with check (
  created_by = (select auth.uid())
  and tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid())
      and role in ('OWNER', 'MANAGER')
  )
);

create policy "courts_update_tenant_managers"
on public.courts for update to authenticated
using (
  tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid())
      and role in ('OWNER', 'MANAGER')
  )
)
with check (
  tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid())
      and role in ('OWNER', 'MANAGER')
  )
);
