-- Reproduz o cadastro pela função pública com RLS ativo e desfaz tudo.
begin;
insert into auth.users (id, email, email_confirmed_at)
values ('77777777-7777-4777-8777-777777777777', 'onboarding-rls@example.invalid', now());
set local role authenticated;
select set_config('request.jwt.claim.sub', '77777777-7777-4777-8777-777777777777', true);
select set_config('request.jwt.claims', '{"sub":"77777777-7777-4777-8777-777777777777","email":"onboarding-rls@example.invalid","role":"authenticated"}', true);
do $$
declare
  new_id uuid;
begin
  new_id := public.onboard_arena('Arena Teste RLS', 'arena-onboarding-rls-test', 'Proprietário Teste');
  if not exists (
    select 1 from public.tenants where id = new_id and name = 'Arena Teste RLS'
  ) then raise exception 'Arena não foi criada'; end if;
  if not exists (
    select 1 from public.profiles where id = '77777777-7777-4777-8777-777777777777'
      and tenant_id = new_id and role = 'OWNER'
  ) then raise exception 'Perfil do proprietário não foi criado'; end if;
end;
$$;
rollback;
