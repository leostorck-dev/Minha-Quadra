create function public.dashboard_overview()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_role text;
  v_timezone text;
  v_today date;
  v_month date;
  v_next_month date;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_month_start timestamptz;
  v_month_end timestamptz;
  v_open_seconds numeric := 0;
  v_blocked_seconds numeric := 0;
  v_booked_seconds numeric := 0;
  v_occupancy numeric := 0;
  v_bookings_today bigint := 0;
  v_active_customers bigint := 0;
  v_upcoming jsonb := '[]'::jsonb;
  v_financial jsonb;
  v_today_income numeric := 0;
  v_month_income numeric := 0;
  v_average_ticket numeric := 0;
  v_series jsonb := '[]'::jsonb;
begin
  select p.tenant_id, p.role, t.timezone
    into v_tenant_id, v_role, v_timezone
  from public.profiles p
  join public.tenants t on t.id = p.tenant_id
  where p.id = (select auth.uid())
    and p.role in ('OWNER', 'MANAGER', 'RECEPTIONIST', 'COACH');

  if v_tenant_id is null then
    raise exception 'Acesso não autorizado.' using errcode = '42501';
  end if;

  v_today := (now() at time zone v_timezone)::date;
  v_month := date_trunc('month', v_today)::date;
  v_next_month := (v_month + interval '1 month')::date;
  v_day_start := v_today::timestamp at time zone v_timezone;
  v_day_end := (v_today + 1)::timestamp at time zone v_timezone;
  v_month_start := v_month::timestamp at time zone v_timezone;
  v_month_end := v_next_month::timestamp at time zone v_timezone;

  select count(*) into v_bookings_today
  from public.reservations r
  where r.tenant_id = v_tenant_id and r.kind = 'booking'
    and r.status not in ('cancelled', 'no_show')
    and r.start_at >= v_day_start and r.start_at < v_day_end;

  select count(*) into v_active_customers
  from public.customers c
  where c.tenant_id = v_tenant_id and c.status = 'active';

  select coalesce(sum(extract(epoch from (c.closing_time - c.opening_time))), 0)
    * (v_next_month - v_month)
    into v_open_seconds
  from public.courts c
  where c.tenant_id = v_tenant_id and c.status = 'available';

  select
    coalesce(sum(extract(epoch from (r.end_at - r.start_at))) filter
      (where r.kind = 'booking' and r.status in
        ('pending', 'confirmed', 'checked_in', 'completed')), 0),
    coalesce(sum(extract(epoch from (r.end_at - r.start_at))) filter
      (where r.kind = 'block' and r.status = 'confirmed'), 0)
    into v_booked_seconds, v_blocked_seconds
  from public.reservations r
  join public.courts c on c.id = r.court_id and c.tenant_id = v_tenant_id
  where r.tenant_id = v_tenant_id and c.status = 'available'
    and r.start_at >= v_month_start and r.start_at < v_month_end;

  if v_open_seconds > v_blocked_seconds then
    v_occupancy := least(100, round(
      100 * v_booked_seconds / (v_open_seconds - v_blocked_seconds), 1
    ));
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', x.id, 'courtName', x.court_name, 'customerName', x.customer_name,
    'startAt', x.start_at, 'status', x.status
  ) order by x.start_at), '[]'::jsonb)
  into v_upcoming
  from (
    select r.id, c.name as court_name, cu.name as customer_name,
      r.start_at, r.status
    from public.reservations r
    join public.courts c on c.id = r.court_id and c.tenant_id = v_tenant_id
    join public.customers cu on cu.id = r.customer_id and cu.tenant_id = v_tenant_id
    where r.tenant_id = v_tenant_id and r.kind = 'booking'
      and r.status not in ('cancelled', 'no_show') and r.start_at >= now()
    order by r.start_at, r.id
    limit 5
  ) x;

  if v_role in ('OWNER', 'MANAGER') then
    select
      coalesce(sum(f.amount) filter (where f.activity_on = v_today), 0),
      coalesce(sum(f.amount), 0)
      into v_today_income, v_month_income
    from public.financial_transactions f
    where f.tenant_id = v_tenant_id and f.type = 'income'
      and f.status = 'paid'
      and f.activity_on >= v_month and f.activity_on < v_next_month;

    select coalesce(round(avg(p.amount), 2), 0) into v_average_ticket
    from public.payments p
    where p.tenant_id = v_tenant_id and p.status = 'paid'
      and p.created_at >= v_month_start and p.created_at < v_month_end;

    select coalesce(jsonb_agg(jsonb_build_object(
      'month', to_char(m.month, 'YYYY-MM'),
      'income', coalesce((
        select sum(f.amount)
        from public.financial_transactions f
        where f.tenant_id = v_tenant_id and f.type = 'income'
          and f.status = 'paid' and f.activity_on >= m.month
          and f.activity_on < (m.month + interval '1 month')::date
      ), 0)
    ) order by m.month), '[]'::jsonb) into v_series
    from (
      select (v_month - (g.n || ' months')::interval)::date as month
      from generate_series(5, 0, -1) as g(n)
    ) m;

    v_financial := jsonb_build_object(
      'todayIncome', v_today_income,
      'monthIncome', v_month_income,
      'averageTicket', v_average_ticket,
      'revenueSeries', v_series
    );
  end if;

  return jsonb_build_object(
    'today', v_today,
    'bookingsToday', v_bookings_today,
    'activeCustomers', v_active_customers,
    'occupancyPercent', v_occupancy,
    'upcoming', v_upcoming,
    'financial', v_financial
  );
end;
$$;

revoke all on function public.dashboard_overview() from public, anon;
grant execute on function public.dashboard_overview() to authenticated;
