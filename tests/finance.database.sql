-- Executar em transação: os dados de teste são removidos por ROLLBACK.
begin;

insert into auth.users (id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

insert into public.tenants (id, name, slug, owner_user_id) values
  ('11111111-aaaa-4111-8111-111111111113', 'Arena Financeira A', 'arena-a-finance-test', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac'),
  ('22222222-bbbb-4222-8222-222222222224', 'Arena Financeira B', 'arena-b-finance-test', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc');

insert into public.profiles (id, tenant_id, name, email, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac', '11111111-aaaa-4111-8111-111111111113', 'Proprietário A', 'owner-finance-a@example.invalid', 'OWNER'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc', '22222222-bbbb-4222-8222-222222222224', 'Proprietário B', 'owner-finance-b@example.invalid', 'OWNER'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-aaaa-4111-8111-111111111113', 'Recepção A', 'reception-finance-a@example.invalid', 'RECEPTIONIST');

set local role authenticated;

do $$
declare
  expense_id uuid;
  summary_row record;
  month_start date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
  due_on date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date + 20;
  second_change_rejected boolean := false;
  other_tenant_rejected boolean := false;
begin
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac', true);
  insert into public.financial_transactions (
    tenant_id, type, category, description, amount, status, due_date
  ) values (
    '11111111-aaaa-4111-8111-111111111113', 'expense', 'Energia', 'Conta de energia', 100, 'pending', due_on
  ) returning id into expense_id;
  insert into public.financial_transactions (
    tenant_id, type, category, description, amount, status
  ) values (
    '11111111-aaaa-4111-8111-111111111113', 'income', 'Outras receitas', 'Receita manual', 50, 'paid'
  );
  if (select activity_on from public.financial_transactions where id = expense_id) <> due_on then
    raise exception 'Conta pendente não foi atribuída ao mês do vencimento';
  end if;
  select * into summary_row from public.finance_month_summary(month_start);
  if summary_row.income <> 50 or summary_row.expense <> 0
    or summary_row.result <> 50 or summary_row.payable <> 100 then
    raise exception 'Resumo pendente incorreto';
  end if;
  update public.financial_transactions set status = 'paid' where id = expense_id;
  select * into summary_row from public.finance_month_summary(month_start);
  if summary_row.income <> 50 or summary_row.expense <> 100
    or summary_row.result <> -50 or summary_row.payable <> 0 then
    raise exception 'Resumo pago incorreto';
  end if;
  begin
    update public.financial_transactions set status = 'cancelled' where id = expense_id;
  exception when check_violation then second_change_rejected := true;
  end;
  if not second_change_rejected then raise exception 'Lançamento pago foi alterado'; end if;

  begin
    insert into public.financial_transactions (
      tenant_id, type, category, description, amount, status
    ) values (
      '22222222-bbbb-4222-8222-222222222224', 'income', 'Outras receitas', 'Outra arena', 10, 'paid'
    );
  exception when insufficient_privilege or foreign_key_violation then
    other_tenant_rejected := true;
  end;
  if not other_tenant_rejected then raise exception 'Inserção em outra arena foi aceita'; end if;

  perform set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', true);
  if (select count(*) from public.financial_transactions) <> 0 then
    raise exception 'Recepção leu o financeiro';
  end if;
  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc', true);
  if (select count(*) from public.financial_transactions) <> 0 then
    raise exception 'Outra arena leu o financeiro';
  end if;
end $$;

select 'finance_database_tests_passed' as result;
rollback;
