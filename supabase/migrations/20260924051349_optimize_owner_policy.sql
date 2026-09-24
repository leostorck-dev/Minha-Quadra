-- Evita recalcular o JWT para cada linha na política de onboarding.
drop policy "profiles_insert_first_owner" on public.profiles;

create policy "profiles_insert_first_owner"
on public.profiles for insert to authenticated
with check (
  id = (select auth.uid())
  and role = 'OWNER'
  and email = ((select auth.jwt()) ->> 'email')
  and exists (
    select 1 from public.tenants
    where id = tenant_id and owner_user_id = (select auth.uid())
  )
);
