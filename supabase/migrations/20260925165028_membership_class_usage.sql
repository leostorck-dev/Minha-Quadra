create view public.membership_class_usage
with (security_invoker = true)
as
with local_dates as (
  select
    m.id as membership_id, m.tenant_id, m.customer_id,
    m.classes_per_month, m.start_on, m.billing_day,
    t.timezone,
    (now() at time zone t.timezone)::date as local_today
  from public.customer_memberships m
  join public.tenants t on t.id = m.tenant_id
  where m.status = 'active'
), anchors as (
  select *, make_date(
    extract(year from local_today)::integer,
    extract(month from local_today)::integer,
    billing_day
  ) as month_anchor
  from local_dates
), cycles as (
  select
    membership_id, tenant_id, customer_id, classes_per_month, timezone,
    case
      when local_today < start_on then start_on
      when local_today >= month_anchor then month_anchor
      else (month_anchor - interval '1 month')::date
    end as cycle_start
  from anchors
), usage as (
  select
    c.membership_id, c.tenant_id, c.classes_per_month, c.cycle_start,
    (c.cycle_start + interval '1 month')::date as cycle_end,
    (
      select count(*)::integer
      from public.class_students s
      join public.class_sessions cl
        on cl.id = s.class_id and cl.tenant_id = s.tenant_id
      join public.reservations r
        on r.id = cl.reservation_id and r.tenant_id = cl.tenant_id
      where s.tenant_id = c.tenant_id
        and s.customer_id = c.customer_id
        and s.attendance = 'present'
        and cl.status = 'completed'
        and (r.start_at at time zone c.timezone)::date >= c.cycle_start
        and (r.start_at at time zone c.timezone)::date
          < (c.cycle_start + interval '1 month')::date
    ) as attended_classes
  from cycles c
)
select
  membership_id, tenant_id, cycle_start, cycle_end,
  attended_classes, classes_per_month,
  case when classes_per_month is null then null
    else greatest(classes_per_month - attended_classes, 0)
  end as remaining_classes
from usage;

revoke all on public.membership_class_usage from public, anon, authenticated;
grant select on public.membership_class_usage to authenticated, service_role;
