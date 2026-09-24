-- Cenário transacional. Execute como administrador; nada persiste.
begin;

insert into auth.users (id, email, email_confirmed_at) values
  ('a1111111-aaaa-4111-8111-111111111119', 'membership-a@example.invalid', now()),
  ('b1111111-bbbb-4111-8111-111111111119', 'membership-b@example.invalid', now()),
  ('c1111111-cccc-4111-8111-111111111119', 'membership-coach@example.invalid', now());
insert into public.tenants (id, name, slug, owner_user_id) values
  ('a2222222-aaaa-4222-8222-222222222229', 'Arena Assinaturas A', 'arena-membership-a-test', 'a1111111-aaaa-4111-8111-111111111119'),
  ('b2222222-bbbb-4222-8222-222222222229', 'Arena Assinaturas B', 'arena-membership-b-test', 'b1111111-bbbb-4111-8111-111111111119');
insert into public.profiles (id, tenant_id, name, email, role) values
  ('a1111111-aaaa-4111-8111-111111111119', 'a2222222-aaaa-4222-8222-222222222229', 'Dono A', 'membership-a@example.invalid', 'OWNER'),
  ('b1111111-bbbb-4111-8111-111111111119', 'b2222222-bbbb-4222-8222-222222222229', 'Dono B', 'membership-b@example.invalid', 'OWNER'),
  ('c1111111-cccc-4111-8111-111111111119', 'a2222222-aaaa-4222-8222-222222222229', 'Professor A', 'membership-coach@example.invalid', 'COACH');

select set_config('request.jwt.claim.sub', 'a1111111-aaaa-4111-8111-111111111119', true);
select set_config('request.jwt.claims', '{"sub":"a1111111-aaaa-4111-8111-111111111119","role":"authenticated"}', true);
insert into public.customers (id, tenant_id, name, phone, created_by)
values ('a3333333-aaaa-4333-8333-333333333339', 'a2222222-aaaa-4222-8222-222222222229', 'Cliente Assinante', '11999990019', 'a1111111-aaaa-4111-8111-111111111119');
set local role authenticated;

do $$
declare
  v_plan public.membership_plans;
  v_membership public.customer_memberships;
  v_payment public.membership_payments;
  v_start date := (date_trunc('month', current_date)::date - interval '1 month' + interval '9 days')::date;
  rejected boolean;
begin
  v_plan := public.create_membership_plan('Prata', 320, 8);
  v_membership := public.enroll_customer_membership('a3333333-aaaa-4333-8333-333333333339', v_plan.id, v_start);
  if v_membership.monthly_price <> 320 or v_membership.classes_per_month <> 8
    then raise exception 'Valor/franquia não congelados'; end if;
  rejected := false;
  begin
    perform public.enroll_customer_membership('a3333333-aaaa-4333-8333-333333333339', v_plan.id, v_start);
  exception when unique_violation then rejected := true;
  end;
  if not rejected then raise exception 'Assinatura duplicada aceita'; end if;

  v_payment := public.pay_membership_due(v_membership.id, 'pix');
  if v_payment.amount <> 320 or v_payment.period_due_on <> v_start
    then raise exception 'Pagamento incorreto'; end if;
  if (select next_due_on from public.customer_memberships where id = v_membership.id) <> (v_start + interval '1 month')::date
    then raise exception 'Vencimento não avançou'; end if;
  if (select count(*) from public.financial_transactions
      where source_type = 'membership' and source_id = v_payment.id
        and category = 'Mensalidades' and amount = 320 and status = 'paid') <> 1
    then raise exception 'Receita não foi criada exatamente uma vez'; end if;

  perform public.set_membership_plan_active(v_plan.id, false);
  rejected := false;
  begin
    perform public.enroll_customer_membership('a3333333-aaaa-4333-8333-333333333339', v_plan.id, v_start);
  exception when no_data_found then rejected := true;
  end;
  if not rejected then raise exception 'Plano inativo aceito'; end if;
  if (select monthly_price from public.customer_memberships where id = v_membership.id) <> 320
    then raise exception 'Preço antigo mudou'; end if;

  rejected := false;
  begin
    insert into public.membership_payments (tenant_id, membership_id, period_due_on, amount, method, paid_by)
    values ('a2222222-aaaa-4222-8222-222222222229', v_membership.id, v_start, 1, 'cash', auth.uid());
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'Pagamento forjado aceito'; end if;

  perform set_config('request.jwt.claim.sub', 'c1111111-cccc-4111-8111-111111111119', true);
  perform set_config('request.jwt.claims', '{"sub":"c1111111-cccc-4111-8111-111111111119","role":"authenticated"}', true);
  if (select count(*) from public.customer_memberships) <> 0 then raise exception 'Professor vê assinaturas'; end if;
  rejected := false;
  begin
    perform public.pay_membership_due(v_membership.id, 'pix');
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'Professor quitou mensalidade'; end if;

  perform set_config('request.jwt.claim.sub', 'b1111111-bbbb-4111-8111-111111111119', true);
  perform set_config('request.jwt.claims', '{"sub":"b1111111-bbbb-4111-8111-111111111119","role":"authenticated"}', true);
  if (select count(*) from public.customer_memberships) <> 0 then raise exception 'Arena B vê assinatura A'; end if;
  rejected := false;
  begin
    perform public.cancel_customer_membership(v_membership.id);
  exception when no_data_found then rejected := true;
  end;
  if not rejected then raise exception 'Arena B cancelou assinatura A'; end if;

  perform set_config('request.jwt.claim.sub', 'a1111111-aaaa-4111-8111-111111111119', true);
  perform set_config('request.jwt.claims', '{"sub":"a1111111-aaaa-4111-8111-111111111119","role":"authenticated"}', true);
  perform public.cancel_customer_membership(v_membership.id);
  if (select count(*) from public.membership_payments where membership_id = v_membership.id) <> 1
    then raise exception 'Histórico perdido'; end if;
end;
$$;

rollback;
