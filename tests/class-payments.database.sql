-- Teste transacional: cobrança, estorno, financeiro, cancelamento e isolamento.
begin;
insert into auth.users (id, email, email_confirmed_at) values
  ('a1010101-aaaa-4101-8101-010101010101', 'pay-class-owner@example.invalid', now()),
  ('b1010101-bbbb-4101-8101-010101010102', 'pay-class-coach@example.invalid', now()),
  ('c1010101-cccc-4101-8101-010101010103', 'pay-class-other@example.invalid', now());
insert into public.tenants (id, name, slug, owner_user_id) values
  ('a2020202-aaaa-4202-8202-020202020201', 'Arena Pagamento Aula A', 'arena-class-payment-a-test', 'a1010101-aaaa-4101-8101-010101010101'),
  ('c2020202-cccc-4202-8202-020202020203', 'Arena Pagamento Aula B', 'arena-class-payment-b-test', 'c1010101-cccc-4101-8101-010101010103');
insert into public.profiles (id, tenant_id, name, email, role) values
  ('a1010101-aaaa-4101-8101-010101010101', 'a2020202-aaaa-4202-8202-020202020201', 'Dono', 'pay-class-owner@example.invalid', 'OWNER'),
  ('b1010101-bbbb-4101-8101-010101010102', 'a2020202-aaaa-4202-8202-020202020201', 'Professor', 'pay-class-coach@example.invalid', 'COACH'),
  ('c1010101-cccc-4101-8101-010101010103', 'c2020202-cccc-4202-8202-020202020203', 'Outro dono', 'pay-class-other@example.invalid', 'OWNER');
select set_config('request.jwt.claim.sub', 'a1010101-aaaa-4101-8101-010101010101', true);
select set_config('request.jwt.claims', '{"sub":"a1010101-aaaa-4101-8101-010101010101","role":"authenticated"}', true);
insert into public.courts (id, tenant_id, name, sport, price_per_hour, opening_time, closing_time, created_by)
  values ('a3030303-aaaa-4303-8303-030303030301', 'a2020202-aaaa-4202-8202-020202020201',
  'Quadra Pagamentos', 'Futevôlei', 100, '08:00', '22:00', 'a1010101-aaaa-4101-8101-010101010101');
insert into public.customers (id, tenant_id, name, phone, created_by)
  values ('a4040404-aaaa-4404-8404-040404040401', 'a2020202-aaaa-4202-8202-020202020201',
  'Aluno Pagamento', '11999990001', 'a1010101-aaaa-4101-8101-010101010101');

set local role authenticated;
do $$
declare
  v_coach public.coaches;
  v_class public.class_sessions;
  v_free public.class_sessions;
  v_payment public.class_payments;
  v_start timestamptz := (((now() at time zone 'America/Sao_Paulo')::date + 2) + time '10:00') at time zone 'America/Sao_Paulo';
  rejected boolean;
begin
  v_coach := public.create_coach('Professor Pagamento', null, null, array['Futevôlei'],
    'percentage', 20, 'b1010101-bbbb-4101-8101-010101010102');
  v_class := public.create_class(v_coach.id, 'a3030303-aaaa-4303-8303-030303030301',
    'individual', v_start, v_start + interval '1 hour', 120,
    array['a4040404-aaaa-4404-8404-040404040401']::uuid[]);
  v_free := public.create_class(v_coach.id, 'a3030303-aaaa-4303-8303-030303030301',
    'trial', v_start + interval '2 hours', v_start + interval '3 hours', 0,
    array['a4040404-aaaa-4404-8404-040404040401']::uuid[]);
  rejected := false;
  begin perform public.pay_class(v_free.id, 'PIX');
  exception when invalid_parameter_value then rejected := true; end;
  if not rejected then raise exception 'Aula gratuita aceita pagamento'; end if;
  v_payment := public.pay_class(v_class.id, 'PIX');
  if v_payment.amount <> 120 or v_payment.status <> 'paid' then
    raise exception 'Pagamento não usou valor da aula'; end if;
  if (select count(*) from public.financial_transactions
      where source_type = 'class' and source_id = v_payment.id
        and type = 'income' and amount = 120) <> 1 then
    raise exception 'Receita da aula não lançada'; end if;
  rejected := false;
  begin perform public.pay_class(v_class.id, 'CASH');
  exception when unique_violation then rejected := true; end;
  if not rejected then raise exception 'Pagamento duplicado aceito'; end if;
  rejected := false;
  begin perform public.cancel_class(v_class.id);
  exception when check_violation then rejected := true; end;
  if not rejected then raise exception 'Aula paga cancelada sem estorno'; end if;
  v_payment := public.refund_class_payment(v_class.id);
  if v_payment.status <> 'refunded' or v_payment.refunded_by <> auth.uid() then
    raise exception 'Estorno incompleto'; end if;
  if (select count(*) from public.financial_transactions
      where source_type = 'class_refund' and source_id = v_payment.id
        and type = 'expense' and amount = 120) <> 1 then
    raise exception 'Despesa de estorno não lançada'; end if;
  rejected := false;
  begin perform public.refund_class_payment(v_class.id);
  exception when check_violation then rejected := true; end;
  if not rejected then raise exception 'Estorno duplicado aceito'; end if;
  perform public.cancel_class(v_class.id);
  rejected := false;
  begin perform public.pay_class(v_class.id, 'PIX');
  exception when invalid_parameter_value then rejected := true; end;
  if not rejected then raise exception 'Aula cancelada aceita pagamento'; end if;

  perform set_config('request.jwt.claim.sub', 'b1010101-bbbb-4101-8101-010101010102', true);
  perform set_config('request.jwt.claims', '{"sub":"b1010101-bbbb-4101-8101-010101010102","role":"authenticated"}', true);
  if (select count(*) from public.class_payments) <> 0 then
    raise exception 'Professor vê pagamento'; end if;
  rejected := false;
  begin perform public.refund_class_payment(v_class.id);
  exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'Professor estornou pagamento'; end if;

  perform set_config('request.jwt.claim.sub', 'c1010101-cccc-4101-8101-010101010103', true);
  perform set_config('request.jwt.claims', '{"sub":"c1010101-cccc-4101-8101-010101010103","role":"authenticated"}', true);
  if (select count(*) from public.class_payments) <> 0 then
    raise exception 'Outra arena vê pagamento'; end if;
  rejected := false;
  begin perform public.pay_class(v_class.id, 'PIX');
  exception when no_data_found then rejected := true; end;
  if not rejected then raise exception 'Outra arena pagou aula'; end if;
end; $$;
rollback;
