-- View invoker: RLS de customers e reservations protege cada linha.
create view public.customer_crm
with (security_invoker = true)
as
select
  c.id, c.tenant_id, c.name, c.phone, c.email, c.birth_date,
  c.notes, c.tags, c.status, c.created_by, c.created_at, c.updated_at,
  extract(month from c.birth_date)::int as birth_month,
  coalesce(a.reservation_count, 0)::int as reservation_count,
  a.last_reservation_at,
  coalesce(a.has_upcoming, false) as has_upcoming
from public.customers c
left join lateral (
  select
    count(*) filter (
      where r.status in ('confirmed', 'checked_in', 'completed')
    ) as reservation_count,
    max(r.start_at) filter (
      where r.status in ('confirmed', 'checked_in', 'completed')
        and r.start_at <= now()
    ) as last_reservation_at,
    bool_or(
      r.status in ('confirmed', 'checked_in') and r.start_at > now()
    ) as has_upcoming
  from public.reservations r
  where r.tenant_id = c.tenant_id
    and r.customer_id = c.id
    and r.kind = 'booking'
) a on true;

revoke all on public.customer_crm from public, anon, authenticated;
grant select on public.customer_crm to authenticated;
grant all on public.customer_crm to service_role;
