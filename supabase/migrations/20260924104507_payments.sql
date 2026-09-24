create table public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  reservation_id uuid not null,
  amount numeric(10,2) not null default 0 check (amount > 0),
  method text not null check (method in ('PIX', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD')),
  status text not null default 'paid' check (status in ('paid', 'refunded')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  refunded_by uuid references auth.users(id) on delete restrict,
  refunded_at timestamptz,
  constraint payments_reservation_tenant_fkey foreign key (tenant_id, reservation_id)
    references public.reservations(tenant_id, id) on delete restrict,
  constraint payments_reservation_id_key unique (reservation_id),
  constraint payments_refund_state_check check (
    (status = 'paid' and refunded_by is null and refunded_at is null)
    or (status = 'refunded' and refunded_by is not null and refunded_at is not null)
  )
);

create index payments_tenant_created_idx
  on public.payments (tenant_id, created_at desc);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  payment_id uuid not null references public.payments(id) on delete restrict,
  event text not null check (event in ('paid', 'refunded')),
  actor_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index payment_events_payment_created_idx
  on public.payment_events (payment_id, created_at);

create function public.enforce_payment_rules()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_reservation public.reservations%rowtype;
begin
  if tg_op = 'INSERT' then
    select * into v_reservation from public.reservations
      where id = new.reservation_id and tenant_id = new.tenant_id for update;
    if not found or v_reservation.kind <> 'booking'
      or v_reservation.status in ('cancelled', 'no_show')
      or v_reservation.price <= 0 then
      raise exception 'Reserva não aceita pagamento.' using errcode = '23514';
    end if;
    new.amount := v_reservation.price;
    new.status := 'paid';
    new.created_by := auth.uid();
    new.refunded_by := null;
    new.refunded_at := null;
  else
    if new.id is distinct from old.id
      or new.tenant_id is distinct from old.tenant_id
      or new.reservation_id is distinct from old.reservation_id
      or new.amount is distinct from old.amount
      or new.method is distinct from old.method
      or new.created_by is distinct from old.created_by
      or new.created_at is distinct from old.created_at
      or old.status <> 'paid'
      or new.status <> 'refunded' then
      raise exception 'Transição de pagamento inválida.' using errcode = '23514';
    end if;
    new.refunded_by := auth.uid();
    new.refunded_at := now();
  end if;
  return new;
end;
$$;

create trigger payments_rules_before_write
before insert or update on public.payments
for each row execute function public.enforce_payment_rules();

create function public.record_payment_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.payment_events (tenant_id, payment_id, event, actor_id)
  values (new.tenant_id, new.id, new.status, auth.uid());
  return new;
end;
$$;

revoke all on function public.record_payment_event() from public, anon, authenticated;

create trigger payments_event_after_write
after insert or update on public.payments
for each row execute function public.record_payment_event();

create function public.guard_paid_reservation_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (new.court_id, new.customer_id, new.start_at, new.end_at, new.price)
    is distinct from
    (old.court_id, old.customer_id, old.start_at, old.end_at, old.price)
    and exists (
      select 1 from public.payments
      where reservation_id = old.id and tenant_id = old.tenant_id
    ) then
    raise exception 'Reserva com pagamento não pode ter horário ou preço alterado.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger zz_reservations_payment_guard
before update on public.reservations
for each row execute function public.guard_paid_reservation_changes();

alter table public.payments enable row level security;
alter table public.payment_events enable row level security;

grant select on public.payments, public.payment_events to authenticated;
grant insert (tenant_id, reservation_id, method) on public.payments to authenticated;
grant update (status) on public.payments to authenticated;
grant all on public.payments, public.payment_events to service_role;

create policy "payments_select_tenant_staff"
on public.payments for select to authenticated
using (
  tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid())
      and role in ('OWNER', 'MANAGER', 'RECEPTIONIST')
  )
);

create policy "payments_insert_tenant_staff"
on public.payments for insert to authenticated
with check (
  created_by = (select auth.uid())
  and tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid())
      and role in ('OWNER', 'MANAGER', 'RECEPTIONIST')
  )
);

create policy "payments_update_tenant_staff"
on public.payments for update to authenticated
using (
  tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid())
      and role in ('OWNER', 'MANAGER', 'RECEPTIONIST')
  )
)
with check (
  tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid())
      and role in ('OWNER', 'MANAGER', 'RECEPTIONIST')
  )
);

create policy "payment_events_select_tenant_staff"
on public.payment_events for select to authenticated
using (
  tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid())
      and role in ('OWNER', 'MANAGER', 'RECEPTIONIST')
  )
);
