-- Cenário transacional: atividade, limites de segmentos e isolamento RLS.
begin;
insert into auth.users (id, email, email_confirmed_at) values
  ('a9999999-aaaa-4aaa-8aaa-aaaaaaaaaaa9', 'segments-a@example.invalid', now()),
  ('b9999999-bbbb-4bbb-8bbb-bbbbbbbbbbb9', 'segments-b@example.invalid', now()),
  ('c9999999-cccc-4ccc-8ccc-ccccccccccc8', 'segments-coach@example.invalid', now());
insert into public.tenants (id, name, slug, owner_user_id) values
  ('a8888888-aaaa-4aaa-8aaa-aaaaaaaaaaa8', 'Arena Segmentos A', 'arena-segments-a-test', 'a9999999-aaaa-4aaa-8aaa-aaaaaaaaaaa9'),
  ('b8888888-bbbb-4bbb-8bbb-bbbbbbbbbbb8', 'Arena Segmentos B', 'arena-segments-b-test', 'b9999999-bbbb-4bbb-8bbb-bbbbbbbbbbb9');
insert into public.profiles (id, tenant_id, name, email, role) values
  ('a9999999-aaaa-4aaa-8aaa-aaaaaaaaaaa9', 'a8888888-aaaa-4aaa-8aaa-aaaaaaaaaaa8', 'Proprietário A', 'segments-a@example.invalid', 'OWNER'),
  ('b9999999-bbbb-4bbb-8bbb-bbbbbbbbbbb9', 'b8888888-bbbb-4bbb-8bbb-bbbbbbbbbbb8', 'Proprietário B', 'segments-b@example.invalid', 'OWNER'),
  ('c9999999-cccc-4ccc-8ccc-ccccccccccc8', 'a8888888-aaaa-4aaa-8aaa-aaaaaaaaaaa8', 'Professor A', 'segments-coach@example.invalid', 'COACH');

select set_config('request.jwt.claim.sub', 'a9999999-aaaa-4aaa-8aaa-aaaaaaaaaaa9', true);
select set_config('request.jwt.claims', '{"sub":"a9999999-aaaa-4aaa-8aaa-aaaaaaaaaaa9","email":"segments-a@example.invalid","role":"authenticated"}', true);
insert into public.courts (id, tenant_id, name, sport, price_per_hour, opening_time, closing_time, created_by)
values ('c9999999-cccc-4ccc-8ccc-ccccccccccc9', 'a8888888-aaaa-4aaa-8aaa-aaaaaaaaaaa8',
        'Quadra Segmentos', 'Futevôlei', 100, '08:00', '22:00', 'a9999999-aaaa-4aaa-8aaa-aaaaaaaaaaa9');
insert into public.customers (id, tenant_id, name, phone, created_by, birth_date, created_at) values
  ('a1111111-1111-4111-8111-111111111111', 'a8888888-aaaa-4aaa-8aaa-aaaaaaaaaaa8', 'Há vinte dias', '11999990001', 'a9999999-aaaa-4aaa-8aaa-aaaaaaaaaaa9', null, now() - interval '90 days'),
  ('a2222222-2222-4222-8222-222222222222', 'a8888888-aaaa-4aaa-8aaa-aaaaaaaaaaa8', 'Frequente', '11999990002', 'a9999999-aaaa-4aaa-8aaa-aaaaaaaaaaa9', null, now() - interval '90 days'),
  ('a3333333-3333-4333-8333-333333333333', 'a8888888-aaaa-4aaa-8aaa-aaaaaaaaaaa8', 'Tem reserva futura', '11999990003', 'a9999999-aaaa-4aaa-8aaa-aaaaaaaaaaa9', null, now() - interval '90 days'),
  ('a4444444-4444-4444-8444-444444444444', 'a8888888-aaaa-4aaa-8aaa-aaaaaaaaaaa8', 'Aniversariante', '11999990004', 'a9999999-aaaa-4aaa-8aaa-aaaaaaaaaaa9', make_date(1990, extract(month from now() at time zone 'America/Sao_Paulo')::int, 15), now() - interval '90 days'),
  ('a5555555-5555-4555-8555-555555555555', 'a8888888-aaaa-4aaa-8aaa-aaaaaaaaaaa8', 'Cliente novo', '11999990005', 'a9999999-aaaa-4aaa-8aaa-aaaaaaaaaaa9', null, now() - interval '5 days');

do $$
declare
  local_day date := (now() at time zone 'America/Sao_Paulo')::date;
  n int;
  visit_day date;
  target uuid;
  excluded_id uuid;
begin
  for n in 1..14 loop
    if n = 1 then
      visit_day := local_day - 20;
      target := 'a1111111-1111-4111-8111-111111111111';
    elsif n <= 12 then
      visit_day := local_day - (49 + n);
      target := 'a2222222-2222-4222-8222-222222222222';
    elsif n = 13 then
      visit_day := local_day - 40;
      target := 'a3333333-3333-4333-8333-333333333333';
    else
      visit_day := local_day + 3;
      target := 'a3333333-3333-4333-8333-333333333333';
    end if;
    insert into public.reservations (tenant_id, court_id, customer_id, kind, start_at, end_at)
    values (
      'a8888888-aaaa-4aaa-8aaa-aaaaaaaaaaa8',
      'c9999999-cccc-4ccc-8ccc-ccccccccccc9', target, 'booking',
      (visit_day + time '10:00') at time zone 'America/Sao_Paulo',
      (visit_day + time '11:00') at time zone 'America/Sao_Paulo'
    );
  end loop;
  insert into public.reservations (tenant_id, court_id, customer_id, kind, start_at, end_at)
  values ('a8888888-aaaa-4aaa-8aaa-aaaaaaaaaaa8',
          'c9999999-cccc-4ccc-8ccc-ccccccccccc9',
          'a2222222-2222-4222-8222-222222222222', 'booking',
          ((local_day - 45) + time '10:00') at time zone 'America/Sao_Paulo',
          ((local_day - 45) + time '11:00') at time zone 'America/Sao_Paulo')
  returning id into excluded_id;
  update public.reservations set status = 'cancelled' where id = excluded_id;
  insert into public.reservations (tenant_id, court_id, customer_id, kind, start_at, end_at)
  values ('a8888888-aaaa-4aaa-8aaa-aaaaaaaaaaa8',
          'c9999999-cccc-4ccc-8ccc-ccccccccccc9',
          'a2222222-2222-4222-8222-222222222222', 'booking',
          ((local_day - 44) + time '10:00') at time zone 'America/Sao_Paulo',
          ((local_day - 44) + time '11:00') at time zone 'America/Sao_Paulo')
  returning id into excluded_id;
  update public.reservations set status = 'no_show' where id = excluded_id;
end;
$$;

select set_config('request.jwt.claim.sub', 'b9999999-bbbb-4bbb-8bbb-bbbbbbbbbbb9', true);
select set_config('request.jwt.claims', '{"sub":"b9999999-bbbb-4bbb-8bbb-bbbbbbbbbbb9","email":"segments-b@example.invalid","role":"authenticated"}', true);
insert into public.customers (id, tenant_id, name, phone, created_by)
values ('b1111111-1111-4111-8111-111111111111', 'b8888888-bbbb-4bbb-8bbb-bbbbbbbbbbb8',
        'Outro tenant', '11999990006', 'b9999999-bbbb-4bbb-8bbb-bbbbbbbbbbb9');

set local role authenticated;
do $$
begin
  perform set_config('request.jwt.claim.sub', 'a9999999-aaaa-4aaa-8aaa-aaaaaaaaaaa9', true);
  perform set_config('request.jwt.claims', '{"sub":"a9999999-aaaa-4aaa-8aaa-aaaaaaaaaaa9","email":"segments-a@example.invalid","role":"authenticated"}', true);
  if (select count(*) from public.customer_crm) <> 5 then raise exception 'Arena A vê clientes incorretos'; end if;
  if (select reservation_count from public.customer_crm where id = 'a2222222-2222-4222-8222-222222222222') <> 11
    then raise exception 'Contagem de reservas incorreta'; end if;
  if (select count(*) from public.customer_crm
      where last_reservation_at < now() - interval '15 days' and not has_upcoming) <> 2
    then raise exception 'Segmento 15 dias incorreto'; end if;
  if (select count(*) from public.customer_crm
      where last_reservation_at < now() - interval '30 days' and not has_upcoming) <> 1
    then raise exception 'Segmento 30 dias incorreto'; end if;
  if (select count(*) from public.customer_crm where reservation_count > 10) <> 1
    then raise exception 'Segmento frequente incorreto'; end if;
  if (select count(*) from public.customer_crm
      where birth_month = extract(month from now() at time zone 'America/Sao_Paulo')) <> 1
    then raise exception 'Aniversariantes incorretos'; end if;
  if (select count(*) from public.customer_crm where created_at >= now() - interval '30 days') <> 1
    then raise exception 'Clientes novos incorretos'; end if;
  perform set_config('request.jwt.claim.sub', 'c9999999-cccc-4ccc-8ccc-ccccccccccc8', true);
  perform set_config('request.jwt.claims', '{"sub":"c9999999-cccc-4ccc-8ccc-ccccccccccc8","email":"segments-coach@example.invalid","role":"authenticated"}', true);
  if (select count(*) from public.customer_crm) <> 0 then raise exception 'Professor vê CRM'; end if;
  perform set_config('request.jwt.claim.sub', 'b9999999-bbbb-4bbb-8bbb-bbbbbbbbbbb9', true);
  perform set_config('request.jwt.claims', '{"sub":"b9999999-bbbb-4bbb-8bbb-bbbbbbbbbbb9","email":"segments-b@example.invalid","role":"authenticated"}', true);
  if (select count(*) from public.customer_crm) <> 1 then raise exception 'Outra arena vê CRM alheio'; end if;
end;
$$;
rollback;
