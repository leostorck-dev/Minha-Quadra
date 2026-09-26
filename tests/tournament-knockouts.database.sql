-- Teste transacional: categorias, duplas, retirada, situação e isolamento.
begin;
-- All generated fixtures and draws are rolled back, including auth users.
insert into auth.users (id, email, email_confirmed_at) values
  ('a9191919-aaaa-4919-8919-191919191911', 'tournament-owner@example.invalid', now()),
  ('b9191919-bbbb-4919-8919-191919191912', 'tournament-reception@example.invalid', now()),
  ('c9191919-cccc-4919-8919-191919191913', 'tournament-coach@example.invalid', now()),
  ('d9191919-dddd-4919-8919-191919191914', 'tournament-other@example.invalid', now());
insert into public.tenants (id, name, slug, owner_user_id) values
  ('a9292929-aaaa-4929-8929-292929292921', 'Arena Torneio A', 'arena-tournament-a-test', 'a9191919-aaaa-4919-8919-191919191911'),
  ('d9292929-dddd-4929-8929-292929292924', 'Arena Torneio B', 'arena-tournament-b-test', 'd9191919-dddd-4919-8919-191919191914');
insert into public.profiles (id, tenant_id, name, email, role) values
  ('a9191919-aaaa-4919-8919-191919191911', 'a9292929-aaaa-4929-8929-292929292921', 'Dono', 'tournament-owner@example.invalid', 'OWNER'),
  ('b9191919-bbbb-4919-8919-191919191912', 'a9292929-aaaa-4929-8929-292929292921', 'Recepção', 'tournament-reception@example.invalid', 'RECEPTIONIST'),
  ('c9191919-cccc-4919-8919-191919191913', 'a9292929-aaaa-4929-8929-292929292921', 'Professor', 'tournament-coach@example.invalid', 'COACH'),
  ('d9191919-dddd-4919-8919-191919191914', 'd9292929-dddd-4929-8929-292929292924', 'Outro dono', 'tournament-other@example.invalid', 'OWNER');
select set_config('request.jwt.claim.sub', 'a9191919-aaaa-4919-8919-191919191911', true);
select set_config('request.jwt.claims', '{"sub":"a9191919-aaaa-4919-8919-191919191911","role":"authenticated"}', true);
insert into public.customers (id, tenant_id, name, phone, created_by) values
  ('a9393939-aaaa-4939-8939-393939393931', 'a9292929-aaaa-4929-8929-292929292921', 'Atleta Um', '11999990031', 'a9191919-aaaa-4919-8919-191919191911'),
  ('b9393939-bbbb-4939-8939-393939393932', 'a9292929-aaaa-4929-8929-292929292921', 'Atleta Dois', '11999990032', 'a9191919-aaaa-4919-8919-191919191911'),
  ('c9393939-cccc-4939-8939-393939393933', 'a9292929-aaaa-4929-8929-292929292921', 'Atleta Três', '11999990033', 'a9191919-aaaa-4919-8919-191919191911');


insert into public.customers(tenant_id,name,phone,created_by)
select 'a9292929-aaaa-4929-8929-292929292921', 'Atleta sorteio ' || i,
  '1188' || lpad(i::text,7,'0'), 'a9191919-aaaa-4919-8919-191919191911'
from generate_series(1,130) i;


set local role authenticated;
do $$
declare t public.tournaments; c uuid; athletes uuid[]; n integer; q integer; i integer; size integer; countq integer;
 gm public.tournament_matches; km public.tournament_knockout_matches; firstmatch public.tournament_knockout_matches; fid uuid; rejected boolean;
 tie_t public.tournaments; tie_c uuid; tie_teams uuid[];
begin
 select array_agg(id order by phone) into athletes from public.customers where tenant_id='a9292929-aaaa-4929-8929-292929292921';
 foreach n in array array[6,9,64] loop
  q:=case when n=9 then 1 else 2 end;
  t:=public.create_tournament('Eliminatórias teste',current_date+7,current_date+8,array['Open']);
  select id into c from public.tournament_categories where tournament_id=t.id;
  perform public.set_tournament_status(t.id,'open');
  for i in 1..n loop perform public.register_tournament_team(t.id,c,array[athletes[2*i-1],athletes[2*i]]); end loop;
  perform public.set_tournament_status(t.id,'closed'); perform public.draw_tournament_category(t.id,c,3);
  rejected:=false;
  begin perform public.create_tournament_bracket(t.id,c,q); exception when invalid_parameter_value then rejected:=true; end;
  if not rejected then raise exception 'Jogos pendentes aceitos'; end if;
  for gm in select * from public.tournament_matches where category_id=c loop
   perform public.record_tournament_result(t.id,gm.id,6,4,0,'Placar grupos');
  end loop;
  if exists(select 1 from public.tournament_standings where category_id=c and (played<1 or scored<=0)) then raise exception 'Classificação inválida'; end if;
  countq:=public.create_tournament_bracket(t.id,c,q);
  if countq<>((n+2)/3)*q then raise exception 'Classificadas incorretas'; end if;
  size:=2; while size<countq loop size:=size*2; end loop;
  if (select count(*) from public.tournament_knockout_matches where category_id=c)<>size-1 then raise exception 'Chave incompleta'; end if;
  if (select count(*) from public.tournament_knockout_matches where category_id=c and round=1 and winner_id is not null)<>size-countq then raise exception 'Byes incorretos'; end if;
  if (select count(*) from (select team_a_id from public.tournament_knockout_matches where category_id=c and round=1 union select team_b_id from public.tournament_knockout_matches where category_id=c and round=1 and team_b_id is not null) ids)<>countq then raise exception 'Classificadas repetidas'; end if;
  rejected:=false;
  begin perform public.create_tournament_bracket(t.id,c,q); exception when invalid_parameter_value then rejected:=true; end;
  if not rejected then raise exception 'Chave repetida'; end if;
  rejected:=false;
  begin perform public.record_tournament_result(t.id,gm.id,4,6,1,'Correção proibida'); exception when invalid_parameter_value then rejected:=true; end;
  if not rejected then raise exception 'Grupos alterados após chave'; end if;
  select * into firstmatch from public.tournament_knockout_matches where category_id=c and round=1 and team_b_id is not null limit 1;
  firstmatch:=public.record_knockout_result(t.id,firstmatch.id,6,4,firstmatch.result_version,'Primeiro resultado');
  firstmatch:=public.record_knockout_result(t.id,firstmatch.id,4,6,firstmatch.result_version,'Correção antes da próxima rodada');
  if not exists(select 1 from public.tournament_knockout_matches where category_id=c and round=2 and position=(firstmatch.position+1)/2
    and (team_a_id=firstmatch.team_b_id or team_b_id=firstmatch.team_b_id)) then raise exception 'Correção não propagou vencedor'; end if;
  -- Play all rounds, reading each row again after its feeders have advanced.
  for fid in select id from public.tournament_knockout_matches where category_id=c order by round,position loop
   select * into km from public.tournament_knockout_matches where id=fid;
   if km.winner_id is null then
    if km.team_a_id is null or km.team_b_id is null then raise exception 'Vencedores não avançaram'; end if;
    perform public.record_knockout_result(t.id,km.id,6,4,km.result_version,'Resultado eliminatória');
   end if;
  end loop;
  if (select count(*) from public.tournament_knockout_matches where category_id=c and score_a is not null)<>countq-1 then raise exception 'Jogos disputados incorretos'; end if;
  select * into km from public.tournament_knockout_matches where category_id=c order by round desc limit 1;
  if km.winner_id is null then raise exception 'Campeão não definido'; end if;
  rejected:=false;
  begin perform public.record_knockout_result(t.id,firstmatch.id,6,4,firstmatch.result_version,'Alteração com rodada seguinte'); exception when invalid_parameter_value then rejected:=true; end;
  if not rejected then raise exception 'Alterou resultado com descendente concluído'; end if;
  perform public.record_knockout_result(t.id,km.id,null,null,km.result_version,'Anulação da final');
  select * into km from public.tournament_knockout_matches where id=km.id;
  if km.winner_id is not null then raise exception 'Campeão não removido'; end if;
  perform public.record_knockout_result(t.id,km.id,4,6,km.result_version,'Final corrigida');
  rejected:=false;
  begin perform public.record_knockout_result(t.id,km.id,6,4,km.result_version,'Versão antiga'); exception when invalid_parameter_value then rejected:=true; end;
  if not rejected then raise exception 'Sobrescrita concorrente'; end if;
 end loop;
 tie_t:=public.create_tournament('Empate completo',current_date+7,current_date+8,array['Open']);
 select id into tie_c from public.tournament_categories where tournament_id=tie_t.id;
 perform public.set_tournament_status(tie_t.id,'open');
 for i in 1..3 loop perform public.register_tournament_team(tie_t.id,tie_c,array[athletes[2*i-1],athletes[2*i]]); end loop;
 perform public.set_tournament_status(tie_t.id,'closed'); perform public.draw_tournament_category(tie_t.id,tie_c,3);
 select array_agg(team_id order by team_id) into tie_teams from public.tournament_group_teams where category_id=tie_c;
 for gm in select * from public.tournament_matches where category_id=tie_c loop
  if gm.team_a_id=tie_teams[1] and gm.team_b_id=tie_teams[3] then
   perform public.record_tournament_result(tie_t.id,gm.id,4,6,0,'Empate circular');
  else perform public.record_tournament_result(tie_t.id,gm.id,6,4,0,'Empate circular'); end if;
 end loop;
 for i in 1..2 loop
  rejected:=false;
  begin perform public.create_tournament_bracket(tie_t.id,tie_c,i); exception when invalid_parameter_value then rejected:=true; end;
  if not rejected or exists(select 1 from public.tournament_brackets where category_id=tie_c) then raise exception 'Empate na vaga aceito'; end if;
 end loop;
 perform set_config('request.jwt.claim.sub','b9191919-bbbb-4919-8919-191919191912',true);
 if not exists(select 1 from public.tournament_knockout_history) then raise exception 'Recepção não lê histórico'; end if;
 rejected:=false;
 begin perform public.record_knockout_result(t.id,km.id,6,4,0,'Recepção'); exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Recepção altera'; end if;
 rejected:=false;
 begin delete from public.tournament_knockout_history; exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Histórico apagável'; end if;
 perform set_config('request.jwt.claim.sub','d9191919-dddd-4919-8919-191919191914',true);
 if exists(select 1 from public.tournament_knockout_matches) or exists(select 1 from public.tournament_brackets) or exists(select 1 from public.tournament_standings) or exists(select 1 from public.tournament_knockout_history) then raise exception 'Outra arena acessa'; end if;
 rejected:=false;
 begin perform public.create_tournament_bracket(t.id,c,1); exception when no_data_found then rejected:=true; end;
 if not rejected then raise exception 'Outra arena gera chave'; end if;
end; $$;
rollback;
