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
declare
 t public.tournaments;
 c uuid;
 athletes uuid[];
 m public.tournament_matches;
 r public.tournament_matches;
 rejected boolean;
 i integer;
begin
 select array_agg(id order by phone) into athletes from public.customers where tenant_id='a9292929-aaaa-4929-8929-292929292921';
 t:=public.create_tournament('Resultados teste',current_date+7,current_date+8,array['Open']);
 select id into c from public.tournament_categories where tournament_id=t.id;
 perform public.set_tournament_status(t.id,'open');
 for i in 1..3 loop perform public.register_tournament_team(t.id,c,array[athletes[i*2-1],athletes[i*2]]); end loop;
 perform public.set_tournament_status(t.id,'closed');
 perform public.draw_tournament_category(t.id,c,3);
 select * into m from public.tournament_matches where tournament_id=t.id limit 1;
 r:=public.record_tournament_result(t.id,m.id,6,4,0,'Placar inicial');
 if r.score_a<>6 or r.result_version<>1 then raise exception 'Resultado não salvo'; end if;
 rejected:=false;
 begin perform public.record_tournament_result(t.id,m.id,4,6,0,'Edição antiga');
 exception when invalid_parameter_value then rejected:=true; end;
 if not rejected then raise exception 'Sobrescrita de versão antiga aceita'; end if;
 rejected:=false;
 begin perform public.record_tournament_result(t.id,m.id,4,4,1,'Empate inválido');
 exception when invalid_parameter_value then rejected:=true; end;
 if not rejected then raise exception 'Empate aceito'; end if;
 rejected:=false;
 begin perform public.record_tournament_result(t.id,m.id,null,4,1,'Parcial inválido');
 exception when invalid_parameter_value then rejected:=true; end;
 if not rejected then raise exception 'Placar parcial aceito'; end if;
 rejected:=false;
 begin perform public.record_tournament_result(t.id,m.id,100,4,1,'Acima do limite');
 exception when invalid_parameter_value then rejected:=true; end;
 if not rejected then raise exception 'Placar fora do limite'; end if;
 rejected:=false;
 begin perform public.record_tournament_result(t.id,m.id,4,6,1,'');
 exception when invalid_parameter_value then rejected:=true; end;
 if not rejected then raise exception 'Sem justificativa'; end if;
 r:=public.record_tournament_result(t.id,m.id,4,6,1,'Correção do placar');
 if r.score_b<>6 or r.result_version<>2 then raise exception 'Correção não salva'; end if;
 r:=public.record_tournament_result(t.id,m.id,null,null,2,'Partida lançada por engano');
 if r.score_a is not null or r.result_version<>3 then raise exception 'Anulação falhou'; end if;
 if (select count(*) from public.tournament_result_history where match_id=m.id)<>3 then raise exception 'Histórico incompleto'; end if;
 if not exists(select 1 from public.tournament_result_history where match_id=m.id and version=2 and previous_score_a=6 and score_a=4) then raise exception 'Valores anteriores perdidos'; end if;
 perform set_config('request.jwt.claim.sub','b9191919-bbbb-4919-8919-191919191912',true);
 if (select count(*) from public.tournament_result_history where match_id=m.id)<>3 then raise exception 'Recepção não lê histórico'; end if;
 rejected:=false;
 begin perform public.record_tournament_result(t.id,m.id,6,4,3,'Recepção tentativa');
 exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Recepção alterou resultado'; end if;
 rejected:=false;
 begin update public.tournament_matches set score_a=6,score_b=4 where id=m.id;
 exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Escrita direta permitida'; end if;
 rejected:=false;
 begin delete from public.tournament_result_history where match_id=m.id;
 exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Histórico apagável'; end if;
 perform set_config('request.jwt.claim.sub','d9191919-dddd-4919-8919-191919191914',true);
 if exists(select 1 from public.tournament_result_history) then raise exception 'Histórico de outra arena visível'; end if;
 rejected:=false;
 begin perform public.record_tournament_result(t.id,m.id,6,4,3,'Outra arena tentativa');
 exception when no_data_found then rejected:=true; end;
 if not rejected then raise exception 'Outra arena alterou resultado'; end if;
 perform set_config('request.jwt.claim.sub','c9191919-cccc-4919-8919-191919191913',true);
 if exists(select 1 from public.tournament_result_history) then raise exception 'Professor acessa histórico'; end if;
end; $$;
rollback;
