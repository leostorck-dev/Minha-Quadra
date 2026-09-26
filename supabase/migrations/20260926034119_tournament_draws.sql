alter table public.tournament_categories add column drawn_at timestamptz;

create table public.tournament_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  tournament_id uuid not null,
  category_id uuid not null,
  number integer not null check (number between 1 and 32),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (category_id, number),
  unique (tenant_id, tournament_id, category_id, id),
  foreign key (tenant_id, tournament_id, category_id)
    references public.tournament_categories(tenant_id, tournament_id, id) on delete restrict
);
create index tournament_groups_scope_idx on public.tournament_groups(tenant_id, tournament_id, category_id);
create index tournament_groups_creator_idx on public.tournament_groups(created_by);

create table public.tournament_group_teams (
  tenant_id uuid not null,
  tournament_id uuid not null,
  category_id uuid not null,
  group_id uuid not null,
  team_id uuid primary key,
  team_label text not null,
  position integer not null check (position between 1 and 4),
  unique (group_id, position),
  unique (tenant_id, tournament_id, category_id, group_id, team_id),
  foreign key (tenant_id, tournament_id, category_id, group_id)
    references public.tournament_groups(tenant_id, tournament_id, category_id, id) on delete restrict,
  foreign key (tenant_id, tournament_id, category_id, team_id)
    references public.tournament_teams(tenant_id, tournament_id, category_id, id) on delete restrict
);
create index tournament_group_teams_scope_idx on public.tournament_group_teams(tenant_id, tournament_id, category_id, team_id);

create table public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  tournament_id uuid not null,
  category_id uuid not null,
  group_id uuid not null,
  team_a_id uuid not null,
  team_b_id uuid not null,
  number integer not null check (number between 1 and 6),
  check (team_a_id < team_b_id),
  unique (group_id, team_a_id, team_b_id),
  unique (group_id, number),
  foreign key (tenant_id, tournament_id, category_id, group_id, team_a_id)
    references public.tournament_group_teams(tenant_id, tournament_id, category_id, group_id, team_id) on delete restrict,
  foreign key (tenant_id, tournament_id, category_id, group_id, team_b_id)
    references public.tournament_group_teams(tenant_id, tournament_id, category_id, group_id, team_id) on delete restrict
);
create index tournament_matches_team_a_idx on public.tournament_matches(tenant_id, tournament_id, category_id, group_id, team_a_id);
create index tournament_matches_team_b_idx on public.tournament_matches(tenant_id, tournament_id, category_id, group_id, team_b_id);

alter table public.tournament_groups enable row level security;
alter table public.tournament_group_teams enable row level security;
alter table public.tournament_matches enable row level security;
revoke all on public.tournament_groups, public.tournament_group_teams, public.tournament_matches from public, anon, authenticated;
grant select on public.tournament_groups, public.tournament_group_teams, public.tournament_matches to authenticated;
grant all on public.tournament_groups, public.tournament_group_teams, public.tournament_matches to service_role;
create policy tournament_groups_read on public.tournament_groups for select to authenticated using (
  tenant_id = (select tenant_id from public.profiles where id = (select auth.uid()) and role in ('OWNER','MANAGER','RECEPTIONIST'))
);
create policy tournament_group_teams_read on public.tournament_group_teams for select to authenticated using (
  tenant_id = (select tenant_id from public.profiles where id = (select auth.uid()) and role in ('OWNER','MANAGER','RECEPTIONIST'))
);
create policy tournament_matches_read on public.tournament_matches for select to authenticated using (
  tenant_id = (select tenant_id from public.profiles where id = (select auth.uid()) and role in ('OWNER','MANAGER','RECEPTIONIST'))
);

-- The same tournament row lock is used by registration, withdrawal and status changes.
create function private.draw_tournament_category(p_tournament_id uuid, p_category_id uuid, p_group_size integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
  v_tournament public.tournaments;
  v_teams uuid[];
  v_groups uuid[] := '{}';
  v_count integer;
  v_group_count integer;
  v_group uuid;
  v_label text;
  i integer;
begin
  v_tenant := private.tournament_manager_tenant();
  if v_tenant is null then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  select * into v_tournament from public.tournaments
    where id = p_tournament_id and tenant_id = v_tenant for update;
  if not found then raise exception 'Torneio não encontrado.' using errcode = 'P0002'; end if;
  if v_tournament.status <> 'closed' then
    raise exception 'Feche as inscrições antes do sorteio.' using errcode = '22023'; end if;
  if p_group_size is null or p_group_size not in (3,4) then
    raise exception 'Escolha grupos de até 3 ou 4 duplas.' using errcode = '22023'; end if;
  if not exists (select 1 from public.tournament_categories where id = p_category_id
    and tenant_id = v_tenant and tournament_id = p_tournament_id) then
    raise exception 'Categoria não encontrada.' using errcode = 'P0002'; end if;
  if exists (select 1 from public.tournament_categories where id = p_category_id and drawn_at is not null) then
    raise exception 'Esta categoria já foi sorteada.' using errcode = '22023'; end if;
  select array_agg(id order by random()) into v_teams from public.tournament_teams
    where tenant_id = v_tenant and tournament_id = p_tournament_id
      and category_id = p_category_id and status = 'registered';
  v_count := coalesce(cardinality(v_teams), 0);
  if v_count not between 2 and 64 then
    raise exception 'O sorteio exige de 2 a 64 duplas inscritas por categoria.' using errcode = '22023'; end if;
  v_group_count := (v_count + p_group_size - 1) / p_group_size;
  for i in 1..v_group_count loop
    insert into public.tournament_groups(tenant_id,tournament_id,category_id,number,created_by)
      values (v_tenant,p_tournament_id,p_category_id,i,auth.uid()) returning id into v_group;
    v_groups := array_append(v_groups,v_group);
  end loop;
  for i in 1..v_count loop
    select string_agg(c.name, ' + ' order by m.position) into v_label
      from public.tournament_team_members m join public.customers c
        on c.id = m.customer_id and c.tenant_id = m.tenant_id
      where m.team_id = v_teams[i] and m.tenant_id = v_tenant;
    insert into public.tournament_group_teams(tenant_id,tournament_id,category_id,group_id,team_id,team_label,position)
      values (v_tenant,p_tournament_id,p_category_id,v_groups[((i-1) % v_group_count)+1],v_teams[i],v_label,((i-1)/v_group_count)+1);
  end loop;
  insert into public.tournament_matches(tenant_id,tournament_id,category_id,group_id,team_a_id,team_b_id,number)
    select a.tenant_id,a.tournament_id,a.category_id,a.group_id,a.team_id,b.team_id,
      row_number() over (partition by a.group_id order by a.position,b.position)::integer
    from public.tournament_group_teams a join public.tournament_group_teams b
      on a.group_id = b.group_id and a.team_id < b.team_id
    where a.category_id = p_category_id and a.tenant_id = v_tenant;
  update public.tournament_categories set drawn_at = now() where id = p_category_id;
  return v_group_count;
end; $$;
revoke all on function private.draw_tournament_category(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function private.draw_tournament_category(uuid,uuid,integer) to authenticated;
create function public.draw_tournament_category(p_tournament_id uuid,p_category_id uuid,p_group_size integer)
returns integer language sql security invoker set search_path = '' as $$
  select private.draw_tournament_category(p_tournament_id,p_category_id,p_group_size)
$$;
revoke all on function public.draw_tournament_category(uuid,uuid,integer) from public,anon;
grant execute on function public.draw_tournament_category(uuid,uuid,integer) to authenticated;

create function private.prevent_drawn_tournament_reopening()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status <> 'closed' and exists (select 1 from public.tournament_categories
    where tournament_id = new.id and drawn_at is not null) then
    raise exception 'As inscrições não podem ser reabertas após o sorteio.' using errcode = '22023';
  end if;
  return new;
end; $$;
revoke all on function private.prevent_drawn_tournament_reopening() from public,anon,authenticated;
create trigger tournament_preserve_draw before update of status on public.tournaments
for each row execute function private.prevent_drawn_tournament_reopening();
