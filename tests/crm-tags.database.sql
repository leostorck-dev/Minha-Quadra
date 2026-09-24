-- Executar pela conexão administrativa; o ROLLBACK descarta o cenário.
begin;
insert into auth.users (id, email, email_confirmed_at) values
  ('aaaabbbb-aaaa-4aaa-8aaa-aaaaaaaabbbb', 'crm-owner-a@example.invalid', now()),
  ('bbbbcccc-bbbb-4bbb-8bbb-bbbbbbbbcccc', 'crm-owner-b@example.invalid', now());
insert into public.tenants (id, name, slug, owner_user_id) values
  ('11112222-aaaa-4111-8111-111111112222', 'Arena CRM A', 'arena-crm-a-test', 'aaaabbbb-aaaa-4aaa-8aaa-aaaaaaaabbbb'),
  ('22223333-bbbb-4222-8222-222222223333', 'Arena CRM B', 'arena-crm-b-test', 'bbbbcccc-bbbb-4bbb-8bbb-bbbbbbbbcccc');
insert into public.profiles (id, tenant_id, name, email, role) values
  ('aaaabbbb-aaaa-4aaa-8aaa-aaaaaaaabbbb', '11112222-aaaa-4111-8111-111111112222', 'Proprietário CRM A', 'crm-owner-a@example.invalid', 'OWNER'),
  ('bbbbcccc-bbbb-4bbb-8bbb-bbbbbbbbcccc', '22223333-bbbb-4222-8222-222222223333', 'Proprietário CRM B', 'crm-owner-b@example.invalid', 'OWNER');
set local role authenticated;
do $$
declare
  customer_id uuid;
  rejected boolean := false;
begin
  perform set_config('request.jwt.claim.sub', 'aaaabbbb-aaaa-4aaa-8aaa-aaaaaaaabbbb', true);
  perform set_config('request.jwt.claims', '{"sub":"aaaabbbb-aaaa-4aaa-8aaa-aaaaaaaabbbb","email":"crm-owner-a@example.invalid","role":"authenticated"}', true);
  insert into public.customers (tenant_id, name, phone, created_by, tags)
  values ('11112222-aaaa-4111-8111-111111112222', 'Cliente CRM', '11999990000',
          'aaaabbbb-aaaa-4aaa-8aaa-aaaaaaaabbbb', array['mensalista', 'vip'])
  returning id into customer_id;
  if (select count(*) from public.customers where tags @> array['mensalista']) <> 1 then
    raise exception 'Filtro de etiqueta falhou';
  end if;
  update public.customers set tags = array['vip'] where id = customer_id;
  if (select count(*) from public.customers where tags @> array['mensalista']) <> 0 then
    raise exception 'Etiqueta removida ainda aparece no filtro';
  end if;
  if (select count(*) from public.audit_logs
      where entity_id = customer_id and details->'changedFields' ? 'tags') <> 1 then
    raise exception 'Mudança de etiqueta não foi auditada';
  end if;
  begin
    update public.customers set tags = array['vip', 'vip'] where id = customer_id;
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'Etiquetas duplicadas foram aceitas'; end if;
  perform set_config('request.jwt.claim.sub', 'bbbbcccc-bbbb-4bbb-8bbb-bbbbbbbbcccc', true);
  perform set_config('request.jwt.claims', '{"sub":"bbbbcccc-bbbb-4bbb-8bbb-bbbbbbbbcccc","email":"crm-owner-b@example.invalid","role":"authenticated"}', true);
  if (select count(*) from public.customers where tags @> array['vip']) <> 0 then
    raise exception 'Outra arena leu etiqueta';
  end if;
  update public.customers set tags = array['intruso'] where id = customer_id;
  if found then raise exception 'Outra arena alterou etiqueta'; end if;
end;
$$;
rollback;
