-- Execute em um projeto de desenvolvimento com permissão SQL administrativa.
-- Todas as linhas de teste são removidas por ROLLBACK.
begin;

insert into auth.users (id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

insert into public.tenants (id, name, slug, owner_user_id) values
  ('11111111-aaaa-4111-8111-111111111111', 'Arena Teste A', 'arena-a-reservations-test', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('22222222-bbbb-4222-8222-222222222222', 'Arena Teste B', 'arena-b-reservations-test', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

insert into public.profiles (id, tenant_id, name, email, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-aaaa-4111-8111-111111111111', 'Proprietário A', 'owner-a@example.invalid', 'OWNER'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-aaaa-4111-8111-111111111111', 'Professor A', 'coach-a@example.invalid', 'COACH');

insert into public.courts (id, tenant_id, name, sport, price_per_hour, opening_time, closing_time, created_by) values
  ('33333333-aaaa-4333-8333-333333333333', '11111111-aaaa-4111-8111-111111111111', 'Quadra A', 'Futevôlei', 120.00, '08:00', '22:00', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('44444444-bbbb-4444-8444-444444444444', '22222222-bbbb-4222-8222-222222222222', 'Quadra B', 'Futevôlei', 120.00, '08:00', '22:00', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

insert into public.customers (id, tenant_id, name, phone, created_by) values
  ('55555555-aaaa-4555-8555-555555555555', '11111111-aaaa-4111-8111-111111111111', 'Cliente Teste', '(11) 99999-9999', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

set local role authenticated;

do $$
declare
  first_id uuid;
  first_price numeric;
  conflict_rejected boolean := false;
  transition_rejected boolean := false;
  coach_write_rejected boolean := false;
begin
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);

  if (select count(*) from public.courts) <> 1 then
    raise exception 'RLS permitiu leitura de outra arena';
  end if;

  insert into public.reservations (tenant_id, court_id, customer_id, kind, start_at, end_at)
  values ('11111111-aaaa-4111-8111-111111111111', '33333333-aaaa-4333-8333-333333333333', '55555555-aaaa-4555-8555-555555555555', 'booking', '2026-09-25 09:00-03', '2026-09-25 10:00-03')
  returning id, price into first_id, first_price;

  if first_price <> 120 then raise exception 'Preço incorreto: %', first_price; end if;

  begin
    insert into public.reservations (tenant_id, court_id, customer_id, kind, start_at, end_at)
    values ('11111111-aaaa-4111-8111-111111111111', '33333333-aaaa-4333-8333-333333333333', '55555555-aaaa-4555-8555-555555555555', 'booking', '2026-09-25 09:30-03', '2026-09-25 10:30-03');
  exception when exclusion_violation then conflict_rejected := true;
  end;
  if not conflict_rejected then raise exception 'Sobreposição foi aceita'; end if;

  insert into public.reservations (tenant_id, court_id, customer_id, kind, start_at, end_at)
  values ('11111111-aaaa-4111-8111-111111111111', '33333333-aaaa-4333-8333-333333333333', '55555555-aaaa-4555-8555-555555555555', 'booking', '2026-09-25 10:00-03', '2026-09-25 11:00-03');

  if (select count(*) from public.reservations) <> 2 then
    raise exception 'Intervalos adjacentes foram rejeitados';
  end if;

  update public.reservations set status = 'checked_in' where id = first_id;
  update public.reservations set status = 'completed' where id = first_id;
  begin
    update public.reservations set status = 'confirmed' where id = first_id;
  exception when check_violation then transition_rejected := true;
  end;
  if not transition_rejected then raise exception 'Transição inválida foi aceita'; end if;

  perform set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', true);
  if (select count(*) from public.reservations) <> 2 then
    raise exception 'Professor não consegue consultar a agenda';
  end if;
  begin
    insert into public.reservations (tenant_id, court_id, kind, start_at, end_at)
    values ('11111111-aaaa-4111-8111-111111111111', '33333333-aaaa-4333-8333-333333333333', 'block', '2026-09-25 12:00-03', '2026-09-25 13:00-03');
  exception when insufficient_privilege then coach_write_rejected := true;
  end;
  if not coach_write_rejected then raise exception 'Professor conseguiu escrever na agenda'; end if;
end $$;

select 'reservations_database_tests_passed' as result;
rollback;
