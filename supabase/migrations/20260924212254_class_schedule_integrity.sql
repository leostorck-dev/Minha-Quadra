create function private.guard_class_schedule()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_start timestamptz; v_end timestamptz;
begin
  if tg_table_name = 'reservations' then
    if exists (select 1 from public.class_sessions where reservation_id = old.id)
      and (new.court_id is distinct from old.court_id
        or new.start_at is distinct from old.start_at
        or new.end_at is distinct from old.end_at) then
      raise exception 'Altere aulas pela agenda de aulas.' using errcode = '23514';
    end if;
    return new;
  end if;

  select start_at, end_at into v_start, v_end
  from public.reservations where id = new.reservation_id and tenant_id = new.tenant_id;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.coach_id::text, 0));
  if exists (
    select 1 from public.class_sessions c
    join public.reservations r on r.id = c.reservation_id
    where c.coach_id = new.coach_id and c.status = 'scheduled'
      and r.status = 'confirmed' and r.start_at < v_end and r.end_at > v_start
  ) then
    raise exception 'Professor já tem aula nesse horário.' using errcode = '23P01';
  end if;
  return new;
end; $$;
revoke all on function private.guard_class_schedule() from public, anon, authenticated;
create trigger class_coach_schedule before insert on public.class_sessions
for each row execute function private.guard_class_schedule();
create trigger class_block_schedule before update on public.reservations
for each row execute function private.guard_class_schedule();
