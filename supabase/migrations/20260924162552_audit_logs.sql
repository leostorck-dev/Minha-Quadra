create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  event text not null check (event in (
    'customer.created', 'customer.updated', 'customer.deactivated',
    'reservation.created', 'reservation.updated', 'reservation.cancelled',
    'reservation.checked_in', 'reservation.completed', 'reservation.no_show',
    'payment.created', 'payment.refunded'
  )),
  entity_type text not null check (entity_type in ('customer', 'reservation', 'payment')),
  entity_id uuid not null,
  actor_id uuid not null references auth.users(id) on delete restrict,
  actor_name text not null check (length(btrim(actor_name)) between 1 and 120),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

create index audit_logs_tenant_created_idx
  on public.audit_logs (tenant_id, created_at desc, id desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id);

alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from public, anon, authenticated;
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;

create policy "audit_select_tenant_management"
on public.audit_logs for select to authenticated
using (
  tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid()) and role in ('OWNER', 'MANAGER')
  )
);

create function private.record_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_actor_id uuid := auth.uid();
  v_actor_name text;
  v_event text;
  v_entity_type text;
  v_entity_id uuid;
  v_details jsonb := '{}'::jsonb;
  v_fields text[];
begin
  if tg_table_schema <> 'public' or tg_table_name not in ('customers', 'reservations', 'payments') then
    raise exception 'Origem de auditoria inválida.' using errcode = '23514';
  end if;

  v_tenant_id := new.tenant_id;
  v_entity_id := new.id;
  select name into v_actor_name
  from public.profiles
  where id = v_actor_id and tenant_id = v_tenant_id;
  if v_actor_name is null then
    raise exception 'Usuário responsável não pertence à arena.' using errcode = '42501';
  end if;

  if tg_table_name = 'customers' then
    v_entity_type := 'customer';
    if tg_op = 'INSERT' then
      v_event := 'customer.created';
      v_details := jsonb_build_object('status', new.status);
    else
      v_fields := array_remove(array[
        case when new.name is distinct from old.name then 'name' end,
        case when new.phone is distinct from old.phone then 'phone' end,
        case when new.email is distinct from old.email then 'email' end,
        case when new.birth_date is distinct from old.birth_date then 'birthDate' end,
        case when new.notes is distinct from old.notes then 'notes' end,
        case when new.status is distinct from old.status then 'status' end
      ]::text[], null);
      if cardinality(v_fields) = 0 then return new; end if;
      v_event := case when old.status = 'active' and new.status = 'inactive'
        then 'customer.deactivated' else 'customer.updated' end;
      v_details := jsonb_build_object(
        'changedFields', v_fields,
        'beforeStatus', old.status,
        'afterStatus', new.status
      );
    end if;
  elsif tg_table_name = 'reservations' then
    v_entity_type := 'reservation';
    if tg_op = 'INSERT' then
      v_event := 'reservation.created';
      v_details := jsonb_build_object(
        'kind', new.kind, 'courtId', new.court_id,
        'startAt', new.start_at, 'endAt', new.end_at,
        'status', new.status
      );
    else
      v_fields := array_remove(array[
        case when new.court_id is distinct from old.court_id then 'court' end,
        case when new.customer_id is distinct from old.customer_id then 'customer' end,
        case when new.start_at is distinct from old.start_at then 'startAt' end,
        case when new.end_at is distinct from old.end_at then 'endAt' end,
        case when new.price is distinct from old.price then 'price' end,
        case when new.notes is distinct from old.notes then 'notes' end,
        case when new.status is distinct from old.status then 'status' end
      ]::text[], null);
      if cardinality(v_fields) = 0 then return new; end if;
      v_event := case new.status
        when 'cancelled' then 'reservation.cancelled'
        when 'checked_in' then 'reservation.checked_in'
        when 'completed' then 'reservation.completed'
        when 'no_show' then 'reservation.no_show'
        else 'reservation.updated' end;
      v_details := jsonb_build_object(
        'kind', new.kind, 'changedFields', v_fields,
        'before', jsonb_build_object(
          'courtId', old.court_id, 'startAt', old.start_at,
          'endAt', old.end_at, 'status', old.status
        ),
        'after', jsonb_build_object(
          'courtId', new.court_id, 'startAt', new.start_at,
          'endAt', new.end_at, 'status', new.status
        )
      );
    end if;
  else
    v_entity_type := 'payment';
    v_event := case when tg_op = 'INSERT' then 'payment.created'
      else 'payment.refunded' end;
    v_details := jsonb_build_object(
      'reservationId', new.reservation_id,
      'amount', new.amount,
      'method', new.method,
      'status', new.status
    );
  end if;

  insert into public.audit_logs (
    tenant_id, event, entity_type, entity_id,
    actor_id, actor_name, details
  ) values (
    v_tenant_id, v_event, v_entity_type, v_entity_id,
    v_actor_id, v_actor_name, v_details
  );
  return new;
end;
$$;

revoke all on function private.record_audit_log() from public, anon, authenticated;

create trigger customers_audit_after_write
after insert or update on public.customers
for each row execute function private.record_audit_log();

create trigger reservations_audit_after_write
after insert or update on public.reservations
for each row execute function private.record_audit_log();

create trigger payments_audit_after_write
after insert or update on public.payments
for each row execute function private.record_audit_log();
