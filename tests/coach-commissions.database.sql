-- Liquidação transacional: cálculo, duplicidade, financeiro e permissões.
begin;
insert into auth.users (id, email, email_confirmed_at) values
  ('a5151515-aaaa-4515-8515-151515151511', 'commission-owner@example.invalid', now()),
  ('b5151515-bbbb-4515-8515-151515151512', 'commission-coach@example.invalid', now()),
  ('c5151515-cccc-4515-8515-151515151513', 'commission-other@example.invalid', now()),
  ('d5151515-dddd-4515-8515-151515151514', 'commission-reception@example.invalid', now());
insert into public.tenants (id, name, slug, owner_user_id) values
  ('a6161616-aaaa-4616-8616-161616161611', 'Arena Comissão A', 'arena-commission-a-test', 'a5151515-aaaa-4515-8515-151515151511'),
  ('c6161616-cccc-4616-8616-161616161613', 'Arena Comissão B', 'arena-commission-b-test', 'c5151515-cccc-4515-8515-151515151513');
insert into public.profiles (id, tenant_id, name, email, role) values
  ('a5151515-aaaa-4515-8515-151515151511', 'a6161616-aaaa-4616-8616-161616161611', 'Dono', 'commission-owner@example.invalid', 'OWNER'),
  ('b5151515-bbbb-4515-8515-151515151512', 'a6161616-aaaa-4616-8616-161616161611', 'Professor', 'commission-coach@example.invalid', 'COACH'),
  ('c5151515-cccc-4515-8515-151515151513', 'c6161616-cccc-4616-8616-161616161613', 'Outro dono', 'commission-other@example.invalid', 'OWNER'),
  ('d5151515-dddd-4515-8515-151515151514', 'a6161616-aaaa-4616-8616-161616161611', 'Recepção', 'commission-reception@example.invalid', 'RECEPTIONIST');
select set_config('request.jwt.claim.sub', 'a5151515-aaaa-4515-8515-151515151511', true);
select set_config('request.jwt.claims', '{"sub":"a5151515-aaaa-4515-8515-151515151511","role":"authenticated"}', true);
insert into public.courts (id, tenant_id, name, sport, price_per_hour, opening_time, closing_time, created_by)
  values ('a7171717-aaaa-4717-8717-171717171711', 'a6161616-aaaa-4616-8616-161616161611',
  'Quadra Comissão', 'Futevôlei', 100, '08:00', '22:00', 'a5151515-aaaa-4515-8515-151515151511');
insert into public.customers (id, tenant_id, name, phone, created_by)
  values ('a8181818-aaaa-4818-8818-181818181811', 'a6161616-aaaa-4616-8616-161616161611',
  'Aluno Comissão', '11999990021', 'a5151515-aaaa-4515-8515-151515151511');

set local role authenticated;
do $$
declare
  v_percentage public.coaches;
  v_fixed public.coaches;
  v_class_percentage public.class_sessions;
  v_class_fixed public.class_sessions;
  v_payout public.coach_commission_payouts;
  v_start timestamptz := (((now() at time zone 'America/Sao_Paulo')::date - 1) + time '10:00') at time zone 'America/Sao_Paulo';
  rejected boolean;
begin
  v_percentage := public.create_coach('Professor Percentual', null, null, array['Futevôlei'],
    'percentage', 17.5, 'b5151515-bbbb-4515-8515-151515151512');
  v_fixed := public.create_coach('Professor Fixo', null, null, array['Futevôlei'],
    'fixed', 15.30, null);
  v_class_percentage := public.create_class(v_percentage.id,
    'a7171717-aaaa-4717-8717-171717171711', 'individual', v_start,
    v_start + interval '1 hour', 99.99,
    array['a8181818-aaaa-4818-8818-181818181811']::uuid[]);
  v_class_fixed := public.create_class(v_fixed.id,
    'a7171717-aaaa-4717-8717-171717171711', 'trial',
    v_start + interval '2 hours', v_start + interval '3 hours', 0,
    array['a8181818-aaaa-4818-8818-181818181811']::uuid[]);
  rejected := false;
  begin perform public.pay_coach_commission(v_class_percentage.id, 'pix');
  exception when invalid_parameter_value then rejected := true; end;
  if not rejected then raise exception 'Aula agendada aceitou comissão'; end if;
  perform public.finish_class(v_class_percentage.id,
    array['a8181818-aaaa-4818-8818-181818181811']::uuid[]);
  perform public.finish_class(v_class_fixed.id,
    array['a8181818-aaaa-4818-8818-181818181811']::uuid[]);
  v_payout := public.pay_coach_commission(v_class_percentage.id, 'pix');
  if v_payout.amount <> 17.50 or v_payout.coach_id <> v_percentage.id then
    raise exception 'Comissão percentual incorreta'; end if;
  if (select count(*) from public.financial_transactions
      where source_type = 'coach_commission' and source_id = v_payout.id
        and amount = 17.50 and type = 'expense') <> 1 then
    raise exception 'Despesa percentual ausente'; end if;
  rejected := false;
  begin perform public.pay_coach_commission(v_class_percentage.id, 'cash');
  exception when unique_violation then rejected := true; end;
  if not rejected then raise exception 'Comissão duplicada aceita'; end if;
  v_payout := public.pay_coach_commission(v_class_fixed.id, 'transfer');
  if v_payout.amount <> 15.30 then raise exception 'Comissão fixa incorreta'; end if;
  if (select count(*) from public.financial_transactions
      where source_type = 'coach_commission' and source_id = v_payout.id
        and amount = 15.30 and type = 'expense') <> 1 then
    raise exception 'Despesa fixa ausente'; end if;

  perform set_config('request.jwt.claim.sub', 'b5151515-bbbb-4515-8515-151515151512', true);
  perform set_config('request.jwt.claims', '{"sub":"b5151515-bbbb-4515-8515-151515151512","role":"authenticated"}', true);
  if (select count(*) from public.coach_commission_payouts) <> 1 then
    raise exception 'Professor não vê apenas sua liquidação'; end if;
  rejected := false;
  begin perform public.pay_coach_commission(v_class_fixed.id, 'cash');
  exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'Professor liquidou comissão'; end if;

  perform set_config('request.jwt.claim.sub', 'd5151515-dddd-4515-8515-151515151514', true);
  perform set_config('request.jwt.claims', '{"sub":"d5151515-dddd-4515-8515-151515151514","role":"authenticated"}', true);
  if (select count(*) from public.coach_commission_payouts) <> 0 then
    raise exception 'Recepção vê liquidações'; end if;
  rejected := false;
  begin perform public.pay_coach_commission(v_class_fixed.id, 'cash');
  exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'Recepção liquidou comissão'; end if;

  perform set_config('request.jwt.claim.sub', 'c5151515-cccc-4515-8515-151515151513', true);
  perform set_config('request.jwt.claims', '{"sub":"c5151515-cccc-4515-8515-151515151513","role":"authenticated"}', true);
  if (select count(*) from public.coach_commission_payouts) <> 0 then
    raise exception 'Outra arena vê liquidações'; end if;
  rejected := false;
  begin perform public.pay_coach_commission(v_class_percentage.id, 'pix');
  exception when no_data_found then rejected := true; end;
  if not rejected then raise exception 'Outra arena liquidou aula'; end if;
end; $$;
rollback;
