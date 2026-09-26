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
declare t public.tournaments; c uuid; g public.tournament_groups; athletes uuid[]; teams uuid[]; gm public.tournament_matches; edited public.tournament_matches; d public.tournament_tiebreaks; i integer; rejected boolean; v integer;
begin
 select array_agg(id order by phone) into athletes from public.customers where tenant_id='a9292929-aaaa-4929-8929-292929292921';
 t:=public.create_tournament('Desempate teste',current_date+7,current_date+8,array['Open']);
 select id into c from public.tournament_categories where tournament_id=t.id;
 perform public.set_tournament_status(t.id,'open');
 for i in 1..4 loop perform public.register_tournament_team(t.id,c,array[athletes[2*i-1],athletes[2*i]]); end loop;
 perform public.set_tournament_status(t.id,'closed');perform public.draw_tournament_category(t.id,c,4);
 select * into g from public.tournament_groups where category_id=c;
 select array_agg(team_id order by team_id) into teams from public.tournament_group_teams where group_id=g.id;
 rejected:=false;
 begin perform public.resolve_tournament_tie(t.id,g.id,teams,0,'Jogos pendentes');exception when invalid_parameter_value then rejected:=true;end;
 if not rejected then raise exception 'Decisão com jogos pendentes';end if;
 for gm in select * from public.tournament_matches where category_id=c loop
  if gm.team_a_id=teams[1] then perform public.record_tournament_result(t.id,gm.id,6,0,0,'Líder vence');
  elsif gm.team_a_id=teams[2] and gm.team_b_id=teams[4] then perform public.record_tournament_result(t.id,gm.id,4,6,0,'Empate circular');
  else perform public.record_tournament_result(t.id,gm.id,6,4,0,'Empate circular');end if;
 end loop;
 select * into g from public.tournament_groups where id=g.id;
 if g.standings_version<>6 then raise exception 'Versão dos resultados inválida';end if;
 rejected:=false;
 begin perform public.resolve_tournament_tie(t.id,g.id,array[teams[4],teams[1],teams[3],teams[2]],g.standings_version,'Rebaixa líder');exception when invalid_parameter_value then rejected:=true;end;
 if not rejected then raise exception 'Permitiu reordenar não empatadas';end if;
 rejected:=false;
 begin perform public.resolve_tournament_tie(t.id,g.id,array[teams[1],teams[2],teams[2],teams[4]],g.standings_version,'Dupla repetida');exception when invalid_parameter_value then rejected:=true;end;
 if not rejected then raise exception 'Dupla repetida aceita';end if;
 d:=public.resolve_tournament_tie(t.id,g.id,array[teams[1],teams[4],teams[3],teams[2]],g.standings_version,'Critério do regulamento');
 if not exists(select 1 from public.tournament_qualification where team_id=teams[4] and qualification_rank=2) then raise exception 'Decisão não muda classificação';end if;
 rejected:=false;
 begin perform public.resolve_tournament_tie(t.id,g.id,teams,g.standings_version,'Versão antiga');exception when invalid_parameter_value then rejected:=true;end;
 if not rejected then raise exception 'Sobrescrita de decisão';end if;
 d:=public.resolve_tournament_tie(t.id,g.id,teams,d.version,'Revisão fundamentada');
 if (select count(*) from public.tournament_tiebreaks where group_id=g.id and status='active')<>1 or (select count(*) from public.tournament_tiebreaks where group_id=g.id and status='superseded')<>1 then raise exception 'Histórico de revisão incompleto';end if;
 select * into edited from public.tournament_matches where group_id=g.id and team_a_id=teams[1] limit 1;
 perform public.record_tournament_result(t.id,edited.id,7,0,1,'Correção de placar');
 if exists(select 1 from public.tournament_tiebreaks where group_id=g.id and status='active') then raise exception 'Desempate antigo permanece vigente';end if;
 if not exists(select 1 from public.tournament_tiebreaks where id=d.id and status='results_changed' and invalidated_at is not null) then raise exception 'Invalidação sem histórico';end if;
 perform public.record_tournament_result(t.id,edited.id,6,0,2,'Restauração do placar correto');
 select standings_version into v from public.tournament_groups where id=g.id;
 d:=public.resolve_tournament_tie(t.id,g.id,array[teams[1],teams[4],teams[3],teams[2]],v,'Nova decisão após revisão');
 if public.create_tournament_bracket(t.id,c,2)<>2 then raise exception 'Chave não foi liberada';end if;
 if not exists(select 1 from public.tournament_knockout_matches where category_id=c and (team_a_id=teams[4] or team_b_id=teams[4])) then raise exception 'Classificada escolhida ausente';end if;
 rejected:=false;
 begin perform public.resolve_tournament_tie(t.id,g.id,teams,d.version,'Depois da chave');exception when invalid_parameter_value then rejected:=true;end;
 if not rejected then raise exception 'Decisão alterada após chave';end if;
 perform set_config('request.jwt.claim.sub','b9191919-bbbb-4919-8919-191919191912',true);
 if not exists(select 1 from public.tournament_tiebreaks where group_id=g.id) then raise exception 'Recepção não consulta histórico';end if;
 rejected:=false;
 begin perform public.resolve_tournament_tie(t.id,g.id,teams,d.version,'Recepção tentativa');exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Recepção decide';end if;
 rejected:=false;
 begin delete from public.tournament_tiebreaks;exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Histórico apagável';end if;
 perform set_config('request.jwt.claim.sub','d9191919-dddd-4919-8919-191919191914',true);
 if exists(select 1 from public.tournament_tiebreaks) or exists(select 1 from public.tournament_qualification) then raise exception 'Outra arena consulta';end if;
 rejected:=false;
 begin perform public.resolve_tournament_tie(t.id,g.id,teams,d.version,'Outra arena tentativa');exception when no_data_found then rejected:=true;end;
 if not rejected then raise exception 'Outra arena decide';end if;
end; $$;
rollback;
