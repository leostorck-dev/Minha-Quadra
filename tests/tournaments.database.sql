-- Teste transacional: categorias, duplas, retirada, situação e isolamento.
begin;
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

set local role authenticated;
do $$
declare
  v_tournament public.tournaments;
  v_open uuid;
  v_mista uuid;
  v_team public.tournament_teams;
  v_new_team public.tournament_teams;
  rejected boolean;
begin
  rejected := false;
  begin perform public.create_tournament('Categorias repetidas', current_date + 7,
    current_date + 8, array['Open', 'Open']);
  exception when invalid_parameter_value then rejected := true; end;
  if not rejected then raise exception 'Categorias repetidas aceitas'; end if;

  v_tournament := public.create_tournament('Torneio de duplas', current_date + 7,
    current_date + 8, array['Open', 'Mista']);
  if v_tournament.status <> 'draft' then raise exception 'Torneio não iniciou em rascunho'; end if;
  select id into v_open from public.tournament_categories
    where tournament_id = v_tournament.id and name = 'Open';
  select id into v_mista from public.tournament_categories
    where tournament_id = v_tournament.id and name = 'Mista';
  rejected := false;
  begin perform public.register_tournament_team(v_tournament.id, v_open,
    array['a9393939-aaaa-4939-8939-393939393931','b9393939-bbbb-4939-8939-393939393932']::uuid[]);
  exception when invalid_parameter_value then rejected := true; end;
  if not rejected then raise exception 'Inscrição em rascunho aceita'; end if;
  perform public.set_tournament_status(v_tournament.id, 'open');

  perform set_config('request.jwt.claim.sub', 'b9191919-bbbb-4919-8919-191919191912', true);
  perform set_config('request.jwt.claims', '{"sub":"b9191919-bbbb-4919-8919-191919191912","role":"authenticated"}', true);
  v_team := public.register_tournament_team(v_tournament.id, v_open,
    array['a9393939-aaaa-4939-8939-393939393931','b9393939-bbbb-4939-8939-393939393932']::uuid[]);
  if (select count(*) from public.tournament_team_members
    where team_id = v_team.id and active) <> 2 then
    raise exception 'Dupla não tem dois atletas'; end if;
  rejected := false;
  begin perform public.register_tournament_team(v_tournament.id, v_open,
    array['a9393939-aaaa-4939-8939-393939393931','c9393939-cccc-4939-8939-393939393933']::uuid[]);
  exception when unique_violation then rejected := true; end;
  if not rejected then raise exception 'Atleta inscrito duas vezes na categoria'; end if;
  perform public.register_tournament_team(v_tournament.id, v_mista,
    array['a9393939-aaaa-4939-8939-393939393931','c9393939-cccc-4939-8939-393939393933']::uuid[]);
  perform public.withdraw_tournament_team(v_tournament.id, v_team.id);
  if (select count(*) from public.tournament_team_members
    where team_id = v_team.id and active) <> 0 then
    raise exception 'Atletas da dupla retirada continuam ativos'; end if;
  v_new_team := public.register_tournament_team(v_tournament.id, v_open,
    array['a9393939-aaaa-4939-8939-393939393931','b9393939-bbbb-4939-8939-393939393932']::uuid[]);
  if v_new_team.id = v_team.id then raise exception 'Nova inscrição não foi criada'; end if;
  rejected := false;
  begin perform public.set_tournament_status(v_tournament.id, 'closed');
  exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'Recepção fechou inscrições'; end if;

  perform set_config('request.jwt.claim.sub', 'a9191919-aaaa-4919-8919-191919191911', true);
  perform set_config('request.jwt.claims', '{"sub":"a9191919-aaaa-4919-8919-191919191911","role":"authenticated"}', true);
  perform public.set_tournament_status(v_tournament.id, 'closed');
  rejected := false;
  begin perform public.register_tournament_team(v_tournament.id, v_open,
    array['b9393939-bbbb-4939-8939-393939393932','c9393939-cccc-4939-8939-393939393933']::uuid[]);
  exception when invalid_parameter_value then rejected := true; end;
  if not rejected then raise exception 'Inscrição fechada aceita'; end if;

  perform set_config('request.jwt.claim.sub', 'c9191919-cccc-4919-8919-191919191913', true);
  perform set_config('request.jwt.claims', '{"sub":"c9191919-cccc-4919-8919-191919191913","role":"authenticated"}', true);
  if (select count(*) from public.tournaments) <> 0 then
    raise exception 'Professor vê torneios'; end if;
  rejected := false;
  begin perform public.register_tournament_team(v_tournament.id, v_open,
    array['a9393939-aaaa-4939-8939-393939393931','b9393939-bbbb-4939-8939-393939393932']::uuid[]);
  exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'Professor inscreveu dupla'; end if;

  perform set_config('request.jwt.claim.sub', 'd9191919-dddd-4919-8919-191919191914', true);
  perform set_config('request.jwt.claims', '{"sub":"d9191919-dddd-4919-8919-191919191914","role":"authenticated"}', true);
  if (select count(*) from public.tournaments) <> 0 then
    raise exception 'Outra arena vê torneios'; end if;
  rejected := false;
  begin perform public.set_tournament_status(v_tournament.id, 'open');
  exception when no_data_found then rejected := true; end;
  if not rejected then raise exception 'Outra arena alterou torneio'; end if;
end; $$;
rollback;
