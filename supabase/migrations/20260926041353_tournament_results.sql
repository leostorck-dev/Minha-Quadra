alter table public.tournament_matches
  add column score_a integer,
  add column score_b integer,
  add column result_version integer not null default 0 check (result_version >= 0),
  add constraint tournament_match_scores check (
    (score_a is null and score_b is null) or
    (score_a is not null and score_b is not null and score_a between 0 and 99
      and score_b between 0 and 99 and score_a <> score_b)
  ),
  add constraint tournament_matches_tenant_id_key unique (tenant_id, tournament_id, id);

create table public.tournament_result_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  tournament_id uuid not null,
  match_id uuid not null,
  version integer not null check (version > 0),
  previous_score_a integer,
  previous_score_b integer,
  score_a integer,
  score_b integer,
  reason text not null check (length(btrim(reason)) between 3 and 200),
  recorded_by uuid not null references auth.users(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  unique (match_id, version),
  foreign key (tenant_id, tournament_id, match_id)
    references public.tournament_matches(tenant_id, tournament_id, id) on delete restrict
);
create index tournament_result_history_scope_idx on public.tournament_result_history(tenant_id,tournament_id,match_id);
create index tournament_result_history_author_idx on public.tournament_result_history(recorded_by);
alter table public.tournament_result_history enable row level security;
revoke all on public.tournament_result_history from public,anon,authenticated;
grant select on public.tournament_result_history to authenticated;
grant all on public.tournament_result_history to service_role;
create policy tournament_result_history_read on public.tournament_result_history for select to authenticated using (
  tenant_id = (select tenant_id from public.profiles where id = (select auth.uid()) and role in ('OWNER','MANAGER','RECEPTIONIST'))
);

create function private.record_tournament_result(p_tournament_id uuid,p_match_id uuid,
  p_score_a integer,p_score_b integer,p_expected_version integer,p_reason text)
returns public.tournament_matches language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
  v_match public.tournament_matches;
begin
  v_tenant := private.tournament_manager_tenant();
  if v_tenant is null then raise exception 'Sem permissão.' using errcode='42501'; end if;
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
revoke all on function private.record_tournament_result(uuid,uuid,integer,integer,integer,text) from public,anon,authenticated;
grant execute on function private.record_tournament_result(uuid,uuid,integer,integer,integer,text) to authenticated;
create function public.record_tournament_result(p_tournament_id uuid,p_match_id uuid,
  p_score_a integer,p_score_b integer,p_expected_version integer,p_reason text)
returns public.tournament_matches language sql security invoker set search_path = '' as $$
  select private.record_tournament_result(p_tournament_id,p_match_id,p_score_a,p_score_b,p_expected_version,p_reason)
$$;
revoke all on function public.record_tournament_result(uuid,uuid,integer,integer,integer,text) from public,anon;
grant execute on function public.record_tournament_result(uuid,uuid,integer,integer,integer,text) to authenticated;
