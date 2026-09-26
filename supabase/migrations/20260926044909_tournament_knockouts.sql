create view public.tournament_standings with (security_invoker=true) as
with totals as (
 select e.tenant_id,e.tournament_id,e.category_id,e.group_id,e.team_id,e.team_label,
 count(m.id) filter(where m.score_a is not null)::integer as played,
 count(m.id) filter(where (m.team_a_id=e.team_id and m.score_a>m.score_b) or (m.team_b_id=e.team_id and m.score_b>m.score_a))::integer as wins,
 coalesce(sum(case when m.team_a_id=e.team_id then m.score_a else m.score_b end),0)::integer as scored,
 coalesce(sum(case when m.team_a_id=e.team_id then m.score_b else m.score_a end),0)::integer as conceded
 from public.tournament_group_teams e left join public.tournament_matches m
 on m.group_id=e.group_id and (m.team_a_id=e.team_id or m.team_b_id=e.team_id)
 group by e.tenant_id,e.tournament_id,e.category_id,e.group_id,e.team_id,e.team_label
)
select *,rank() over(partition by group_id order by wins desc,(scored-conceded) desc,scored desc)::integer as rank from totals;
revoke all on public.tournament_standings from public,anon;
grant select on public.tournament_standings to authenticated,service_role;

create table public.tournament_brackets (
 category_id uuid primary key,
 tenant_id uuid not null,
 tournament_id uuid not null,
 qualifiers_per_group integer not null check(qualifiers_per_group in (1,2)),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(tenant_id,tournament_id,category_id),
 foreign key(tenant_id,tournament_id,category_id) references public.tournament_categories(tenant_id,tournament_id,id)
);
create index tournament_brackets_author_idx on public.tournament_brackets(created_by);
create table public.tournament_knockout_matches (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null,
 tournament_id uuid not null,
 category_id uuid not null,
 round integer not null check(round between 1 and 6),
 position integer not null check(position between 1 and 32),
 team_a_id uuid,
 team_b_id uuid,
 winner_id uuid,
 score_a integer,
 score_b integer,
 result_version integer not null default 0,
 unique(category_id,round,position),
 unique(tenant_id,tournament_id,id),
 foreign key(tenant_id,tournament_id,category_id) references public.tournament_brackets(tenant_id,tournament_id,category_id),
 foreign key(tenant_id,tournament_id,category_id,team_a_id) references public.tournament_teams(tenant_id,tournament_id,category_id,id),
 foreign key(tenant_id,tournament_id,category_id,team_b_id) references public.tournament_teams(tenant_id,tournament_id,category_id,id),
 check(team_a_id is null or team_b_id is null or team_a_id<>team_b_id),
 check(winner_id is null or winner_id=team_a_id or winner_id=team_b_id),
 check((score_a is null and score_b is null) or (score_a is not null and score_b is not null and team_a_id is not null and team_b_id is not null and score_a between 0 and 99 and score_b between 0 and 99 and score_a<>score_b))
);
create index tournament_ko_a_idx on public.tournament_knockout_matches(tenant_id,tournament_id,category_id,team_a_id);
create index tournament_ko_b_idx on public.tournament_knockout_matches(tenant_id,tournament_id,category_id,team_b_id);
create table public.tournament_knockout_history (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null,
 tournament_id uuid not null,
 match_id uuid not null,
 version integer not null,
 previous_score_a integer,
 previous_score_b integer,
 score_a integer,
 score_b integer,
 reason text not null check(length(btrim(reason)) between 3 and 200),
 recorded_by uuid not null references auth.users(id),
 recorded_at timestamptz not null default now(),
 unique(match_id,version),
 foreign key(tenant_id,tournament_id,match_id) references public.tournament_knockout_matches(tenant_id,tournament_id,id)
);
create index tournament_ko_history_scope_idx on public.tournament_knockout_history(tenant_id,tournament_id,match_id);
create index tournament_ko_history_author_idx on public.tournament_knockout_history(recorded_by);
alter table public.tournament_brackets enable row level security;
alter table public.tournament_knockout_matches enable row level security;
alter table public.tournament_knockout_history enable row level security;
revoke all on public.tournament_brackets,public.tournament_knockout_matches,public.tournament_knockout_history from public,anon,authenticated;
grant select on public.tournament_brackets,public.tournament_knockout_matches,public.tournament_knockout_history to authenticated;
grant all on public.tournament_brackets,public.tournament_knockout_matches,public.tournament_knockout_history to service_role;
create policy brackets_read on public.tournament_brackets for select to authenticated using(tenant_id=(select tenant_id from public.profiles where id=(select auth.uid()) and role in ('OWNER','MANAGER','RECEPTIONIST')));
create policy ko_matches_read on public.tournament_knockout_matches for select to authenticated using(tenant_id=(select tenant_id from public.profiles where id=(select auth.uid()) and role in ('OWNER','MANAGER','RECEPTIONIST')));
create policy ko_history_read on public.tournament_knockout_history for select to authenticated using(tenant_id=(select tenant_id from public.profiles where id=(select auth.uid()) and role in ('OWNER','MANAGER','RECEPTIONIST')));

-- Called only after locking the category. Byes occur only in the first round.
create function private.refresh_knockout(p_category uuid) returns void
language plpgsql security definer set search_path='' as $$
declare m public.tournament_knockout_matches; a uuid; b uuid;
begin
 for m in select * from public.tournament_knockout_matches where category_id=p_category and round>1 order by round,position loop
  select winner_id into a from public.tournament_knockout_matches where category_id=p_category and round=m.round-1 and position=m.position*2-1;
  select winner_id into b from public.tournament_knockout_matches where category_id=p_category and round=m.round-1 and position=m.position*2;
  if m.score_a is null then
   update public.tournament_knockout_matches set team_a_id=a,team_b_id=b,winner_id=null,
    result_version=result_version+case when team_a_id is distinct from a or team_b_id is distinct from b then 1 else 0 end
   where id=m.id;
  end if;
 end loop;
end; $$;
revoke all on function private.refresh_knockout(uuid) from public,anon,authenticated;

create function private.create_tournament_bracket(p_tournament_id uuid,p_category_id uuid,p_qualifiers integer)
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
 if exists(select group_id from public.tournament_standings where category_id=p_category_id and rank<=p_qualifiers group by group_id having count(*)<>p_qualifiers) then
  raise exception 'Há empate que afeta a classificação. Não é possível gerar a chave.' using errcode='22023'; end if;
 select array_agg(team_id order by random()) into teams from public.tournament_standings where category_id=p_category_id and rank<=p_qualifiers;
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

create function private.record_knockout_result(p_tournament_id uuid,p_match_id uuid,p_score_a integer,p_score_b integer,p_expected_version integer,p_reason text)
returns public.tournament_knockout_matches language plpgsql security definer set search_path='' as $$
declare tenant uuid; category uuid; m public.tournament_knockout_matches;
begin
 tenant:=private.tournament_manager_tenant();
 if tenant is null then raise exception 'Sem permissão.' using errcode='42501'; end if;
 select category_id into category from public.tournament_knockout_matches where id=p_match_id and tenant_id=tenant and tournament_id=p_tournament_id;
 if not found then raise exception 'Confronto não encontrado.' using errcode='P0002'; end if;
 perform 1 from public.tournament_categories where id=category for update;
 select * into m from public.tournament_knockout_matches where id=p_match_id for update;
 if m.team_a_id is null or m.team_b_id is null then raise exception 'Aguarde os dois adversários. Avanços sem adversário são automáticos.' using errcode='22023'; end if;
 if p_expected_version is null or p_expected_version<>m.result_version then raise exception 'Resultado alterado. Atualize os confrontos.' using errcode='22023'; end if;
 if exists(select 1 from public.tournament_knockout_matches where category_id=category and round=m.round+1 and position=(m.position+1)/2 and score_a is not null) then raise exception 'Anule primeiro o resultado da rodada seguinte.' using errcode='22023'; end if;
 if p_reason is null or length(btrim(p_reason)) not between 3 and 200 then raise exception 'Informe uma justificativa de 3 a 200 caracteres.' using errcode='22023'; end if;
 if (p_score_a is null)<>(p_score_b is null) or (p_score_a is not null and (p_score_a not between 0 and 99 or p_score_b not between 0 and 99 or p_score_a=p_score_b)) then raise exception 'Placar inválido.' using errcode='22023'; end if;
 if p_score_a is not distinct from m.score_a and p_score_b is not distinct from m.score_b then raise exception 'Resultado não alterado.' using errcode='22023'; end if;
 insert into public.tournament_knockout_history(tenant_id,tournament_id,match_id,version,previous_score_a,previous_score_b,score_a,score_b,reason,recorded_by)
 values(tenant,p_tournament_id,p_match_id,m.result_version+1,m.score_a,m.score_b,p_score_a,p_score_b,btrim(p_reason),auth.uid());
 update public.tournament_knockout_matches set score_a=p_score_a,score_b=p_score_b,result_version=result_version+1,
 winner_id=case when p_score_a is null then null when p_score_a>p_score_b then team_a_id else team_b_id end where id=p_match_id returning * into m;
 perform private.refresh_knockout(category);
 return m;
end; $$;
revoke all on function private.create_tournament_bracket(uuid,uuid,integer),private.record_knockout_result(uuid,uuid,integer,integer,integer,text) from public,anon,authenticated;
grant execute on function private.create_tournament_bracket(uuid,uuid,integer),private.record_knockout_result(uuid,uuid,integer,integer,integer,text) to authenticated;
create function public.create_tournament_bracket(p_tournament_id uuid,p_category_id uuid,p_qualifiers integer) returns integer language sql security invoker set search_path='' as $$ select private.create_tournament_bracket(p_tournament_id,p_category_id,p_qualifiers) $$;
create function public.record_knockout_result(p_tournament_id uuid,p_match_id uuid,p_score_a integer,p_score_b integer,p_expected_version integer,p_reason text) returns public.tournament_knockout_matches language sql security invoker set search_path='' as $$ select private.record_knockout_result(p_tournament_id,p_match_id,p_score_a,p_score_b,p_expected_version,p_reason) $$;
revoke all on function public.create_tournament_bracket(uuid,uuid,integer),public.record_knockout_result(uuid,uuid,integer,integer,integer,text) from public,anon;
grant execute on function public.create_tournament_bracket(uuid,uuid,integer),public.record_knockout_result(uuid,uuid,integer,integer,integer,text) to authenticated;
create or replace function private.record_tournament_result(p_tournament_id uuid,p_match_id uuid,
  p_score_a integer,p_score_b integer,p_expected_version integer,p_reason text)
returns public.tournament_matches language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
  v_match public.tournament_matches;
begin
  v_tenant := private.tournament_manager_tenant();
  if v_tenant is null then raise exception 'Sem permissão.' using errcode='42501'; end if;
  perform 1 from public.tournament_categories where id=(select category_id from public.tournament_matches where id=p_match_id and tenant_id=v_tenant and tournament_id=p_tournament_id) for update;
  if exists(select 1 from public.tournament_brackets where category_id=(select category_id from public.tournament_matches where id=p_match_id and tenant_id=v_tenant)) then
    raise exception 'Resultados dos grupos estão bloqueados após gerar a eliminatória.' using errcode='22023'; end if;
  select * into v_match from public.tournament_matches
    where id=p_match_id and tournament_id=p_tournament_id and tenant_id=v_tenant for update;
  if not found then raise exception 'Confronto não encontrado.' using errcode='P0002'; end if;
  if p_expected_version is null or p_expected_version <> v_match.result_version then
    raise exception 'Este resultado foi alterado. Recarregue os confrontos antes de salvar.' using errcode='22023'; end if;
  if p_reason is null or length(btrim(p_reason)) not between 3 and 200 then
    raise exception 'Informe uma justificativa de 3 a 200 caracteres.' using errcode='22023'; end if;
  if (p_score_a is null) <> (p_score_b is null) or
    (p_score_a is not null and (p_score_a not between 0 and 99 or p_score_b not between 0 and 99 or p_score_a=p_score_b)) then
    raise exception 'Informe placares de 0 a 99, sem empate.' using errcode='22023'; end if;
  if p_score_a is not distinct from v_match.score_a and p_score_b is not distinct from v_match.score_b then
    raise exception 'O resultado não foi alterado.' using errcode='22023'; end if;
  insert into public.tournament_result_history(tenant_id,tournament_id,match_id,version,
    previous_score_a,previous_score_b,score_a,score_b,reason,recorded_by)
    values(v_tenant,p_tournament_id,p_match_id,v_match.result_version+1,
      v_match.score_a,v_match.score_b,p_score_a,p_score_b,btrim(p_reason),auth.uid());
  update public.tournament_matches set score_a=p_score_a,score_b=p_score_b,result_version=result_version+1
    where id=p_match_id returning * into v_match;
  return v_match;
end; $$;
