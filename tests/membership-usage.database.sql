-- Cenário transacional: período, presença, ilimitado, nova adesão e RLS.
begin;
insert into auth.users (id, email, email_confirmed_at) values
  ('a7777777-aaaa-4777-8777-777777777771', 'usage-owner-a@example.invalid', now()),
  ('b7777777-bbbb-4777-8777-777777777772', 'usage-owner-b@example.invalid', now());
insert into public.tenants (id, name, slug, owner_user_id) values
  ('a8888888-aaaa-4888-8888-888888888881', 'Arena Consumo A', 'arena-usage-a-test', 'a7777777-aaaa-4777-8777-777777777771'),
  ('b8888888-bbbb-4888-8888-888888888882', 'Arena Consumo B', 'arena-usage-b-test', 'b7777777-bbbb-4777-8777-777777777772');
insert into public.profiles (id, tenant_id, name, email, role) values
  ('a7777777-aaaa-4777-8777-777777777771', 'a8888888-aaaa-4888-8888-888888888881', 'Dono A', 'usage-owner-a@example.invalid', 'OWNER'),
  ('b7777777-bbbb-4777-8777-777777777772', 'b8888888-bbbb-4888-8888-888888888882', 'Dono B', 'usage-owner-b@example.invalid', 'OWNER');
select set_config('request.jwt.claim.sub', 'a7777777-aaaa-4777-8777-777777777771', true);
select set_config('request.jwt.claims', '{"sub":"a7777777-aaaa-4777-8777-777777777771","role":"authenticated"}', true);
insert into public.courts (id, tenant_id, name, sport, price_per_hour, opening_time, closing_time, created_by)
values ('a9999999-aaaa-4999-8999-999999999991', 'a8888888-aaaa-4888-8888-888888888881',
  'Quadra Consumo', 'Futevôlei', 100, '08:00', '22:00', 'a7777777-aaaa-4777-8777-777777777771');
insert into public.customers (id, tenant_id, name, phone, created_by) values
  ('a6666666-aaaa-4666-8666-666666666661', 'a8888888-aaaa-4888-8888-888888888881', 'Cliente Limitado', '11999990061', 'a7777777-aaaa-4777-8777-777777777771'),
  ('b6666666-bbbb-4666-8666-666666666662', 'a8888888-aaaa-4888-8888-888888888881', 'Cliente Ilimitado', '11999990062', 'a7777777-aaaa-4777-8777-777777777771');

set local role authenticated;
do $$
declare
  v_limited public.membership_plans;
  v_unlimited public.membership_plans;
  v_membership public.customer_memberships;
  v_unlimited_membership public.customer_memberships;
  v_coach public.coaches;
  v_class_one public.class_sessions;
  v_class_two public.class_sessions;
  v_pending public.class_sessions;
  v_cancelled public.class_sessions;
  v_cycle date;
  v_start date := (date_trunc('month', (now() at time zone 'America/Sao_Paulo')::date)::date - interval '1 month' + interval '9 days')::date;
begin
  v_limited := public.create_membership_plan('Uma aula', 100, 1);
  v_unlimited := public.create_membership_plan('Ilimitado', 200, null);
  v_membership := public.enroll_customer_membership('a6666666-aaaa-4666-8666-666666666661', v_limited.id, v_start);
  v_unlimited_membership := public.enroll_customer_membership('b6666666-bbbb-4666-8666-666666666662', v_unlimited.id, v_start);
  select cycle_start into v_cycle from public.membership_class_usage where membership_id = v_membership.id;
  if v_cycle is null then raise exception 'Período não criado'; end if;
  v_coach := public.create_coach('Professor Consumo', null, null, array['Futevôlei'], 'fixed', 0, null);
  v_class_one := public.create_class(v_coach.id, 'a9999999-aaaa-4999-8999-999999999991', 'duo',
    (v_cycle + 2 + time '10:00') at time zone 'America/Sao_Paulo',
    (v_cycle + 2 + time '11:00') at time zone 'America/Sao_Paulo', 100,
    array['a6666666-aaaa-4666-8666-666666666661','b6666666-bbbb-4666-8666-666666666662']::uuid[]);
  v_class_two := public.create_class(v_coach.id, 'a9999999-aaaa-4999-8999-999999999991', 'individual',
    (v_cycle + 3 + time '10:00') at time zone 'America/Sao_Paulo',
    (v_cycle + 3 + time '11:00') at time zone 'America/Sao_Paulo', 100,
    array['a6666666-aaaa-4666-8666-666666666661']::uuid[]);
  v_pending := public.create_class(v_coach.id, 'a9999999-aaaa-4999-8999-999999999991', 'individual',
    (v_cycle + 4 + time '10:00') at time zone 'America/Sao_Paulo',
    (v_cycle + 4 + time '11:00') at time zone 'America/Sao_Paulo', 100,
    array['a6666666-aaaa-4666-8666-666666666661']::uuid[]);
  v_cancelled := public.create_class(v_coach.id, 'a9999999-aaaa-4999-8999-999999999991', 'individual',
    (v_cycle + 5 + time '10:00') at time zone 'America/Sao_Paulo',
    (v_cycle + 5 + time '11:00') at time zone 'America/Sao_Paulo', 100,
    array['a6666666-aaaa-4666-8666-666666666661']::uuid[]);
  perform public.cancel_class(v_cancelled.id);
end; $$;

-- O fixture marca duas aulas concluídas; uma presença no plano ilimitado.
reset role;
update public.class_students set attendance = 'present' where class_id in (
  select c.id from public.class_sessions c
  join public.reservations r on r.id = c.reservation_id
  where c.tenant_id = 'a8888888-aaaa-4888-8888-888888888881' and c.status = 'scheduled'
  order by r.start_at limit 2
);
update public.class_sessions set status = 'completed', completed_at = now() where id in (
  select c.id from public.class_sessions c
  join public.reservations r on r.id = c.reservation_id
  where c.tenant_id = 'a8888888-aaaa-4888-8888-888888888881' and c.status = 'scheduled'
  order by r.start_at limit 2
);
set local role authenticated;
do $$
declare
  v_membership public.customer_memberships;
  v_unlimited_membership public.customer_memberships;
  v_limited public.membership_plans;
  v_cycle date;
begin
  select * into v_membership from public.customer_memberships
    where customer_id = 'a6666666-aaaa-4666-8666-666666666661' and status = 'active';
  select * into v_unlimited_membership from public.customer_memberships
    where customer_id = 'b6666666-bbbb-4666-8666-666666666662' and status = 'active';
  select * into v_limited from public.membership_plans where id = v_membership.plan_id;
  select cycle_start into v_cycle from public.membership_class_usage where membership_id = v_membership.id;

  if (select attended_classes from public.membership_class_usage where membership_id = v_membership.id) <> 2
    then raise exception 'Presenças do plano limitado incorretas'; end if;
  if (select remaining_classes from public.membership_class_usage where membership_id = v_membership.id) <> 0
    then raise exception 'Saldo do plano limitado incorreto'; end if;
  if (select attended_classes from public.membership_class_usage where membership_id = v_unlimited_membership.id) <> 1
    then raise exception 'Presenças do plano ilimitado incorretas'; end if;
  if (select remaining_classes from public.membership_class_usage where membership_id = v_unlimited_membership.id) is not null
    then raise exception 'Ilimitado tem saldo finito'; end if;

  perform public.cancel_customer_membership(v_membership.id);
  v_membership := public.enroll_customer_membership('a6666666-aaaa-4666-8666-666666666661', v_limited.id, v_cycle + 10);
  if (select attended_classes from public.membership_class_usage where membership_id = v_membership.id) <> 0
    then raise exception 'Nova adesão herdou aulas antigas'; end if;
  perform set_config('request.jwt.claim.sub', 'b7777777-bbbb-4777-8777-777777777772', true);
  perform set_config('request.jwt.claims', '{"sub":"b7777777-bbbb-4777-8777-777777777772","role":"authenticated"}', true);
  if (select count(*) from public.membership_class_usage) <> 0
    then raise exception 'Outra arena vê consumo'; end if;
end; $$;
rollback;
