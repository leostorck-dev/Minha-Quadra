create table public.coach_commission_payouts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  class_id uuid not null unique,
  coach_id uuid not null,
  amount numeric(10,2) not null check (amount > 0),
  method text not null check (method in ('pix', 'cash', 'transfer')),
  paid_by uuid not null references auth.users(id) on delete restrict,
  paid_at timestamptz not null default now(),
  constraint coach_payouts_class_fk foreign key (tenant_id, class_id)
    references public.class_sessions(tenant_id, id) on delete restrict,
  constraint coach_payouts_coach_fk foreign key (tenant_id, coach_id)
    references public.coaches(tenant_id, id) on delete restrict
);
create index coach_payouts_tenant_class_idx
  on public.coach_commission_payouts (tenant_id, class_id);
create index coach_payouts_tenant_coach_idx
  on public.coach_commission_payouts (tenant_id, coach_id, paid_at desc);
create index coach_payouts_paid_by_idx
  on public.coach_commission_payouts (paid_by);

alter table public.coach_commission_payouts enable row level security;
revoke all on public.coach_commission_payouts from public, anon, authenticated;
grant select on public.coach_commission_payouts to authenticated;
grant all on public.coach_commission_payouts to service_role;
create policy coach_payouts_read_manager_or_coach on public.coach_commission_payouts
  for select to authenticated using (
    tenant_id = (select tenant_id from public.profiles
      where id = (select auth.uid()) and role in ('OWNER', 'MANAGER'))
    or exists (select 1 from public.coaches c
      where c.id = coach_commission_payouts.coach_id
        and c.tenant_id = coach_commission_payouts.tenant_id
        and c.profile_id = (select auth.uid()))
  );

alter table public.financial_transactions
  drop constraint financial_transactions_source_type_check;
alter table public.financial_transactions
  add constraint financial_transactions_source_type_check
  check (source_type in ('manual', 'reservation', 'refund', 'membership',
    'class', 'class_refund', 'coach_commission'));
alter table public.financial_transactions drop constraint financial_source_shape_check;
alter table public.financial_transactions add constraint financial_source_shape_check check (
  (source_type = 'manual' and source_id is null)
  or (source_type in ('reservation', 'membership', 'class')
    and source_id is not null and type = 'income' and status = 'paid')
  or (source_type in ('refund', 'class_refund', 'coach_commission')
    and source_id is not null and type = 'expense' and status = 'paid')
);

create function private.pay_coach_commission(p_class_id uuid, p_method text)
returns public.coach_commission_payouts
language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
  v_class public.class_sessions;
  v_payout public.coach_commission_payouts;
  v_amount numeric(10,2);
  v_timezone text;
begin
  select tenant_id into v_tenant from public.profiles
    where id = auth.uid() and role in ('OWNER', 'MANAGER');
  if v_tenant is null then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  if p_method is null or p_method not in ('pix', 'cash', 'transfer') then
    raise exception 'Forma de pagamento inválida.' using errcode = '22023';
  end if;
  select * into v_class from public.class_sessions
    where id = p_class_id and tenant_id = v_tenant for update;
  if not found then raise exception 'Aula não encontrada.' using errcode = 'P0002'; end if;
  if v_class.status <> 'completed' then
    raise exception 'Apenas aulas concluídas geram comissão.' using errcode = '22023';
  end if;
  v_amount := case when v_class.commission_type = 'percentage'
    then round(v_class.price * v_class.commission_value / 100, 2)
    else v_class.commission_value end;
  if v_amount <= 0 then
    raise exception 'Esta aula não possui comissão a pagar.' using errcode = '22023';
  end if;
  if exists (select 1 from public.coach_commission_payouts where class_id = p_class_id) then
    raise exception 'Comissão desta aula já foi liquidada.' using errcode = '23505';
  end if;
  insert into public.coach_commission_payouts
    (tenant_id, class_id, coach_id, amount, method, paid_by)
    values (v_tenant, p_class_id, v_class.coach_id, v_amount, p_method, auth.uid())
    returning * into v_payout;
  select timezone into v_timezone from public.tenants where id = v_tenant;
  insert into public.financial_transactions (
    tenant_id, type, category, description, amount, status, paid_at,
    activity_on, source_type, source_id, created_by, updated_by
  ) values (
    v_tenant, 'expense', 'Comissões de professores', 'Comissão de aula',
    v_payout.amount, 'paid', v_payout.paid_at,
    (v_payout.paid_at at time zone v_timezone)::date,
    'coach_commission', v_payout.id, auth.uid(), auth.uid()
  );
  return v_payout;
end; $$;

revoke all on function private.pay_coach_commission(uuid,text)
  from public, anon, authenticated;
grant execute on function private.pay_coach_commission(uuid,text) to authenticated;
create function public.pay_coach_commission(p_class_id uuid, p_method text)
returns public.coach_commission_payouts
language sql security invoker set search_path = '' as $$
  select private.pay_coach_commission(p_class_id, p_method)
$$;
revoke all on function public.pay_coach_commission(uuid,text) from public, anon;
grant execute on function public.pay_coach_commission(uuid,text) to authenticated;
