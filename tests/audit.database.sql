-- Executar em transação: os dados de teste são removidos por ROLLBACK.
begin;

insert into auth.users (id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbe'),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccce');

insert into public.tenants (id, name, slug, owner_user_id) values
  ('11111111-aaaa-4111-8111-111111111115', 'Arena Auditoria A', 'arena-a-audit-test', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae'),
  ('22222222-bbbb-4222-8222-222222222226', 'Arena Auditoria B', 'arena-b-audit-test', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbe');

insert into public.profiles (id, tenant_id, name, email, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae', '11111111-aaaa-4111-8111-111111111115', 'Proprietário A', 'owner-audit-a@example.invalid', 'OWNER'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbe', '22222222-bbbb-4222-8222-222222222226', 'Proprietário B', 'owner-audit-b@example.invalid', 'OWNER'),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccce', '11111111-aaaa-4111-8111-111111111115', 'Recepção A', 'reception-audit-a@example.invalid', 'RECEPTIONIST');

insert into public.courts (id, tenant_id, name, sport, price_per_hour, opening_time, closing_time, created_by) values
  ('33333333-aaaa-4333-8333-333333333336', '11111111-aaaa-4111-8111-111111111115', 'Quadra A', 'Futevôlei', 100, '08:00', '22:00', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae');

set local role authenticated;

do $$
declare
  v_day date := (now() at time zone 'America/Sao_Paulo')::date + 2;
  v_customer uuid;
  v_reservation uuid;
  v_cancelled uuid;
  v_payment uuid;
  v_direct_rejected boolean := false;
  v_update_rejected boolean := false;
begin
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae', true);
  insert into public.customers (tenant_id, name, phone, email, notes, created_by)
  values (
    '11111111-aaaa-4111-8111-111111111115', 'Cliente privado',
    '(11) 98888-7777', 'private-audit@example.invalid', 'Observação confidencial',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae'
  ) returning id into v_customer;
  update public.customers set phone = '(11) 97777-6666' where id = v_customer;

  insert into public.reservations (tenant_id, court_id, customer_id, kind, start_at, end_at)
  values (
    '11111111-aaaa-4111-8111-111111111115',
    '33333333-aaaa-4333-8333-333333333336', v_customer, 'booking',
    (v_day + time '09:00') at time zone 'America/Sao_Paulo',
    (v_day + time '10:00') at time zone 'America/Sao_Paulo'
  ) returning id into v_reservation;
  update public.reservations
    set start_at = (v_day + time '10:00') at time zone 'America/Sao_Paulo',
        end_at = (v_day + time '11:00') at time zone 'America/Sao_Paulo'
  where id = v_reservation;
  insert into public.reservations (tenant_id, court_id, customer_id, kind, start_at, end_at)
  values (
    '11111111-aaaa-4111-8111-111111111115',
    '33333333-aaaa-4333-8333-333333333336', v_customer, 'booking',
    (v_day + time '12:00') at time zone 'America/Sao_Paulo',
    (v_day + time '13:00') at time zone 'America/Sao_Paulo'
  ) returning id into v_cancelled;
  update public.reservations set status = 'cancelled' where id = v_cancelled;

  insert into public.payments (tenant_id, reservation_id, method)
  values ('11111111-aaaa-4111-8111-111111111115', v_reservation, 'PIX')
  returning id into v_payment;

  perform set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-ccccccccccce', true);
  update public.payments set status = 'refunded' where id = v_payment;
  update public.reservations set status = 'checked_in' where id = v_reservation;
  update public.reservations set status = 'completed' where id = v_reservation;
  update public.customers set status = 'inactive' where id = v_customer;

  if (select count(*) from public.audit_logs) <> 0 then
    raise exception 'Recepção leu o log';
  end if;

  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae', true);
  if (select count(*) from public.audit_logs
      where tenant_id = '11111111-aaaa-4111-8111-111111111115') <> 11 then
    raise exception 'Quantidade de eventos incorreta';
  end if;
  if (select count(*) from public.audit_logs
      where event in ('payment.created', 'payment.refunded')) <> 2 then
    raise exception 'Eventos de pagamento incompletos';
  end if;
  if (select count(*) from public.audit_logs
      where event in ('customer.deactivated', 'reservation.cancelled',
                      'reservation.checked_in', 'reservation.completed')) <> 4 then
    raise exception 'Eventos de transição incompletos';
  end if;
  if (select count(*) from public.audit_logs
      where actor_id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccce') <> 4 then
    raise exception 'Responsável não foi registrado';
  end if;
  if exists (
    select 1 from public.audit_logs
    where details::text ~ '(98888-7777|97777-6666|private-audit|Observação confidencial)'
  ) then
    raise exception 'Contato ou observação privada vazou no log';
  end if;

  begin
    insert into public.audit_logs (tenant_id, event, entity_type, entity_id, actor_id, actor_name)
    values (
      '11111111-aaaa-4111-8111-111111111115', 'customer.created', 'customer',
      v_customer, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae', 'Falso'
    );
  exception when insufficient_privilege then v_direct_rejected := true;
  end;
  if not v_direct_rejected then raise exception 'Log pôde ser forjado'; end if;

  begin
    update public.audit_logs set actor_name = 'Falso' where entity_id = v_customer;
  exception when insufficient_privilege then v_update_rejected := true;
  end;
  if not v_update_rejected then raise exception 'Log pôde ser editado'; end if;

  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbe', true);
  if (select count(*) from public.audit_logs) <> 0 then
    raise exception 'Outra arena leu o log';
  end if;
end $$;

select 'audit_database_tests_passed' as result;
rollback;
