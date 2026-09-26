alter table public.tournament_groups add column standings_version integer not null default 0 check(standings_version>=0);
create table public.tournament_tiebreaks (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null,
 tournament_id uuid not null,
 category_id uuid not null,
 group_id uuid not null,
 team_ids uuid[] not null check(cardinality(team_ids) between 2 and 4),
 reason text not null check(length(btrim(reason)) between 3 and 200),
 status text not null default 'active' check(status in ('active','superseded','results_changed')),
 version integer not null check(version>0),
 recorded_by uuid not null references auth.users(id),
 recorded_at timestamptz not null default now(),
 invalidated_at timestamptz,
 unique(group_id,version),
 foreign key(tenant_id,tournament_id,category_id,group_id) references public.tournament_groups(tenant_id,tournament_id,category_id,id)
);
create unique index tournament_tiebreak_active_idx on public.tournament_tiebreaks(group_id) where status='active';
create index tournament_tiebreak_scope_idx on public.tournament_tiebreaks(tenant_id,tournament_id,category_id,group_id);
create index tournament_tiebreak_author_idx on public.tournament_tiebreaks(recorded_by);
alter table public.tournament_tiebreaks enable row level security;
revoke all on public.tournament_tiebreaks from public,anon,authenticated;
grant select on public.tournament_tiebreaks to authenticated;
grant all on public.tournament_tiebreaks to service_role;
create policy tiebreaks_read on public.tournament_tiebreaks for select to authenticated using(
 tenant_id=(select tenant_id from public.profiles where id=(select auth.uid()) and role in ('OWNER','MANAGER','RECEPTIONIST'))
);
create view public.tournament_qualification with(security_invoker=true) as
 select s.*,coalesce(array_position(t.team_ids,s.team_id),s.rank) as qualification_rank
 from public.tournament_standings s left join public.tournament_tiebreaks t on t.group_id=s.group_id and t.status='active';
revoke all on public.tournament_qualification from public,anon;
grant select on public.tournament_qualification to authenticated,service_role;

create function private.invalidate_tournament_tiebreak() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.score_a is distinct from old.score_a or new.score_b is distinct from old.score_b then
  update public.tournament_tiebreaks set status='results_changed',invalidated_at=now() where group_id=new.group_id and status='active';
  update public.tournament_groups set standings_version=standings_version+1 where id=new.group_id;
 end if;
 return new;
end; $$;
revoke all on function private.invalidate_tournament_tiebreak() from public,anon,authenticated;
create trigger invalidate_tiebreak after update of score_a,score_b on public.tournament_matches for each row execute function private.invalidate_tournament_tiebreak();

create function private.resolve_tournament_tie(p_tournament_id uuid,p_group_id uuid,p_team_ids uuid[],p_expected_version integer,p_reason text)
returns public.tournament_tiebreaks language plpgsql security definer set search_path='' as $$
declare tenant uuid; category uuid; g public.tournament_groups; result public.tournament_tiebreaks; n integer;
begin
 tenant:=private.tournament_manager_tenant();
 if tenant is null then raise exception 'Sem permissão.' using errcode='42501'; end if;
 select category_id into category from public.tournament_groups where id=p_group_id and tenant_id=tenant and tournament_id=p_tournament_id;
 if not found then raise exception 'Grupo não encontrado.' using errcode='P0002'; end if;
 perform 1 from public.tournament_categories where id=category for update;
 select * into g from public.tournament_groups where id=p_group_id for update;
 if exists(select 1 from public.tournament_brackets where category_id=category) then raise exception 'Desempate bloqueado após gerar a eliminatória.' using errcode='22023'; end if;
 if p_expected_version is null or p_expected_version<>g.standings_version then raise exception 'A classificação foi alterada. Atualize o grupo antes de decidir.' using errcode='22023'; end if;
 if exists(select 1 from public.tournament_matches where group_id=p_group_id and score_a is null) then raise exception 'Conclua os jogos do grupo antes do desempate.' using errcode='22023'; end if;
 if not exists(select rank from public.tournament_standings where group_id=p_group_id group by rank having count(*)>1) then raise exception 'Este grupo não possui empate.' using errcode='22023'; end if;
 select count(*) into n from public.tournament_group_teams where group_id=p_group_id;
 if p_team_ids is null or cardinality(p_team_ids)<>n or array_ndims(p_team_ids)<>1 or array_lower(p_team_ids,1)<>1
  or (select count(distinct id) from unnest(p_team_ids) id)<>n
  or (select count(*) from public.tournament_group_teams where group_id=p_group_id and team_id=any(p_team_ids))<>n then
  raise exception 'Informe todas as duplas do grupo, sem repetição.' using errcode='22023'; end if;
 if exists(select 1 from (
  select s.rank,lag(s.rank) over(order by u.position) previous_rank
  from unnest(p_team_ids) with ordinality u(team_id,position) join public.tournament_standings s on s.team_id=u.team_id where s.group_id=p_group_id
 ) ranks where rank<previous_rank) then raise exception 'Apenas duplas empatadas podem trocar de posição.' using errcode='22023'; end if;
 if p_reason is null or length(btrim(p_reason)) not between 3 and 200 then raise exception 'Informe uma justificativa de 3 a 200 caracteres.' using errcode='22023'; end if;
 update public.tournament_tiebreaks set status='superseded',invalidated_at=now() where group_id=p_group_id and status='active';
 update public.tournament_groups set standings_version=standings_version+1 where id=p_group_id returning * into g;
 insert into public.tournament_tiebreaks(tenant_id,tournament_id,category_id,group_id,team_ids,reason,version,recorded_by)
 values(tenant,p_tournament_id,category,p_group_id,p_team_ids,btrim(p_reason),g.standings_version,auth.uid()) returning * into result;
 return result;
end; $$;
revoke all on function private.resolve_tournament_tie(uuid,uuid,uuid[],integer,text) from public,anon,authenticated;
grant execute on function private.resolve_tournament_tie(uuid,uuid,uuid[],integer,text) to authenticated;
create function public.resolve_tournament_tie(p_tournament_id uuid,p_group_id uuid,p_team_ids uuid[],p_expected_version integer,p_reason text)
returns public.tournament_tiebreaks language sql security invoker set search_path='' as $$ select private.resolve_tournament_tie(p_tournament_id,p_group_id,p_team_ids,p_expected_version,p_reason) $$;
revoke all on function public.resolve_tournament_tie(uuid,uuid,uuid[],integer,text) from public,anon;
grant execute on function public.resolve_tournament_tie(uuid,uuid,uuid[],integer,text) to authenticated;
create or replace function private.create_tournament_bracket(p_tournament_id uuid,p_category_id uuid,p_qualifiers integer)
returns integer language plpgsql security definer set search_path='' as $$
declare tenant uuid; teams uuid[]; n integer; size integer:=2; r integer:=1; i integer; a uuid; b uuid;
begin
 tenant:=private.tournament_manager_tenant();
 if tenant is null then raise exception 'Sem permissão.' using errcode='42501'; end if;
 perform 1 from public.tournament_categories where id=p_category_id and tenant_id=tenant and tournament_id=p_tournament_id for update;
 if not found then raise exception 'Categoria não encontrada.' using errcode='P0002'; end if;
 if exists(select 1 from public.tournament_brackets where category_id=p_category_id) then raise exception 'Chave já gerada.' using errcode='22023'; end if;
 if p_qualifiers is null or p_qualifiers not in (1,2) then raise exception 'Escolha 1 ou 2 classificadas por grupo.' using errcode='22023'; end if;
 if not exists(select 1 from public.tournament_matches where category_id=p_category_id) or exists(select 1 from public.tournament_matches where category_id=p_category_id and score_a is null) then raise exception 'Conclua todos os jogos dos grupos.' using errcode='22023'; end if;
 if exists(select group_id from public.tournament_qualification where category_id=p_category_id and qualification_rank<=p_qualifiers group by group_id having count(*)<>p_qualifiers) then
  raise exception 'Há empate que afeta a classificação. Não é possível gerar a chave.' using errcode='22023'; end if;
 select array_agg(team_id order by random()) into teams from public.tournament_qualification where category_id=p_category_id and qualification_rank<=p_qualifiers;
 n:=coalesce(cardinality(teams),0);
 if n not between 2 and 64 then raise exception 'São necessárias de 2 a 64 duplas classificadas.' using errcode='22023'; end if;
 while size<n loop size:=size*2; end loop;
 insert into public.tournament_brackets(category_id,tenant_id,tournament_id,qualifiers_per_group,created_by) values(p_category_id,tenant,p_tournament_id,p_qualifiers,auth.uid());
 for i in 1..size/2 loop
  a:=teams[i]; b:=teams[size+1-i];
  insert into public.tournament_knockout_matches(tenant_id,tournament_id,category_id,round,position,team_a_id,team_b_id,winner_id)
  values(tenant,p_tournament_id,p_category_id,1,i,a,b,case when b is null then a else null end);
 end loop;
 size:=size/2;
 while size>1 loop
  r:=r+1; size:=size/2;
  for i in 1..size loop insert into public.tournament_knockout_matches(tenant_id,tournament_id,category_id,round,position) values(tenant,p_tournament_id,p_category_id,r,i); end loop;
 end loop;
 perform private.refresh_knockout(p_category_id);
 return n;
end; $$;
