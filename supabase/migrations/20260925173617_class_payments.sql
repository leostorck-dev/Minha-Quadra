create table public.class_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  class_id uuid not null unique,
  amount numeric(10,2) not null check (amount > 0),
  method text not null check (method in ('PIX', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD')),
  status text not null default 'paid' check (status in ('paid', 'refunded')),
  paid_by uuid not null references auth.users(id) on delete restrict,
  paid_at timestamptz not null default now(),
  refunded_by uuid references auth.users(id) on delete restrict,
  refunded_at timestamptz,
  constraint class_payments_class_fk foreign key (tenant_id, class_id)
    references public.class_sessions(tenant_id, id) on delete restrict,
  constraint class_payments_refund_shape check (
    (status = 'paid' and refunded_by is null and refunded_at is null)
    or (status = 'refunded' and refunded_by is not null and refunded_at is not null)
  )
);
create index class_payments_tenant_paid_idx on public.class_payments (tenant_id, paid_at desc);

alter table public.class_payments enable row level security;
revoke all on public.class_payments from public, anon, authenticated;
grant select on public.class_payments to authenticated;
grant all on public.class_payments to service_role;
create policy class_payments_read_staff on public.class_payments
  for select to authenticated using (
    tenant_id = (select tenant_id from public.profiles
      where id = (select auth.uid()) and role in ('OWNER', 'MANAGER', 'RECEPTIONIST'))
  );

alter table public.financial_transactions
  drop constraint financial_transactions_source_type_check;
alter table public.financial_transactions
  add constraint financial_transactions_source_type_check
  check (source_type in ('manual', 'reservation', 'refund', 'membership', 'class', 'class_refund'));
alter table public.financial_transactions drop constraint financial_source_shape_check;
alter table public.financial_transactions add constraint financial_source_shape_check check (
  (source_type = 'manual' and source_id is null)
  or (source_type in ('reservation', 'membership', 'class')
    and source_id is not null and type = 'income' and status = 'paid')
  or (source_type in ('refund', 'class_refund')
    and source_id is not null and type = 'expense' and status = 'paid')
);

create function private.pay_class(p_class_id uuid, p_method text)
returns public.class_payments
language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
  v_class public.class_sessions;
  v_payment public.class_payments;
  v_timezone text;
begin
  v_tenant := private.class_staff_tenant();
  if v_tenant is null then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  if p_method is null or p_method not in ('PIX', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD') then
    raise exception 'Forma de pagamento inválida.' using errcode = '22023';
  end if;
  select * into v_class from public.class_sessions
    where id = p_class_id and tenant_id = v_tenant for update;
  if not found then raise exception 'Aula não encontrada.' using errcode = 'P0002'; end if;
  if v_class.status = 'cancelled' or v_class.price <= 0 then
    raise exception 'Esta aula não aceita pagamento.' using errcode = '22023';
  end if;
  if exists (select 1 from public.class_payments where class_id = p_class_id) then
    raise exception 'Esta aula já possui pagamento.' using errcode = '23505';
  end if;
  insert into public.class_payments (tenant_id, class_id, amount, method, paid_by)
    values (v_tenant, p_class_id, v_class.price, p_method, auth.uid())
    returning * into v_payment;
  select timezone into v_timezone from public.tenants where id = v_tenant;
  insert into public.financial_transactions (
    tenant_id, type, category, description, amount, status, paid_at,
    activity_on, source_type, source_id, created_by, updated_by
  ) values (
    v_tenant, 'income', 'Aulas', 'Pagamento de aula', v_payment.amount, 'paid',
    v_payment.paid_at, (v_payment.paid_at at time zone v_timezone)::date,
    'class', v_payment.id, auth.uid(), auth.uid()
  );
  return v_payment;
end; $$;

create function private.refund_class_payment(p_class_id uuid)
returns public.class_payments
language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
  v_payment public.class_payments;
  v_timezone text;
begin
  v_tenant := private.class_staff_tenant();
  if v_tenant is null then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  select * into v_payment from public.class_payments
    where class_id = p_class_id and tenant_id = v_tenant for update;
  if not found then raise exception 'Pagamento não encontrado.' using errcode = 'P0002'; end if;
  if v_payment.status <> 'paid' then
    raise exception 'Pagamento já estornado.' using errcode = '23514';
  end if;
  update public.class_payments set status = 'refunded', refunded_by = auth.uid(),
    refunded_at = now() where id = v_payment.id returning * into v_payment;
  select timezone into v_timezone from public.tenants where id = v_tenant;
  insert into public.financial_transactions (
    tenant_id, type, category, description, amount, status, paid_at,
    activity_on, source_type, source_id, created_by, updated_by
  ) values (
    v_tenant, 'expense', 'Estorno de aula', 'Estorno de pagamento de aula',
    v_payment.amount, 'paid', v_payment.refunded_at,
    (v_payment.refunded_at at time zone v_timezone)::date,
    'class_refund', v_payment.id, auth.uid(), auth.uid()
  );
  return v_payment;
end; $$;

revoke all on function private.pay_class(uuid,text), private.refund_class_payment(uuid)
  from public, anon, authenticated;
grant execute on function private.pay_class(uuid,text), private.refund_class_payment(uuid)
  to authenticated;

create function public.pay_class(p_class_id uuid, p_method text)
returns public.class_payments language sql security invoker set search_path = '' as $$
  select private.pay_class(p_class_id, p_method)
$$;
create function public.refund_class_payment(p_class_id uuid)
returns public.class_payments language sql security invoker set search_path = '' as $$
  select private.refund_class_payment(p_class_id)
$$;
revoke all on function public.pay_class(uuid,text), public.refund_class_payment(uuid)
  from public, anon;
grant execute on function public.pay_class(uuid,text), public.refund_class_payment(uuid)
  to authenticated;

create function private.guard_paid_class_cancellation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'scheduled' and new.status = 'cancelled' and exists (
    select 1 from public.class_payments
    where class_id = old.id and tenant_id = old.tenant_id and status = 'paid'
  ) then
    raise exception 'Estorne o pagamento antes de cancelar a aula.' using errcode = '23514';
  end if;
  return new;
end; $$;
revoke all on function private.guard_paid_class_cancellation()
  from public, anon, authenticated;
create trigger class_payment_cancel_guard before update of status on public.class_sessions
  for each row execute function private.guard_paid_class_cancellation();
