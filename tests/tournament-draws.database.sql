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
  category uuid;
  athletes uuid[];
  removed uuid;
  n integer;
  size integer;
  i integer;
  result integer;
  rejected boolean;
  expected_matches integer;
  boundary_t public.tournaments;
  boundary_category uuid;
begin
  select array_agg(id order by phone) into athletes from public.customers
    where tenant_id='a9292929-aaaa-4929-8929-292929292921' and phone like '1188%';
  foreach size in array array[3,4] loop
    foreach n in array array[2,3,4,5,7,8,64] loop
      t := public.create_tournament('Teste sorteio ' || n, current_date+7,current_date+8,array['Open']);
      select id into category from public.tournament_categories where tournament_id=t.id;
      perform public.set_tournament_status(t.id,'open');
      for i in 1..n loop
        perform public.register_tournament_team(t.id,category,array[athletes[2*i-1],athletes[2*i]]);
      end loop;
      -- Withdrawn teams must never enter the draw.
      select id into removed from public.register_tournament_team(t.id,category,array[athletes[129],athletes[130]]);
      perform public.withdraw_tournament_team(t.id,removed);
      rejected := false;
      begin perform public.draw_tournament_category(t.id,category,size);
      exception when invalid_parameter_value then rejected:=true; end;
      if not rejected then raise exception 'Sorteio com inscrições abertas'; end if;
      perform public.set_tournament_status(t.id,'closed');
      result := public.draw_tournament_category(t.id,category,size);
      if result <> (n+size-1)/size then raise exception 'Quantidade de grupos incorreta'; end if;
      if (select count(*) from public.tournament_group_teams where category_id=category) <> n
        or exists(select 1 from public.tournament_group_teams where team_id=removed) then
        raise exception 'Duplas faltando ou retiradas sorteadas'; end if;
      if exists(select 1 from public.tournament_group_teams where category_id=category
        group by group_id having count(*)<2 or count(*)>size) then
        raise exception 'Grupo com tamanho inválido'; end if;
      if (select max(c)-min(c) from (select count(*) c from public.tournament_group_teams
        where category_id=category group by group_id) counts)>1 then
        raise exception 'Grupos desequilibrados'; end if;
      select sum(c*(c-1)/2) into expected_matches from (select count(*) c
        from public.tournament_group_teams where category_id=category group by group_id) counts;
      if (select count(*) from public.tournament_matches where category_id=category) <> expected_matches then
        raise exception 'Confrontos incompletos'; end if;
      rejected:=false;
      begin perform public.draw_tournament_category(t.id,category,size);
      exception when invalid_parameter_value then rejected:=true; end;
      if not rejected then raise exception 'Sorteio repetido aceito'; end if;
      rejected:=false;
      begin perform public.set_tournament_status(t.id,'open');
      exception when invalid_parameter_value then rejected:=true; end;
      if not rejected then raise exception 'Reabertura após sorteio aceita'; end if;
    end loop;
  end loop;
  -- Empty, one-team and oversized categories must leave no partial draw.
  foreach n in array array[0,1,65] loop
    boundary_t := public.create_tournament('Limites sorteio',current_date+7,current_date+8,array['Open']);
    select id into boundary_category from public.tournament_categories where tournament_id=boundary_t.id;
    perform public.set_tournament_status(boundary_t.id,'open');
    for i in 1..n loop
      perform public.register_tournament_team(boundary_t.id,boundary_category,array[athletes[2*i-1],athletes[2*i]]);
    end loop;
    perform public.set_tournament_status(boundary_t.id,'closed');
    rejected:=false;
    begin perform public.draw_tournament_category(boundary_t.id,boundary_category,3);
    exception when invalid_parameter_value then rejected:=true; end;
    if not rejected or exists(select 1 from public.tournament_groups where category_id=boundary_category)
      or exists(select 1 from public.tournament_categories where id=boundary_category and drawn_at is not null)
      then raise exception 'Limite inválido aceito ou deixou sorteio parcial'; end if;
  end loop;
  -- Staff can read but cannot write or draw.
  perform set_config('request.jwt.claim.sub','b9191919-bbbb-4919-8919-191919191912',true);
  if not exists(select 1 from public.tournament_matches where category_id=category) then raise exception 'Recepção não consegue consultar'; end if;
  rejected:=false;
  begin perform public.draw_tournament_category(t.id,category,3);
  exception when insufficient_privilege then rejected:=true; end;
  if not rejected then raise exception 'Recepção sorteou'; end if;
  rejected:=false;
  begin delete from public.tournament_matches where category_id=category;
  exception when insufficient_privilege then rejected:=true; end;
  if not rejected then raise exception 'Escrita direta permitida'; end if;
  perform set_config('request.jwt.claim.sub','c9191919-cccc-4919-8919-191919191913',true);
  if exists(select 1 from public.tournament_groups) or exists(select 1 from public.tournament_group_teams)
    or exists(select 1 from public.tournament_matches) then raise exception 'Professor vê sorteios'; end if;
  perform set_config('request.jwt.claim.sub','d9191919-dddd-4919-8919-191919191914',true);
  if exists(select 1 from public.tournament_groups) or exists(select 1 from public.tournament_group_teams)
    or exists(select 1 from public.tournament_matches) then raise exception 'Vazamento entre arenas'; end if;
  rejected:=false;
  begin perform public.draw_tournament_category(t.id,category,3);
  exception when no_data_found then rejected:=true; end;
  if not rejected then raise exception 'Outra arena sorteou'; end if;
end; $$;
rollback;
