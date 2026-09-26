create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null check (length(btrim(name)) between 3 and 120),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint tournaments_date_order check (ends_on >= starts_on),
  constraint tournaments_tenant_id_id_key unique (tenant_id, id)
);
create index tournaments_tenant_starts_idx
  on public.tournaments (tenant_id, starts_on desc);
create index tournaments_created_by_idx on public.tournaments (created_by);

create table public.tournament_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  tournament_id uuid not null,
  name text not null check (name in ('Iniciante', 'C', 'B', 'A', 'Open', 'Mista')),
  constraint tournament_categories_tournament_fk foreign key (tenant_id, tournament_id)
    references public.tournaments(tenant_id, id) on delete restrict,
  constraint tournament_categories_name_key unique (tournament_id, name),
  constraint tournament_categories_tenant_tournament_id_key
    unique (tenant_id, tournament_id, id)
);
create index tournament_categories_tenant_tournament_idx
  on public.tournament_categories (tenant_id, tournament_id);

create table public.tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  tournament_id uuid not null,
  category_id uuid not null,
  status text not null default 'registered' check (status in ('registered', 'withdrawn')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  withdrawn_by uuid references auth.users(id) on delete restrict,
  withdrawn_at timestamptz,
  constraint tournament_teams_category_fk foreign key (tenant_id, tournament_id, category_id)
    references public.tournament_categories(tenant_id, tournament_id, id) on delete restrict,
  constraint tournament_teams_withdraw_shape check (
    (status = 'registered' and withdrawn_by is null and withdrawn_at is null)
    or (status = 'withdrawn' and withdrawn_by is not null and withdrawn_at is not null)
  ),
  constraint tournament_teams_scope_key unique (tenant_id, tournament_id, category_id, id)
);
create index tournament_teams_tenant_tournament_category_idx
  on public.tournament_teams (tenant_id, tournament_id, category_id, created_at);
create index tournament_teams_created_by_idx on public.tournament_teams (created_by);
create index tournament_teams_withdrawn_by_idx on public.tournament_teams (withdrawn_by);

create table public.tournament_team_members (
  team_id uuid not null,
  position integer not null check (position in (1, 2)),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  tournament_id uuid not null,
  category_id uuid not null,
  customer_id uuid not null,
  active boolean not null default true,
  primary key (team_id, position),
  constraint tournament_members_team_fk foreign key
    (tenant_id, tournament_id, category_id, team_id)
    references public.tournament_teams(tenant_id, tournament_id, category_id, id)
    on delete restrict,
  constraint tournament_members_customer_fk foreign key (tenant_id, customer_id)
    references public.customers(tenant_id, id) on delete restrict
);
create unique index tournament_members_one_active_category_idx
  on public.tournament_team_members (category_id, customer_id) where active;
create index tournament_members_scope_team_idx
  on public.tournament_team_members (tenant_id, tournament_id, category_id, team_id);
create index tournament_members_tenant_customer_idx
  on public.tournament_team_members (tenant_id, customer_id);

alter table public.tournaments enable row level security;
alter table public.tournament_categories enable row level security;
alter table public.tournament_teams enable row level security;
alter table public.tournament_team_members enable row level security;
revoke all on public.tournaments, public.tournament_categories,
  public.tournament_teams, public.tournament_team_members from public, anon, authenticated;
grant select on public.tournaments, public.tournament_categories,
  public.tournament_teams, public.tournament_team_members to authenticated;
grant all on public.tournaments, public.tournament_categories,
  public.tournament_teams, public.tournament_team_members to service_role;

create policy tournaments_read_staff on public.tournaments for select to authenticated using (
  tenant_id = (select tenant_id from public.profiles
    where id = (select auth.uid()) and role in ('OWNER', 'MANAGER', 'RECEPTIONIST'))
);
create policy tournament_categories_read_staff on public.tournament_categories
  for select to authenticated using (
    tenant_id = (select tenant_id from public.profiles
      where id = (select auth.uid()) and role in ('OWNER', 'MANAGER', 'RECEPTIONIST'))
  );
create policy tournament_teams_read_staff on public.tournament_teams
  for select to authenticated using (
    tenant_id = (select tenant_id from public.profiles
      where id = (select auth.uid()) and role in ('OWNER', 'MANAGER', 'RECEPTIONIST'))
  );
create policy tournament_members_read_staff on public.tournament_team_members
  for select to authenticated using (
    tenant_id = (select tenant_id from public.profiles
      where id = (select auth.uid()) and role in ('OWNER', 'MANAGER', 'RECEPTIONIST'))
  );

create function private.tournament_staff_tenant()
returns uuid language sql stable security definer set search_path = '' as $$
  select tenant_id from public.profiles where id = (select auth.uid())
    and role in ('OWNER', 'MANAGER', 'RECEPTIONIST')
$$;
create function private.tournament_manager_tenant()
returns uuid language sql stable security definer set search_path = '' as $$
  select tenant_id from public.profiles where id = (select auth.uid())
    and role in ('OWNER', 'MANAGER')
$$;
revoke all on function private.tournament_staff_tenant(),
  private.tournament_manager_tenant() from public, anon, authenticated;

create function private.create_tournament(
  p_name text, p_starts_on date, p_ends_on date, p_categories text[]
) returns public.tournaments
language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
  v_result public.tournaments;
  v_today date;
begin
  v_tenant := private.tournament_manager_tenant();
  if v_tenant is null then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  select (now() at time zone timezone)::date into v_today
    from public.tenants where id = v_tenant;
  if p_name is null or length(btrim(p_name)) not between 3 and 120
    or p_starts_on is null or p_ends_on is null
    or p_starts_on < v_today or p_ends_on < p_starts_on then
    raise exception 'Dados do torneio inválidos.' using errcode = '22023';
  end if;
  if p_categories is null or cardinality(p_categories) not between 1 and 6
    or exists (select 1 from unnest(p_categories) as name
      where name is null or name not in ('Iniciante', 'C', 'B', 'A', 'Open', 'Mista'))
    or (select count(distinct name) from unnest(p_categories) as name)
      <> cardinality(p_categories) then
    raise exception 'Categorias inválidas ou repetidas.' using errcode = '22023';
  end if;
  insert into public.tournaments (tenant_id, name, starts_on, ends_on, created_by)
    values (v_tenant, btrim(p_name), p_starts_on, p_ends_on, auth.uid())
    returning * into v_result;
  insert into public.tournament_categories (tenant_id, tournament_id, name)
    select v_tenant, v_result.id, name from unnest(p_categories) as name;
  return v_result;
end; $$;

create function private.set_tournament_status(p_id uuid, p_status text)
returns public.tournaments
language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
  v_result public.tournaments;
  v_today date;
begin
  v_tenant := private.tournament_manager_tenant();
  if v_tenant is null then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  select * into v_result from public.tournaments
    where id = p_id and tenant_id = v_tenant for update;
  if not found then raise exception 'Torneio não encontrado.' using errcode = 'P0002'; end if;
  select (now() at time zone timezone)::date into v_today
    from public.tenants where id = v_tenant;
  if not (
    (p_status = 'open' and v_result.status in ('draft', 'closed')
      and v_result.starts_on >= v_today)
    or (p_status = 'closed' and v_result.status = 'open')
  ) then raise exception 'Transição de inscrições inválida.' using errcode = '22023'; end if;
  update public.tournaments set status = p_status where id = p_id returning * into v_result;
  return v_result;
end; $$;

create function private.register_tournament_team(
  p_tournament_id uuid, p_category_id uuid, p_customer_ids uuid[]
) returns public.tournament_teams
language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
  v_tournament public.tournaments;
  v_result public.tournament_teams;
  v_today date;
begin
  v_tenant := private.tournament_staff_tenant();
  if v_tenant is null then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  select * into v_tournament from public.tournaments
    where id = p_tournament_id and tenant_id = v_tenant for update;
  if not found then raise exception 'Torneio não encontrado.' using errcode = 'P0002'; end if;
  select (now() at time zone timezone)::date into v_today
    from public.tenants where id = v_tenant;
  if v_tournament.status <> 'open' or v_tournament.starts_on < v_today then
    raise exception 'Inscrições não estão abertas.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.tournament_categories
    where id = p_category_id and tenant_id = v_tenant
      and tournament_id = p_tournament_id) then
    raise exception 'Categoria inválida para o torneio.' using errcode = '22023';
  end if;
  if p_customer_ids is null or cardinality(p_customer_ids) <> 2
    or p_customer_ids[1] is null or p_customer_ids[2] is null
    or p_customer_ids[1] = p_customer_ids[2]
    or (select count(*) from public.customers
      where id = any(p_customer_ids) and tenant_id = v_tenant and status = 'active') <> 2 then
    raise exception 'Escolha dois clientes ativos e distintos da arena.' using errcode = '22023';
  end if;
  insert into public.tournament_teams
    (tenant_id, tournament_id, category_id, created_by)
    values (v_tenant, p_tournament_id, p_category_id, auth.uid())
    returning * into v_result;
  insert into public.tournament_team_members
    (team_id, position, tenant_id, tournament_id, category_id, customer_id)
    values
      (v_result.id, 1, v_tenant, p_tournament_id, p_category_id, p_customer_ids[1]),
      (v_result.id, 2, v_tenant, p_tournament_id, p_category_id, p_customer_ids[2]);
  return v_result;
end; $$;

create function private.withdraw_tournament_team(p_tournament_id uuid, p_team_id uuid)
returns public.tournament_teams
language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
  v_tournament public.tournaments;
  v_result public.tournament_teams;
begin
  v_tenant := private.tournament_staff_tenant();
  if v_tenant is null then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  select * into v_tournament from public.tournaments
    where id = p_tournament_id and tenant_id = v_tenant for update;
  if not found then raise exception 'Torneio não encontrado.' using errcode = 'P0002'; end if;
  if v_tournament.status <> 'open' then
    raise exception 'Inscrições não estão abertas.' using errcode = '22023';
  end if;
  update public.tournament_teams
    set status = 'withdrawn', withdrawn_by = auth.uid(), withdrawn_at = now()
    where id = p_team_id and tournament_id = p_tournament_id
      and tenant_id = v_tenant and status = 'registered'
    returning * into v_result;
  if not found then raise exception 'Dupla inscrita não encontrada.' using errcode = 'P0002'; end if;
  update public.tournament_team_members set active = false
    where team_id = p_team_id and tenant_id = v_tenant;
  return v_result;
end; $$;

revoke all on function private.create_tournament(text,date,date,text[]),
  private.set_tournament_status(uuid,text),
  private.register_tournament_team(uuid,uuid,uuid[]),
  private.withdraw_tournament_team(uuid,uuid) from public, anon, authenticated;
grant execute on function private.create_tournament(text,date,date,text[]),
  private.set_tournament_status(uuid,text),
  private.register_tournament_team(uuid,uuid,uuid[]),
  private.withdraw_tournament_team(uuid,uuid) to authenticated;

create function public.create_tournament(
  p_name text, p_starts_on date, p_ends_on date, p_categories text[]
) returns public.tournaments language sql security invoker set search_path = '' as $$
  select private.create_tournament(p_name, p_starts_on, p_ends_on, p_categories)
$$;
create function public.set_tournament_status(p_id uuid, p_status text)
returns public.tournaments language sql security invoker set search_path = '' as $$
  select private.set_tournament_status(p_id, p_status)
$$;
create function public.register_tournament_team(
  p_tournament_id uuid, p_category_id uuid, p_customer_ids uuid[]
) returns public.tournament_teams language sql security invoker set search_path = '' as $$
  select private.register_tournament_team(p_tournament_id, p_category_id, p_customer_ids)
$$;
create function public.withdraw_tournament_team(p_tournament_id uuid, p_team_id uuid)
returns public.tournament_teams language sql security invoker set search_path = '' as $$
  select private.withdraw_tournament_team(p_tournament_id, p_team_id)
$$;
revoke all on function public.create_tournament(text,date,date,text[]),
  public.set_tournament_status(uuid,text),
  public.register_tournament_team(uuid,uuid,uuid[]),
  public.withdraw_tournament_team(uuid,uuid) from public, anon;
grant execute on function public.create_tournament(text,date,date,text[]),
  public.set_tournament_status(uuid,text),
  public.register_tournament_team(uuid,uuid,uuid[]),
  public.withdraw_tournament_team(uuid,uuid) to authenticated;
