create or replace function public.enforce_reservation_rules()
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

    if new.status is distinct from old.status and (
      new.court_id is distinct from old.court_id
      or new.customer_id is distinct from old.customer_id
      or new.start_at is distinct from old.start_at
      or new.end_at is distinct from old.end_at
      or new.notes is distinct from old.notes
    ) then
      raise exception 'Altere horário e status em operações separadas.' using errcode = '23514';
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
