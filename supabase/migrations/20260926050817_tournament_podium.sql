alter table public.tournament_knockout_matches add column stage text not null default 'bracket' check(stage in ('bracket','bronze'));
create unique index tournament_one_bronze_idx on public.tournament_knockout_matches(category_id) where stage='bronze';
create or replace function private.refresh_knockout(p_category uuid) returns void
language plpgsql security definer set search_path='' as $$
declare m public.tournament_knockout_matches; a uuid; b uuid;
begin
 for m in select * from public.tournament_knockout_matches where category_id=p_category and round>1 order by round,position loop
  if m.stage='bronze' then
   select case when score_a is null then null when winner_id=team_a_id then team_b_id else team_a_id end into a
    from public.tournament_knockout_matches where category_id=p_category and stage='bracket' and round=m.round-1 and position=1;
   select case when score_a is null then null when winner_id=team_a_id then team_b_id else team_a_id end into b
    from public.tournament_knockout_matches where category_id=p_category and stage='bracket' and round=m.round-1 and position=2;
  else
   select winner_id into a from public.tournament_knockout_matches where category_id=p_category and stage='bracket' and round=m.round-1 and position=m.position*2-1;
   select winner_id into b from public.tournament_knockout_matches where category_id=p_category and stage='bracket' and round=m.round-1 and position=m.position*2;
  end if;
  if m.score_a is null then
   update public.tournament_knockout_matches set team_a_id=a,team_b_id=b,winner_id=null,
    result_version=result_version+case when team_a_id is distinct from a or team_b_id is distinct from b then 1 else 0 end where id=m.id;
  end if;
 end loop;
end; $$;
create function private.create_tournament_bronze(p_tournament_id uuid,p_category_id uuid)
returns public.tournament_knockout_matches language plpgsql security definer set search_path='' as $$
declare tenant uuid; final_round integer; result public.tournament_knockout_matches;
begin
 tenant:=private.tournament_manager_tenant();
 if tenant is null then raise exception 'Sem permissão.' using errcode='42501';end if;
 perform 1 from public.tournament_categories where id=p_category_id and tournament_id=p_tournament_id and tenant_id=tenant for update;
 if not found then raise exception 'Categoria não encontrada.' using errcode='P0002';end if;
 if exists(select 1 from public.tournament_knockout_matches where category_id=p_category_id and stage='bronze') then raise exception 'Disputa de terceiro lugar já criada.' using errcode='22023';end if;
 select max(round) into final_round from public.tournament_knockout_matches where category_id=p_category_id and stage='bracket';
 if final_round is null or final_round<2 or (select count(*) from public.tournament_knockout_matches where category_id=p_category_id and stage='bracket' and round=final_round-1 and score_a is not null)<>2 then
  raise exception 'Conclua duas semifinais disputadas para definir o terceiro lugar.' using errcode='22023';end if;
 insert into public.tournament_knockout_matches(tenant_id,tournament_id,category_id,round,position,stage)
 values(tenant,p_tournament_id,p_category_id,final_round,2,'bronze') returning * into result;
 perform private.refresh_knockout(p_category_id);
 select * into result from public.tournament_knockout_matches where id=result.id;
 return result;
end; $$;
revoke all on function private.create_tournament_bronze(uuid,uuid) from public,anon,authenticated;
grant execute on function private.create_tournament_bronze(uuid,uuid) to authenticated;
create function public.create_tournament_bronze(p_tournament_id uuid,p_category_id uuid)
returns public.tournament_knockout_matches language sql security invoker set search_path='' as $$ select private.create_tournament_bronze(p_tournament_id,p_category_id) $$;
revoke all on function public.create_tournament_bronze(uuid,uuid) from public,anon;
grant execute on function public.create_tournament_bronze(uuid,uuid) to authenticated;
create or replace function private.record_knockout_result(p_tournament_id uuid,p_match_id uuid,p_score_a integer,p_score_b integer,p_expected_version integer,p_reason text)
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
 if m.stage='bracket' and exists(select 1 from public.tournament_knockout_matches where category_id=category and stage='bronze' and round=m.round+1 and score_a is not null) then
  raise exception 'Anule primeiro o resultado da disputa de terceiro lugar.' using errcode='22023';end if;
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
