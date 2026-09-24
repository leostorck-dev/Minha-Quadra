create extension if not exists btree_gist with schema extensions;

alter table public.tenants
  add column timezone text not null default 'America/Sao_Paulo';

create type public.reservation_status as enum (
  'pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  court_id uuid not null,
  customer_id uuid,
  kind text not null check (kind in ('booking', 'block')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status public.reservation_status not null default 'confirmed',
  price numeric(10,2) not null default 0 check (price >= 0),
  notes text check (notes is null or length(notes) <= 2000),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservations_court_tenant_fkey foreign key (tenant_id, court_id)
    references public.courts(tenant_id, id) on delete restrict,
  constraint reservations_customer_tenant_fkey foreign key (tenant_id, customer_id)
    references public.customers(tenant_id, id) on delete restrict,
  constraint reservations_kind_customer_check check (
    (kind = 'booking' and customer_id is not null)
    or (kind = 'block' and customer_id is null and price = 0 and status in ('confirmed', 'cancelled'))
  ),
  constraint reservations_duration_check check (
    end_at > start_at
    and end_at <= start_at + interval '12 hours'
    and end_at >= start_at + interval '30 minutes'
  ),
  constraint reservations_tenant_id_id_key unique (tenant_id, id),
  constraint reservations_no_overlap exclude using gist (
    court_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status in ('pending', 'confirmed', 'checked_in'))
);

create index reservations_tenant_start_idx
  on public.reservations (tenant_id, start_at);
create index reservations_customer_start_idx
  on public.reservations (tenant_id, customer_id, start_at desc);

create function public.enforce_reservation_rules()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_court public.courts%rowtype;
  v_timezone text;
  v_start_local timestamp;
  v_end_local timestamp;
  v_customer_status text;
  v_validate_schedule boolean;
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.status := 'confirmed';
    v_validate_schedule := true;
  else
    if new.tenant_id is distinct from old.tenant_id
      or new.kind is distinct from old.kind
      or new.created_by is distinct from old.created_by
      or new.created_at is distinct from old.created_at then
      raise exception 'Campos de identidade da reserva não podem ser alterados.' using errcode = '23514';
    end if;

    if old.status in ('completed', 'cancelled', 'no_show') then
      raise exception 'Reserva finalizada não pode ser alterada.' using errcode = '23514';
    end if;

    if old.status = 'checked_in' and (
      new.status <> 'completed'
      or new.court_id is distinct from old.court_id
      or new.customer_id is distinct from old.customer_id
      or new.start_at is distinct from old.start_at
      or new.end_at is distinct from old.end_at
      or new.notes is distinct from old.notes
    ) then
      raise exception 'Check-in só pode ser finalizado.' using errcode = '23514';
    end if;

    if new.status is distinct from old.status and not (
      (old.status = 'pending' and new.status in ('confirmed', 'cancelled'))
      or (old.status = 'confirmed' and new.status in ('checked_in', 'cancelled', 'no_show'))
      or (old.status = 'checked_in' and new.status = 'completed')
    ) then
      raise exception 'Transição de status inválida.' using errcode = '23514';
    end if;

    new.updated_by := auth.uid();
    new.updated_at := now();
    v_validate_schedule := new.court_id is distinct from old.court_id
      or new.customer_id is distinct from old.customer_id
      or new.start_at is distinct from old.start_at
      or new.end_at is distinct from old.end_at;
  end if;

  if new.kind = 'block' and (
    new.customer_id is not null or new.status not in ('confirmed', 'cancelled')
  ) then
    raise exception 'Bloqueio inválido.' using errcode = '23514';
  end if;

  if new.status in ('pending', 'confirmed') and v_validate_schedule then
    select * into v_court from public.courts
      where id = new.court_id and tenant_id = new.tenant_id;
    if not found or v_court.status <> 'available' then
      raise exception 'Quadra indisponível.' using errcode = '23514';
    end if;

    select timezone into v_timezone from public.tenants where id = new.tenant_id;
    v_start_local := new.start_at at time zone v_timezone;
    v_end_local := new.end_at at time zone v_timezone;
    if v_start_local::date <> v_end_local::date
      or v_start_local::time < v_court.opening_time
      or v_end_local::time > v_court.closing_time
      or extract(minute from v_start_local)::int % 30 <> 0
      or extract(minute from v_end_local)::int % 30 <> 0
      or extract(second from v_start_local) <> 0
      or extract(second from v_end_local) <> 0 then
      raise exception 'Horário fora do funcionamento da quadra.' using errcode = '23514';
    end if;

    if new.kind = 'booking' then
      select status into v_customer_status from public.customers
        where id = new.customer_id and tenant_id = new.tenant_id;
      if v_customer_status is distinct from 'active' then
        raise exception 'Cliente indisponível.' using errcode = '23514';
      end if;
      new.price := round(
        v_court.price_per_hour * extract(epoch from (new.end_at - new.start_at)) / 3600,
        2
      );
    else
      new.price := 0;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_reservation_rules() from public, anon, authenticated;

create trigger reservations_rules_before_write
before insert or update on public.reservations
for each row execute function public.enforce_reservation_rules();

alter table public.reservations enable row level security;
revoke all on public.reservations from public, anon, authenticated;
grant select on public.reservations to authenticated;
grant insert (tenant_id, court_id, customer_id, kind, start_at, end_at, notes)
  on public.reservations to authenticated;
grant update (court_id, customer_id, start_at, end_at, status, notes)
  on public.reservations to authenticated;
grant all on public.reservations to service_role;

create policy "reservations_select_tenant_staff"
on public.reservations for select to authenticated
using (
  tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid())
      and role in ('OWNER', 'MANAGER', 'RECEPTIONIST', 'COACH')
  )
);

create policy "reservations_insert_tenant_staff"
on public.reservations for insert to authenticated
with check (
  created_by = (select auth.uid())
  and tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid())
      and role in ('OWNER', 'MANAGER', 'RECEPTIONIST')
  )
);

create policy "reservations_update_tenant_staff"
on public.reservations for update to authenticated
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
