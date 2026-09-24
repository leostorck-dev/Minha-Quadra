-- Executar em transação: os dados de teste são removidos por ROLLBACK.
begin;

insert into auth.users (id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbd'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccd');

insert into public.tenants (id, name, slug, owner_user_id) values
  ('11111111-aaaa-4111-8111-111111111114', 'Arena Painel A', 'arena-a-dashboard-test', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad'),
  ('22222222-bbbb-4222-8222-222222222225', 'Arena Painel B', 'arena-b-dashboard-test', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbd');

insert into public.profiles (id, tenant_id, name, email, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad', '11111111-aaaa-4111-8111-111111111114', 'Proprietário A', 'owner-dashboard-a@example.invalid', 'OWNER'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbd', '22222222-bbbb-4222-8222-222222222225', 'Proprietário B', 'owner-dashboard-b@example.invalid', 'OWNER'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccd', '11111111-aaaa-4111-8111-111111111114', 'Recepção A', 'reception-dashboard-a@example.invalid', 'RECEPTIONIST');

insert into public.courts (id, tenant_id, name, sport, price_per_hour, opening_time, closing_time, created_by) values
  ('33333333-aaaa-4333-8333-333333333335', '11111111-aaaa-4111-8111-111111111114', 'Quadra A', 'Futevôlei', 100, '08:00', '22:00', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad');

insert into public.customers (id, tenant_id, name, phone, created_by) values
  ('55555555-aaaa-4555-8555-555555555557', '11111111-aaaa-4111-8111-111111111114', 'Cliente ativo', '(11) 99999-9999', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad');

set local role authenticated;

do $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_booking uuid;
  v_result jsonb;
begin
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad', true);
  insert into public.reservations (tenant_id, court_id, customer_id, kind, start_at, end_at)
  values (
    '11111111-aaaa-4111-8111-111111111114',
    '33333333-aaaa-4333-8333-333333333335',
    '55555555-aaaa-4555-8555-555555555557', 'booking',
    (v_today + time '09:00') at time zone 'America/Sao_Paulo',
    (v_today + time '10:00') at time zone 'America/Sao_Paulo'
  ) returning id into v_booking;
  insert into public.reservations (tenant_id, court_id, kind, start_at, end_at)
  values (
    '11111111-aaaa-4111-8111-111111111114',
    '33333333-aaaa-4333-8333-333333333335', 'block',
    (v_today + time '11:00') at time zone 'America/Sao_Paulo',
    (v_today + time '12:00') at time zone 'America/Sao_Paulo'
  );
  insert into public.reservations (tenant_id, court_id, customer_id, kind, start_at, end_at)
  values (
    '11111111-aaaa-4111-8111-111111111114',
    '33333333-aaaa-4333-8333-333333333335',
    '55555555-aaaa-4555-8555-555555555557', 'booking',
    (v_today + 1 + time '09:00') at time zone 'America/Sao_Paulo',
    (v_today + 1 + time '10:00') at time zone 'America/Sao_Paulo'
  );
  insert into public.payments (tenant_id, reservation_id, method)
  values ('11111111-aaaa-4111-8111-111111111114', v_booking, 'PIX');

  v_result := public.dashboard_overview();
  if (v_result->>'bookingsToday')::bigint <> 1
    or (v_result->>'activeCustomers')::bigint <> 1
    or (v_result->>'occupancyPercent')::numeric <= 0
    or (v_result->'financial'->>'todayIncome')::numeric <> 100
    or (v_result->'financial'->>'monthIncome')::numeric <> 100
    or (v_result->'financial'->>'averageTicket')::numeric <> 100
    or jsonb_array_length(v_result->'financial'->'revenueSeries') <> 6
    or jsonb_array_length(v_result->'upcoming') < 1 then
    raise exception 'Indicadores do proprietário incorretos: %', v_result;
  end if;

  perform set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccd', true);
  v_result := public.dashboard_overview();
  if v_result->'financial' <> 'null'::jsonb
    or (v_result->>'bookingsToday')::bigint <> 1 then
    raise exception 'Recepção recebeu dados financeiros ou perdeu dados operacionais: %', v_result;
  end if;

  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbd', true);
  v_result := public.dashboard_overview();
  if (v_result->>'bookingsToday')::bigint <> 0
    or (v_result->'financial'->>'monthIncome')::numeric <> 0
    or jsonb_array_length(v_result->'upcoming') <> 0 then
    raise exception 'Outra arena recebeu dados: %', v_result;
  end if;
end $$;

select 'dashboard_database_tests_passed' as result;
rollback;
