alter table public.payments alter column created_by set default auth.uid();
