-- MQ-009 a MQ-013. O proprietário autorizou remover o esquema Prisma anterior.
-- A ordem explícita evita CASCADE sobre objetos inesperados.
drop table if exists public."ItemComanda";
drop table if exists public."Matricula";
drop table if exists public."Comanda";
drop table if exists public."Reserva";
drop table if exists public."Turma";
drop table if exists public."Produto";
drop table if exists public."Quadra";
drop table if exists public."Usuario";
drop table if exists public."Arena";
drop table if exists public."_prisma_migrations";

drop type if exists public."PapelUsuario";
drop type if exists public."StatusComanda";
drop type if exists public."StatusMatricula";
drop type if exists public."StatusReserva";

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null check (length(trim(name)) between 2 and 120),
  email text not null,
  role text not null check (role in ('OWNER', 'MANAGER', 'RECEPTIONIST', 'COACH')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_tenant_id_idx on public.profiles (tenant_id);

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;

revoke all on public.tenants, public.profiles from public, anon, authenticated;
grant select on public.tenants, public.profiles to authenticated;
grant all on public.tenants, public.profiles to service_role;

create policy "profiles_select_self"
on public.profiles for select to authenticated
using (id = (select auth.uid()));

create policy "tenants_select_own"
on public.tenants for select to authenticated
using (
  id in (
    select tenant_id from public.profiles
    where id = (select auth.uid())
  )
);
