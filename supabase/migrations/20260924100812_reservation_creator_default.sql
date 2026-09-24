alter table public.reservations
  alter column created_by set default auth.uid();
