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
declare t public.tournaments; c uuid; athletes uuid[]; i integer; n integer; q integer;
 gm public.tournament_matches; semi public.tournament_knockout_matches; bronze public.tournament_knockout_matches; final public.tournament_knockout_matches; rejected boolean;
begin
 select array_agg(id order by phone) into athletes from public.customers where tenant_id='a9292929-aaaa-4929-8929-292929292921';
 foreach n in array array[3,9,6] loop
  q:=case when n=9 then 1 else 2 end;
  t:=public.create_tournament('Pódio teste',current_date+7,current_date+8,array['Open']);
  select id into c from public.tournament_categories where tournament_id=t.id;
  perform public.set_tournament_status(t.id,'open');
  for i in 1..n loop perform public.register_tournament_team(t.id,c,array[athletes[2*i-1],athletes[2*i]]);end loop;
  perform public.set_tournament_status(t.id,'closed');perform public.draw_tournament_category(t.id,c,3);
  for gm in select * from public.tournament_matches where category_id=c loop perform public.record_tournament_result(t.id,gm.id,6,4,0,'Grupos');end loop;
  perform public.create_tournament_bracket(t.id,c,q);
  rejected:=false;
  begin perform public.create_tournament_bronze(t.id,c);exception when invalid_parameter_value then rejected:=true;end;
  if not rejected then raise exception 'Bronze sem semifinais completas';end if;
  for semi in select * from public.tournament_knockout_matches where category_id=c and round=1 and team_b_id is not null loop
   perform public.record_knockout_result(t.id,semi.id,6,4,semi.result_version,'Semifinal');
  end loop;
  if n<>6 then
   rejected:=false;
   begin perform public.create_tournament_bronze(t.id,c);exception when invalid_parameter_value then rejected:=true;end;
   if not rejected then raise exception 'Bronze sem duas perdedoras';end if;
  else
   bronze:=public.create_tournament_bronze(t.id,c);
   select * into semi from public.tournament_knockout_matches where category_id=c and round=1 and position=1;
   if bronze.team_a_id<>semi.team_b_id then raise exception 'Perdedora incorreta';end if;
   rejected:=false;
   begin perform public.create_tournament_bronze(t.id,c);exception when invalid_parameter_value then rejected:=true;end;
   if not rejected then raise exception 'Bronze duplicado';end if;
   semi:=public.record_knockout_result(t.id,semi.id,4,6,semi.result_version,'Semifinal corrigida');
   select * into bronze from public.tournament_knockout_matches where id=bronze.id;
   if bronze.team_a_id<>semi.team_a_id then raise exception 'Correção não propagou perdedora';end if;
   bronze:=public.record_knockout_result(t.id,bronze.id,6,4,bronze.result_version,'Terceiro lugar');
   rejected:=false;
   begin perform public.record_knockout_result(t.id,semi.id,6,4,semi.result_version,'Correção bloqueada pelo bronze');exception when invalid_parameter_value then rejected:=true;end;
   if not rejected then raise exception 'Semifinal mudou após bronze';end if;
   select * into final from public.tournament_knockout_matches where category_id=c and stage='bracket' and round=2 and position=1;
   final:=public.record_knockout_result(t.id,final.id,6,4,final.result_version,'Final');
   if (select winner_id from public.tournament_knockout_matches where id=bronze.id)<>bronze.winner_id then raise exception 'Final alterou bronze';end if;
   bronze:=public.record_knockout_result(t.id,bronze.id,null,null,bronze.result_version,'Anular bronze');
   if bronze.winner_id is not null then raise exception 'Terceiro não removido';end if;
   rejected:=false;
   begin perform public.record_knockout_result(t.id,semi.id,6,4,semi.result_version,'Final ainda concluída');exception when invalid_parameter_value then rejected:=true;end;
   if not rejected then raise exception 'Semifinal mudou após final';end if;
   final:=public.record_knockout_result(t.id,final.id,null,null,final.result_version,'Anular final');
   perform public.record_knockout_result(t.id,semi.id,6,4,semi.result_version,'Nova correção da semifinal');
   if (select count(*) from public.tournament_knockout_history where match_id=bronze.id)<>2 then raise exception 'Histórico bronze perdido';end if;
  end if;
 end loop;
 perform set_config('request.jwt.claim.sub','b9191919-bbbb-4919-8919-191919191912',true);
 rejected:=false;
 begin perform public.create_tournament_bronze(t.id,c);exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Recepção criou bronze';end if;
 perform set_config('request.jwt.claim.sub','d9191919-dddd-4919-8919-191919191914',true);
 if exists(select 1 from public.tournament_knockout_matches where stage='bronze') then raise exception 'Outra arena vê bronze';end if;
 rejected:=false;
 begin perform public.create_tournament_bronze(t.id,c);exception when no_data_found then rejected:=true;end;
 if not rejected then raise exception 'Outra arena criou bronze';end if;
end; $$;
rollback;
