-- Gestão de equipe. O link contém um token aleatório; a aceitação exige
-- sessão autenticada com email confirmado igual ao destino do convite.
create table public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and length(email) between 3 and 254),
  role text not null check (role in ('MANAGER', 'RECEPTIONIST', 'COACH')),
  token uuid not null unique default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid not null default auth.uid() references auth.users(id),
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);
create unique index staff_invites_one_pending_idx on public.staff_invites (tenant_id, email)
  where status = 'pending';
create index staff_invites_email_pending_idx on public.staff_invites (email)
  where status = 'pending';
create index staff_invites_tenant_created_idx on public.staff_invites (tenant_id, created_at desc);
alter table public.staff_invites enable row level security;
revoke all on public.staff_invites from public, anon, authenticated;
grant select on public.staff_invites to authenticated;
grant insert (tenant_id, email, role) on public.staff_invites to authenticated;
grant update (status) on public.staff_invites to authenticated;
grant all on public.staff_invites to service_role;

create or replace function private.owner_tenant_id()
returns uuid language sql stable security definer set search_path = ''
as $$
  select p.tenant_id from public.profiles p
  where p.id = (select auth.uid()) and p.role = 'OWNER'
$$;
revoke all on function private.owner_tenant_id() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.owner_tenant_id() to authenticated;

create or replace function private.confirmed_email()
returns text language sql stable security definer set search_path = ''
as $$
  select lower(u.email) from auth.users u
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null
$$;
revoke all on function private.confirmed_email() from public, anon;
grant execute on function private.confirmed_email() to authenticated;

create policy staff_invites_owner_select on public.staff_invites
  for select to authenticated
  using (tenant_id = (select private.owner_tenant_id()));
create policy staff_invites_invitee_select on public.staff_invites
  for select to authenticated
  using (
    status = 'pending' and expires_at > now()
    and email = (select private.confirmed_email())
  );
create policy staff_invites_owner_insert on public.staff_invites
  for insert to authenticated
  with check (
    tenant_id = (select private.owner_tenant_id())
    and invited_by = (select auth.uid())
    and status = 'pending'
  );
create policy staff_invites_owner_revoke on public.staff_invites
  for update to authenticated
  using (tenant_id = (select private.owner_tenant_id()) and status = 'pending')
  with check (tenant_id = (select private.owner_tenant_id()) and status = 'revoked');

create policy profiles_owner_team_select on public.profiles
  for select to authenticated
  using (tenant_id = (select private.owner_tenant_id()));
grant delete on public.profiles to authenticated;
create policy profiles_owner_remove_member on public.profiles
  for delete to authenticated
  using (
    tenant_id = (select private.owner_tenant_id())
    and role <> 'OWNER' and id <> (select auth.uid())
  );

grant update (name) on public.tenants to authenticated;
create policy tenants_owner_update_name on public.tenants
  for update to authenticated
  using (id = (select private.owner_tenant_id()))
  with check (id = (select private.owner_tenant_id()));

create or replace function private.complete_staff_invite(p_token uuid, member_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email text := lower((select auth.jwt() ->> 'email'));
  target public.staff_invites%rowtype;
begin
  if current_user_id is null or current_email is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if length(trim(member_name)) not between 2 and 120 then
    raise exception 'INVALID_NAME' using errcode = '22023';
  end if;
  if not exists (
    select 1 from auth.users u where u.id = current_user_id
      and u.email_confirmed_at is not null
      and lower(u.email) = current_email
  ) then
    raise exception 'EMAIL_NOT_CONFIRMED' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = current_user_id) then
    raise exception 'PROFILE_ALREADY_EXISTS' using errcode = '23505';
  end if;
  select i.* into target from public.staff_invites i
  join public.tenants t on t.id = i.tenant_id and t.status = 'active'
  where i.token = p_token and i.email = current_email
    and i.status = 'pending' and i.expires_at > now()
  for update of i;
  if not found then
    raise exception 'INVALID_INVITE' using errcode = '42501';
  end if;
  insert into public.profiles (id, tenant_id, name, email, role)
  values (current_user_id, target.tenant_id, trim(member_name), current_email, target.role);
  update public.staff_invites
  set status = 'accepted', accepted_by = current_user_id, accepted_at = now()
  where id = target.id;
  return target.tenant_id;
end;
$$;
revoke all on function private.complete_staff_invite(uuid, text) from public, anon;
grant execute on function private.complete_staff_invite(uuid, text) to authenticated;

create or replace function public.join_arena(p_token uuid, member_name text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.complete_staff_invite(p_token, member_name) $$;
revoke all on function public.join_arena(uuid, text) from public, anon;
grant execute on function public.join_arena(uuid, text) to authenticated;
