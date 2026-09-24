-- Consolida leituras RLS e cobre as FKs novas para remoção de usuários.
create index staff_invites_invited_by_idx on public.staff_invites (invited_by);
create index staff_invites_accepted_by_idx on public.staff_invites (accepted_by)
  where accepted_by is not null;

drop policy profiles_select_self on public.profiles;
drop policy profiles_owner_team_select on public.profiles;
create policy profiles_select_self_or_owner_team on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or tenant_id = (select private.owner_tenant_id()));

drop policy staff_invites_owner_select on public.staff_invites;
drop policy staff_invites_invitee_select on public.staff_invites;
create policy staff_invites_select_owner_or_invitee on public.staff_invites
  for select to authenticated
  using (
    tenant_id = (select private.owner_tenant_id())
    or (status = 'pending' and expires_at > now()
      and email = (select private.confirmed_email()))
  );
