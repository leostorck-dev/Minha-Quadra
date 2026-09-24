-- Execute pela conexão administrativa. Todas as alterações são revertidas.
begin;

insert into auth.users (id, email, email_confirmed_at) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaab1', 'owner-team-a@example.invalid', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'owner-team-b@example.invalid', now()),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'member-team-a@example.invalid', now()),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd4', 'invitee-team@example.invalid', now()),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5', 'unverified-team@example.invalid', null),
  ('ffffffff-ffff-4fff-8fff-fffffffffff6', 'wrong-team@example.invalid', now()),
  ('99999999-9999-4999-8999-999999999997', 'revoked-team@example.invalid', now());

insert into public.tenants (id, name, slug, owner_user_id) values
  ('11111111-aaaa-4111-8111-1111111111b1', 'Arena Equipe A', 'arena-team-a-test', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaab1'),
  ('22222222-bbbb-4222-8222-2222222222b2', 'Arena Equipe B', 'arena-team-b-test', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2');

insert into public.profiles (id, tenant_id, name, email, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaab1', '11111111-aaaa-4111-8111-1111111111b1', 'Proprietário A', 'owner-team-a@example.invalid', 'OWNER'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '22222222-bbbb-4222-8222-2222222222b2', 'Proprietário B', 'owner-team-b@example.invalid', 'OWNER'),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', '11111111-aaaa-4111-8111-1111111111b1', 'Gerente A', 'member-team-a@example.invalid', 'MANAGER');

set local role authenticated;

do $$
declare
  invite_token uuid;
  revoked_token uuid;
  unverified_token uuid;
  rejected boolean;
begin
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaab1', true);
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaab1","email":"owner-team-a@example.invalid","role":"authenticated"}', true);
  if (select count(*) from public.profiles) <> 2 then raise exception 'Proprietário não vê a própria equipe'; end if;
  update public.tenants set name = 'Arena Equipe A Editada' where id = '11111111-aaaa-4111-8111-1111111111b1';
  insert into public.staff_invites (tenant_id, email, role)
  values ('11111111-aaaa-4111-8111-1111111111b1', 'invitee-team@example.invalid', 'COACH')
  returning token into invite_token;
  insert into public.staff_invites (tenant_id, email, role)
  values ('11111111-aaaa-4111-8111-1111111111b1', 'unverified-team@example.invalid', 'RECEPTIONIST')
  returning token into unverified_token;
  insert into public.staff_invites (tenant_id, email, role)
  values ('11111111-aaaa-4111-8111-1111111111b1', 'revoked-team@example.invalid', 'MANAGER')
  returning token into revoked_token;
  update public.staff_invites set status = 'revoked' where token = revoked_token;

  perform set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', true);
  perform set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-ccccccccccc3","email":"member-team-a@example.invalid","role":"authenticated"}', true);
  if (select count(*) from public.profiles) <> 1 then raise exception 'Gerente vê equipe'; end if;
  rejected := false;
  begin
    insert into public.staff_invites (tenant_id, email, role)
    values ('11111111-aaaa-4111-8111-1111111111b1', 'forged-team@example.invalid', 'COACH');
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'Gerente criou convite'; end if;
  if (select count(*) from public.staff_invites) <> 0 then raise exception 'Gerente vê convites'; end if;
  rejected := false;
  begin
    update public.tenants set name = 'Nome Falso' where id = '11111111-aaaa-4111-8111-1111111111b1';
    if found then raise exception 'Gerente alterou arena'; end if;
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then
    if (select name from public.tenants where id = '11111111-aaaa-4111-8111-1111111111b1') = 'Nome Falso'
    then raise exception 'Gerente alterou arena'; end if;
  end if;

  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', true);
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2","email":"owner-team-b@example.invalid","role":"authenticated"}', true);
  if (select count(*) from public.staff_invites) <> 0 then raise exception 'Outra arena vê convites'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'Outra arena vê equipe'; end if;

  perform set_config('request.jwt.claim.sub', 'ffffffff-ffff-4fff-8fff-fffffffffff6', true);
  perform set_config('request.jwt.claims', '{"sub":"ffffffff-ffff-4fff-8fff-fffffffffff6","email":"wrong-team@example.invalid","role":"authenticated"}', true);
  rejected := false;
  begin
    perform public.join_arena(invite_token, 'Pessoa Errada');
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'Outro email aceitou convite'; end if;

  perform set_config('request.jwt.claim.sub', '99999999-9999-4999-8999-999999999997', true);
  perform set_config('request.jwt.claims', '{"sub":"99999999-9999-4999-8999-999999999997","email":"revoked-team@example.invalid","role":"authenticated"}', true);
  rejected := false;
  begin
    perform public.join_arena(revoked_token, 'Convite Revogado');
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'Convite revogado foi aceito'; end if;

  perform set_config('request.jwt.claim.sub', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5', true);
  perform set_config('request.jwt.claims', '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5","email":"unverified-team@example.invalid","role":"authenticated"}', true);
  if (select count(*) from public.staff_invites) <> 0 then raise exception 'Email não confirmado vê convite'; end if;
  rejected := false;
  begin
    perform public.join_arena(unverified_token, 'Sem Confirmação');
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'Email não confirmado aceitou convite'; end if;

  perform set_config('request.jwt.claim.sub', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4', true);
  perform set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-4ddd-8ddd-ddddddddddd4","email":"invitee-team@example.invalid","role":"authenticated"}', true);
  if (select count(*) from public.staff_invites) <> 1 then raise exception 'Convidado não vê seu convite'; end if;
  perform public.join_arena(invite_token, 'Professor Convidado');
  if not exists (select 1 from public.profiles where id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4' and role = 'COACH') then
    raise exception 'Convite não criou perfil';
  end if;
  rejected := false;
  begin
    perform public.join_arena(invite_token, 'Professor Convidado');
  exception when unique_violation then rejected := true;
  end;
  if not rejected then raise exception 'Convite foi reutilizado'; end if;

  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaab1', true);
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaab1","email":"owner-team-a@example.invalid","role":"authenticated"}', true);
  delete from public.profiles where id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4';
  if exists (select 1 from public.profiles where id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4') then
    raise exception 'Acesso não foi removido';
  end if;
end;
$$;

rollback;
