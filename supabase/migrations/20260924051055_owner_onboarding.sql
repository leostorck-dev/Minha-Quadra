-- MQ-017 a MQ-022: cadastro transacional da primeira arena do usuário.
alter table public.tenants
  add column owner_user_id uuid not null unique references auth.users(id) on delete restrict;

drop policy "tenants_select_own" on public.tenants;
create policy "tenants_select_own"
on public.tenants for select to authenticated
using (
  owner_user_id = (select auth.uid())
  or id in (
    select tenant_id from public.profiles
    where id = (select auth.uid())
  )
);

create policy "tenants_insert_self"
on public.tenants for insert to authenticated
with check (
  owner_user_id = (select auth.uid())
  and not exists (
    select 1 from public.profiles where id = (select auth.uid())
  )
);

create policy "profiles_insert_first_owner"
on public.profiles for insert to authenticated
with check (
  id = (select auth.uid())
  and role = 'OWNER'
  and email = (select auth.jwt() ->> 'email')
  and exists (
    select 1 from public.tenants
    where id = tenant_id and owner_user_id = (select auth.uid())
  )
);

grant insert (name, slug, owner_user_id) on public.tenants to authenticated;
grant insert (id, tenant_id, name, email, role) on public.profiles to authenticated;

create function public.onboard_arena(
  arena_name text,
  arena_slug text,
  owner_name text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_tenant_id uuid;
  current_user_id uuid := (select auth.uid());
  current_email text := (select auth.jwt() ->> 'email');
begin
  if current_user_id is null or current_email is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if exists (select 1 from public.profiles where id = current_user_id) then
    raise exception 'PROFILE_ALREADY_EXISTS' using errcode = '23505';
  end if;

  insert into public.tenants (name, slug, owner_user_id)
  values (trim(arena_name), lower(trim(arena_slug)), current_user_id)
  returning id into new_tenant_id;

  insert into public.profiles (id, tenant_id, name, email, role)
  values (current_user_id, new_tenant_id, trim(owner_name), current_email, 'OWNER');

  return new_tenant_id;
end;
$$;

revoke all on function public.onboard_arena(text, text, text) from public, anon;
grant execute on function public.onboard_arena(text, text, text) to authenticated;
