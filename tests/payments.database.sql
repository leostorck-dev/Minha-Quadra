-- Executar em transação: os dados de teste são removidos por ROLLBACK.
begin;

insert into auth.users (id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbba');

insert into public.tenants (id, name, slug, owner_user_id) values
  ('11111111-aaaa-4111-8111-111111111112', 'Arena Pagamento A', 'arena-a-payments-test', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab'),
  ('22222222-bbbb-4222-8222-222222222223', 'Arena Pagamento B', 'arena-b-payments-test', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbba');

insert into public.profiles (id, tenant_id, name, email, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab', '11111111-aaaa-4111-8111-111111111112', 'Proprietário A', 'owner-payment-a@example.invalid', 'OWNER'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbba', '22222222-bbbb-4222-8222-222222222223', 'Proprietário B', 'owner-payment-b@example.invalid', 'OWNER');

insert into public.courts (id, tenant_id, name, sport, price_per_hour, opening_time, closing_time, created_by) values
  ('33333333-aaaa-4333-8333-333333333334', '11111111-aaaa-4111-8111-111111111112', 'Quadra A', 'Futevôlei', 120, '08:00', '22:00', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab');

insert into public.customers (id, tenant_id, name, phone, created_by) values
  ('55555555-aaaa-4555-8555-555555555556', '11111111-aaaa-4111-8111-111111111112', 'Cliente', '(11) 99999-9999', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab');

set local role authenticated;

do $$
declare
  booking_id uuid;
  paid_id uuid;
  duplicate_rejected boolean := false;
  second_refund_rejected boolean := false;
  schedule_change_rejected boolean := false;
begin
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab', true);
  insert into public.reservations (tenant_id, court_id, customer_id, kind, start_at, end_at)
  values ('11111111-aaaa-4111-8111-111111111112', '33333333-aaaa-4333-8333-333333333334', '55555555-aaaa-4555-8555-555555555556', 'booking', '2026-09-25 09:00-03', '2026-09-25 10:00-03')
  returning id into booking_id;

  insert into public.payments (tenant_id, reservation_id, method)
  values ('11111111-aaaa-4111-8111-111111111112', booking_id, 'PIX')
  returning id into paid_id;
  if (select amount from public.payments where id = paid_id) <> 120 then
    raise exception 'Valor do pagamento incorreto';
  end if;
  if (select count(*) from public.financial_transactions
      where source_type = 'reservation' and source_id = paid_id
        and type = 'income' and status = 'paid' and amount = 120) <> 1 then
    raise exception 'Receita da reserva não foi criada';
  end if;

  begin
    insert into public.payments (tenant_id, reservation_id, method)
    values ('11111111-aaaa-4111-8111-111111111112', booking_id, 'CASH');
  exception when unique_violation then duplicate_rejected := true;
  end;
  if not duplicate_rejected then raise exception 'Pagamento duplicado foi aceito'; end if;

  begin
    update public.reservations set end_at = '2026-09-25 10:30-03' where id = booking_id;
  exception when check_violation then schedule_change_rejected := true;
  end;
  if not schedule_change_rejected then raise exception 'Reserva paga pôde ser alterada'; end if;

  update public.payments set status = 'refunded' where id = paid_id;
  if (select count(*) from public.payment_events where payment_id = paid_id) <> 2 then
    raise exception 'Histórico de pagamento incompleto';
  end if;
  if (select count(*) from public.financial_transactions
      where source_type = 'refund' and source_id = paid_id
        and type = 'expense' and status = 'paid' and amount = 120) <> 1 then
    raise exception 'Despesa de estorno não foi criada';
  end if;
  begin
    update public.payments set status = 'refunded' where id = paid_id;
  exception when check_violation then second_refund_rejected := true;
  end;
  if not second_refund_rejected then raise exception 'Segundo estorno foi aceito'; end if;

  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbba', true);
  if (select count(*) from public.payments where id = paid_id) <> 0 then
    raise exception 'Outra arena leu o pagamento';
  end if;
  if (select count(*) from public.financial_transactions
      where source_id = paid_id) <> 0 then
    raise exception 'Outra arena leu o financeiro';
  end if;
end $$;

select 'payments_database_tests_passed' as result;
rollback;
