-- O cadastro insere profiles e consulta tenants na mesma transação.
-- Subconsultas cruzadas nas políticas dessas tabelas provocavam 42P17.
-- Funções privadas consultam sem RLS e devolvem apenas a arena do usuário.
create or replace function private.user_tenant_id()
returns uuid language sql stable security definer set search_path = ''
as $$
  select p.tenant_id from public.profiles p
  where p.id = (select auth.uid())
$$;
revoke all on function private.user_tenant_id() from public, anon;
grant execute on function private.user_tenant_id() to authenticated;

create or replace function private.owns_tenant(p_tenant_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.tenants t
    where t.id = p_tenant_id and t.owner_user_id = (select auth.uid())
  )
$$;
revoke all on function private.owns_tenant(uuid) from public, anon;
grant execute on function private.owns_tenant(uuid) to authenticated;

drop policy tenants_select_own on public.tenants;
create policy tenants_select_own on public.tenants
  for select to authenticated
  using (
    owner_user_id = (select auth.uid())
    or id = (select private.user_tenant_id())
  );

drop policy tenants_insert_self on public.tenants;
create policy tenants_insert_self on public.tenants
  for insert to authenticated
  with check (
    owner_user_id = (select auth.uid())
    and (select private.user_tenant_id()) is null
  );

drop policy profiles_insert_first_owner on public.profiles;
create policy profiles_insert_first_owner on public.profiles
  for insert to authenticated
  with check (
    id = (select auth.uid())
    and role = 'OWNER'
    and email = ((select auth.jwt()) ->> 'email')
    and (select private.user_tenant_id()) is null
    and (select private.owns_tenant(tenant_id))
  );
