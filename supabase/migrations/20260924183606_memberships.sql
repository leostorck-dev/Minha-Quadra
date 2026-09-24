create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null check (length(btrim(name)) between 2 and 80),
  monthly_price numeric(10,2) not null check (monthly_price > 0),
  classes_per_month integer check (classes_per_month is null or classes_per_month between 1 and 1000),
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint membership_plans_tenant_id_id_key unique (tenant_id, id)
);

create index membership_plans_tenant_active_idx on public.membership_plans (tenant_id, active, name);

create table public.customer_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  customer_id uuid not null,
  plan_id uuid not null,
  monthly_price numeric(10,2) not null check (monthly_price > 0),
  classes_per_month integer check (classes_per_month is null or classes_per_month between 1 and 1000),
  start_on date not null,
  next_due_on date not null,
  billing_day integer not null check (billing_day between 1 and 28),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  constraint customer_memberships_customer_fk foreign key (tenant_id, customer_id)
    references public.customers(tenant_id, id) on delete restrict,
  constraint customer_memberships_plan_fk foreign key (tenant_id, plan_id)
    references public.membership_plans(tenant_id, id) on delete restrict,
  constraint customer_memberships_tenant_id_id_key unique (tenant_id, id),
  constraint customer_memberships_cancelled_check check (
    (status = 'active' and cancelled_at is null)
    or (status = 'cancelled' and cancelled_at is not null)
  )
);

create unique index customer_memberships_one_active_idx
  on public.customer_memberships (tenant_id, customer_id) where status = 'active';
create index customer_memberships_due_idx
  on public.customer_memberships (tenant_id, next_due_on) where status = 'active';

create table public.membership_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  membership_id uuid not null,
  period_due_on date not null,
  amount numeric(10,2) not null check (amount > 0),
  method text not null check (method in ('pix', 'cash', 'card', 'transfer')),
  paid_at timestamptz not null default now(),
  paid_by uuid not null references auth.users(id) on delete restrict,
  constraint membership_payments_membership_fk foreign key (tenant_id, membership_id)
    references public.customer_memberships(tenant_id, id) on delete restrict,
  constraint membership_payments_period_unique unique (membership_id, period_due_on)
);

create index membership_payments_tenant_paid_idx
  on public.membership_payments (tenant_id, paid_at desc);

alter table public.membership_plans enable row level security;
alter table public.customer_memberships enable row level security;
alter table public.membership_payments enable row level security;

revoke all on public.membership_plans, public.customer_memberships, public.membership_payments
  from public, anon, authenticated;
grant select on public.membership_plans, public.customer_memberships, public.membership_payments
  to authenticated;
grant all on public.membership_plans, public.customer_memberships, public.membership_payments
  to service_role;

create policy membership_plans_read_manager on public.membership_plans
  for select to authenticated using (tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid()) and role in ('OWNER', 'MANAGER')
  ));
create policy customer_memberships_read_manager on public.customer_memberships
  for select to authenticated using (tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid()) and role in ('OWNER', 'MANAGER')
  ));
create policy membership_payments_read_manager on public.membership_payments
  for select to authenticated using (tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid()) and role in ('OWNER', 'MANAGER')
  ));

alter table public.financial_transactions drop constraint financial_transactions_source_type_check;
alter table public.financial_transactions add constraint financial_transactions_source_type_check
  check (source_type in ('manual', 'reservation', 'refund', 'membership'));
alter table public.financial_transactions drop constraint financial_source_shape_check;
alter table public.financial_transactions add constraint financial_source_shape_check check (
  (source_type = 'manual' and source_id is null)
  or (source_type in ('reservation', 'membership') and source_id is not null and type = 'income' and status = 'paid')
  or (source_type = 'refund' and source_id is not null and type = 'expense' and status = 'paid')
);

create function private.membership_manager_tenant()
returns uuid language sql stable security definer set search_path = '' as $$
  select tenant_id from public.profiles
  where id = (select auth.uid()) and role in ('OWNER', 'MANAGER')
$$;
revoke all on function private.membership_manager_tenant() from public, anon, authenticated;

create function public.create_membership_plan(
  p_name text, p_monthly_price numeric, p_classes_per_month integer
)
returns public.membership_plans
language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_result public.membership_plans;
begin
  v_tenant := private.membership_manager_tenant();
  if v_tenant is null then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  insert into public.membership_plans (tenant_id, name, monthly_price, classes_per_month, created_by)
  values (v_tenant, btrim(p_name), p_monthly_price, p_classes_per_month, auth.uid())
  returning * into v_result;
  return v_result;
end; $$;

create function public.set_membership_plan_active(p_id uuid, p_active boolean)
returns public.membership_plans
language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_result public.membership_plans;
begin
  v_tenant := private.membership_manager_tenant();
  if v_tenant is null then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  update public.membership_plans set active = p_active
  where id = p_id and tenant_id = v_tenant returning * into v_result;
  if not found then raise exception 'Plano não encontrado.' using errcode = 'P0002'; end if;
  return v_result;
end; $$;

create function public.enroll_customer_membership(p_customer_id uuid, p_plan_id uuid, p_start_on date)
returns public.customer_memberships
language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_plan public.membership_plans; v_result public.customer_memberships;
begin
  v_tenant := private.membership_manager_tenant();
  if v_tenant is null then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  if p_start_on is null or extract(day from p_start_on) > 28 then
    raise exception 'Use um dia de 1 a 28.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.customers
    where id = p_customer_id and tenant_id = v_tenant and status = 'active') then
    raise exception 'Cliente ativo não encontrado.' using errcode = 'P0002';
  end if;
  select * into v_plan from public.membership_plans
  where id = p_plan_id and tenant_id = v_tenant and active;
  if not found then raise exception 'Plano ativo não encontrado.' using errcode = 'P0002'; end if;
  insert into public.customer_memberships (
    tenant_id, customer_id, plan_id, monthly_price, classes_per_month,
    start_on, next_due_on, billing_day, created_by
  ) values (
    v_tenant, p_customer_id, p_plan_id, v_plan.monthly_price, v_plan.classes_per_month,
    p_start_on, p_start_on, extract(day from p_start_on)::integer, auth.uid()
  ) returning * into v_result;
  return v_result;
end; $$;

create function public.cancel_customer_membership(p_id uuid)
returns public.customer_memberships
language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_result public.customer_memberships;
begin
  v_tenant := private.membership_manager_tenant();
  if v_tenant is null then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  update public.customer_memberships set status = 'cancelled', cancelled_at = now()
  where id = p_id and tenant_id = v_tenant and status = 'active'
  returning * into v_result;
  if not found then raise exception 'Assinatura ativa não encontrada.' using errcode = 'P0002'; end if;
  return v_result;
end; $$;

create function public.pay_membership_due(p_membership_id uuid, p_method text)
returns public.membership_payments
language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
  v_membership public.customer_memberships;
  v_payment public.membership_payments;
  v_timezone text;
begin
  v_tenant := private.membership_manager_tenant();
  if v_tenant is null then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  if p_method not in ('pix', 'cash', 'card', 'transfer') or p_method is null then
    raise exception 'Forma de pagamento inválida.' using errcode = '22023';
  end if;
  select * into v_membership from public.customer_memberships
  where id = p_membership_id and tenant_id = v_tenant for update;
  if not found or v_membership.status <> 'active' then
    raise exception 'Assinatura ativa não encontrada.' using errcode = 'P0002';
  end if;
  select timezone into v_timezone from public.tenants where id = v_tenant;
  if v_membership.next_due_on > (now() at time zone v_timezone)::date then
    raise exception 'Mensalidade ainda não venceu.' using errcode = '22023';
  end if;
  insert into public.membership_payments (
    tenant_id, membership_id, period_due_on, amount, method, paid_by
  ) values (
    v_tenant, p_membership_id, v_membership.next_due_on,
    v_membership.monthly_price, p_method, auth.uid()
  ) returning * into v_payment;
  update public.customer_memberships
  set next_due_on = (v_membership.next_due_on + interval '1 month')::date
  where id = p_membership_id;
  insert into public.financial_transactions (
    tenant_id, type, category, description, amount, status, due_date,
    paid_at, activity_on, source_type, source_id, created_by, updated_by
  ) values (
    v_tenant, 'income', 'Mensalidades', 'Pagamento de mensalidade',
    v_payment.amount, 'paid', v_payment.period_due_on, v_payment.paid_at,
    (v_payment.paid_at at time zone v_timezone)::date,
    'membership', v_payment.id, auth.uid(), auth.uid()
  );
  return v_payment;
end; $$;

revoke all on function public.create_membership_plan(text, numeric, integer),
  public.set_membership_plan_active(uuid, boolean),
  public.enroll_customer_membership(uuid, uuid, date),
  public.cancel_customer_membership(uuid),
  public.pay_membership_due(uuid, text) from public, anon;
grant execute on function public.create_membership_plan(text, numeric, integer),
  public.set_membership_plan_active(uuid, boolean),
  public.enroll_customer_membership(uuid, uuid, date),
  public.cancel_customer_membership(uuid),
  public.pay_membership_due(uuid, text) to authenticated;
