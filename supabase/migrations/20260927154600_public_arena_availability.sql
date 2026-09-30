create table public.arena_public_pages (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  enabled boolean not null default false
);
alter table public.arena_public_pages enable row level security;
revoke all on public.arena_public_pages from public, anon, authenticated;
grant select, insert, update on public.arena_public_pages to authenticated;
grant all on public.arena_public_pages to service_role;
create policy public_page_owner on public.arena_public_pages for all to authenticated
using (tenant_id = (select tenant_id from public.profiles where id = (select auth.uid()) and role = 'OWNER'))
with check (tenant_id = (select tenant_id from public.profiles where id = (select auth.uid()) and role = 'OWNER'));

-- Isolated, unexposed schema: this is an intentionally anonymous, read-only projection.
create schema arena_public_api;
revoke all on schema arena_public_api from public;
grant usage on schema arena_public_api to anon, authenticated, service_role;

create function arena_public_api.get_arena(p_slug text, p_court uuid default null, p_date date default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_arena public.tenants;
  v_court public.courts;
  v_today date;
  v_courts jsonb;
  v_slots jsonb := '[]'::jsonb;
begin
  if p_slug is null or length(p_slug) > 80 then return null; end if;
  select t.* into v_arena from public.tenants t
  join public.arena_public_pages s on s.tenant_id = t.id and s.enabled
  where t.slug = p_slug and t.status = 'active';
  if not found then return null; end if;
  v_today := (now() at time zone v_arena.timezone)::date;
  if p_date is not null and (p_date < v_today or p_date > v_today + 30) then
    raise exception 'Invalid date' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'name', c.name, 'sport', c.sport,
    'price', c.price_per_hour, 'openingTime', c.opening_time, 'closingTime', c.closing_time
  ) order by c.name, c.id), '[]'::jsonb) into v_courts
  from public.courts c where c.tenant_id = v_arena.id and c.status = 'available';

  if p_court is not null then
    select * into v_court from public.courts
    where id = p_court and tenant_id = v_arena.id and status = 'available';
    if not found then return null; end if;
    p_date := coalesce(p_date, v_today);
    select coalesce(jsonb_agg(jsonb_build_object('startAt', s.start_at, 'endAt', s.end_at) order by s.start_at), '[]'::jsonb)
    into v_slots
    from (
      select slot at time zone v_arena.timezone as start_at,
        (slot + interval '1 hour') at time zone v_arena.timezone as end_at
      from pg_catalog.generate_series(p_date::timestamp, p_date::timestamp + interval '23 hours 30 minutes', interval '30 minutes') as slot
      where slot::time >= v_court.opening_time
        and slot + interval '1 hour' <= p_date + v_court.closing_time
    ) s
    where s.start_at > now() and s.end_at - s.start_at = interval '1 hour'
      and not exists (
        select 1 from public.reservations r
        where r.tenant_id = v_arena.id and r.court_id = v_court.id
          and r.status in ('pending', 'confirmed', 'checked_in')
          and r.start_at < s.end_at and r.end_at > s.start_at
      );
  end if;
  return jsonb_build_object('name', v_arena.name, 'slug', v_arena.slug,
    'timezone', v_arena.timezone, 'today', v_today, 'maxDate', v_today + 30,
    'courts', v_courts, 'slots', v_slots, 'date', p_date, 'courtId', p_court);
end;
$$;
revoke all on function arena_public_api.get_arena(text,uuid,date) from public;
grant execute on function arena_public_api.get_arena(text,uuid,date) to anon, authenticated, service_role;

create function public.get_public_arena(p_slug text, p_court uuid default null, p_date date default null)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select arena_public_api.get_arena(p_slug, p_court, p_date)
$$;
revoke all on function public.get_public_arena(text,uuid,date) from public;
grant execute on function public.get_public_arena(text,uuid,date) to anon, authenticated, service_role;;
