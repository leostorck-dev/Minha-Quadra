create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null check (length(trim(name)) between 2 and 120),
  phone text check (phone is null or length(trim(phone)) between 8 and 20),
  email text check (email is null or length(email) <= 254),
  birth_date date,
  notes text check (notes is null or length(notes) <= 2000),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_contact_required check (phone is not null or email is not null),
  constraint customers_tenant_id_id_key unique (tenant_id, id)
);

create index customers_tenant_created_idx
  on public.customers (tenant_id, created_at desc);

alter table public.customers enable row level security;

revoke all on public.customers from public, anon, authenticated;
grant select on public.customers to authenticated;
grant insert (tenant_id, name, phone, email, birth_date, notes, created_by)
  on public.customers to authenticated;
grant update (name, phone, email, birth_date, notes, status, updated_at)
  on public.customers to authenticated;
grant all on public.customers to service_role;

create policy "customers_select_tenant_staff"
on public.customers for select to authenticated
using (
  tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid())
      and role in ('OWNER', 'MANAGER', 'RECEPTIONIST')
  )
);

create policy "customers_insert_tenant_staff"
on public.customers for insert to authenticated
with check (
  created_by = (select auth.uid())
  and tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid())
      and role in ('OWNER', 'MANAGER', 'RECEPTIONIST')
  )
);

create policy "customers_update_tenant_staff"
on public.customers for update to authenticated
using (
  tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid())
      and role in ('OWNER', 'MANAGER', 'RECEPTIONIST')
  )
)
with check (
  tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid())
      and role in ('OWNER', 'MANAGER', 'RECEPTIONIST')
  )
);
