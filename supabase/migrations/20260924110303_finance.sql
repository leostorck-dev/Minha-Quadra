create table public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  type text not null check (type in ('income', 'expense')),
  category text not null check (length(btrim(category)) between 1 and 80),
  description text not null check (length(btrim(description)) between 1 and 240),
  amount numeric(10,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  due_date date,
  paid_at timestamptz,
  activity_on date not null default current_date,
  source_type text not null default 'manual' check (source_type in ('manual', 'reservation', 'refund')),
  source_id uuid,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_source_shape_check check (
    (source_type = 'manual' and source_id is null)
    or (source_type = 'reservation' and source_id is not null and type = 'income' and status = 'paid')
    or (source_type = 'refund' and source_id is not null and type = 'expense' and status = 'paid')
  ),
  constraint financial_paid_state_check check (
    (status = 'paid' and paid_at is not null)
    or (status in ('pending', 'cancelled') and paid_at is null)
  ),
  constraint financial_payable_due_check check (
    status <> 'pending' or type <> 'expense' or due_date is not null
  ),
  constraint financial_source_unique unique (source_type, source_id)
);

create index financial_tenant_activity_idx
  on public.financial_transactions (tenant_id, activity_on desc, created_at desc);
create index financial_tenant_payable_idx
  on public.financial_transactions (tenant_id, due_date)
  where type = 'expense' and status = 'pending';

create function public.enforce_financial_transaction()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_timezone text;
  v_local_date date;
begin
  if tg_op = 'INSERT' then
    select timezone into v_timezone from public.tenants where id = new.tenant_id;
    if not found then
      raise exception 'Arena não encontrada.' using errcode = '23503';
    end if;
    v_local_date := (now() at time zone v_timezone)::date;
    if new.source_type = 'manual' then
      new.source_id := null;
      new.created_by := auth.uid();
      new.updated_by := auth.uid();
      if new.status not in ('pending', 'paid') then
        raise exception 'Situação inicial inválida.' using errcode = '23514';
      end if;
      if new.status = 'paid' then
        new.paid_at := now();
        new.activity_on := v_local_date;
      else
        new.paid_at := null;
        new.activity_on := coalesce(new.due_date, v_local_date);
      end if;
    end if;
  else
    if old.source_type <> 'manual'
      or old.status <> 'pending'
      or new.status not in ('paid', 'cancelled')
      or new.id is distinct from old.id
      or new.tenant_id is distinct from old.tenant_id
      or new.type is distinct from old.type
      or new.category is distinct from old.category
      or new.description is distinct from old.description
      or new.amount is distinct from old.amount
      or new.due_date is distinct from old.due_date
      or new.source_type is distinct from old.source_type
      or new.source_id is distinct from old.source_id
      or new.created_by is distinct from old.created_by
      or new.created_at is distinct from old.created_at then
      raise exception 'Lançamento não pode ser alterado.' using errcode = '23514';
    end if;
    select timezone into v_timezone from public.tenants where id = new.tenant_id;
    v_local_date := (now() at time zone v_timezone)::date;
    new.updated_by := auth.uid();
    new.updated_at := now();
    if new.status = 'paid' then
      new.paid_at := now();
      new.activity_on := v_local_date;
    else
      new.paid_at := null;
      new.activity_on := old.activity_on;
    end if;
  end if;
  return new;
end;
$$;

create trigger financial_rules_before_write
before insert or update on public.financial_transactions
for each row execute function public.enforce_financial_transaction();

create function public.sync_payment_finance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timezone text;
begin
  select timezone into v_timezone from public.tenants where id = new.tenant_id;
  if tg_op = 'INSERT' then
    insert into public.financial_transactions (
      tenant_id, type, category, description, amount, status, paid_at,
      activity_on, source_type, source_id, created_by, updated_by, created_at
    ) values (
      new.tenant_id, 'income', 'Reserva de quadra', 'Pagamento de reserva',
      new.amount, 'paid', new.created_at,
      (new.created_at at time zone v_timezone)::date,
      'reservation', new.id, new.created_by, new.created_by, new.created_at
    ) on conflict (source_type, source_id) do nothing;
  elsif old.status = 'paid' and new.status = 'refunded' then
    insert into public.financial_transactions (
      tenant_id, type, category, description, amount, status, paid_at,
      activity_on, source_type, source_id, created_by, updated_by, created_at
    ) values (
      new.tenant_id, 'expense', 'Estorno de reserva', 'Estorno de pagamento de reserva',
      new.amount, 'paid', new.refunded_at,
      (new.refunded_at at time zone v_timezone)::date,
      'refund', new.id, new.refunded_by, new.refunded_by, new.refunded_at
    ) on conflict (source_type, source_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_payment_finance() from public, anon, authenticated;

create trigger payments_finance_after_write
after insert or update on public.payments
for each row execute function public.sync_payment_finance();

insert into public.financial_transactions (
  tenant_id, type, category, description, amount, status, paid_at,
  activity_on, source_type, source_id, created_by, updated_by, created_at
)
select p.tenant_id, 'income', 'Reserva de quadra', 'Pagamento de reserva',
  p.amount, 'paid', p.created_at,
  (p.created_at at time zone t.timezone)::date,
  'reservation', p.id, p.created_by, p.created_by, p.created_at
from public.payments p
join public.tenants t on t.id = p.tenant_id
on conflict (source_type, source_id) do nothing;

insert into public.financial_transactions (
  tenant_id, type, category, description, amount, status, paid_at,
  activity_on, source_type, source_id, created_by, updated_by, created_at
)
select p.tenant_id, 'expense', 'Estorno de reserva', 'Estorno de pagamento de reserva',
  p.amount, 'paid', p.refunded_at,
  (p.refunded_at at time zone t.timezone)::date,
  'refund', p.id, p.refunded_by, p.refunded_by, p.refunded_at
from public.payments p
join public.tenants t on t.id = p.tenant_id
where p.status = 'refunded'
on conflict (source_type, source_id) do nothing;

alter table public.financial_transactions enable row level security;
grant select on public.financial_transactions to authenticated;
grant insert (tenant_id, type, category, description, amount, status, due_date)
  on public.financial_transactions to authenticated;
grant update (status) on public.financial_transactions to authenticated;
grant all on public.financial_transactions to service_role;

create policy "financial_select_tenant_management"
on public.financial_transactions for select to authenticated
using (
  tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid()) and role in ('OWNER', 'MANAGER')
  )
);

create policy "financial_insert_tenant_management"
on public.financial_transactions for insert to authenticated
with check (
  source_type = 'manual'
  and created_by = (select auth.uid())
  and tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid()) and role in ('OWNER', 'MANAGER')
  )
);

create policy "financial_update_tenant_management"
on public.financial_transactions for update to authenticated
using (
  source_type = 'manual'
  and tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid()) and role in ('OWNER', 'MANAGER')
  )
)
with check (
  source_type = 'manual'
  and tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid()) and role in ('OWNER', 'MANAGER')
  )
);

create function public.finance_month_summary(p_month date)
returns table (income numeric, expense numeric, result numeric, payable numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce(sum(amount) filter (where type = 'income' and status = 'paid'), 0),
    coalesce(sum(amount) filter (where type = 'expense' and status = 'paid'), 0),
    coalesce(sum(amount) filter (where type = 'income' and status = 'paid'), 0)
      - coalesce(sum(amount) filter (where type = 'expense' and status = 'paid'), 0),
    coalesce(sum(amount) filter (where type = 'expense' and status = 'pending'), 0)
  from public.financial_transactions
  where tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid()) and role in ('OWNER', 'MANAGER')
  )
    and activity_on >= p_month
    and activity_on < (p_month + interval '1 month')::date;
$$;

revoke all on function public.finance_month_summary(date) from public, anon;
grant execute on function public.finance_month_summary(date) to authenticated;
