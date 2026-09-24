begin;
insert into auth.users (id,email,email_confirmed_at) values
  ('a1111111-aaaa-4111-8111-111111111113','classes-owner@example.invalid',now()),
  ('b1111111-bbbb-4111-8111-111111111113','classes-coach@example.invalid',now()),
  ('c1111111-cccc-4111-8111-111111111113','classes-other@example.invalid',now());
insert into public.tenants (id,name,slug,owner_user_id) values
  ('a2222222-aaaa-4222-8222-222222222223','Arena Aulas A','arena-classes-a-test','a1111111-aaaa-4111-8111-111111111113'),
  ('c2222222-cccc-4222-8222-222222222223','Arena Aulas B','arena-classes-b-test','c1111111-cccc-4111-8111-111111111113');
insert into public.profiles (id,tenant_id,name,email,role) values
  ('a1111111-aaaa-4111-8111-111111111113','a2222222-aaaa-4222-8222-222222222223','Proprietário','classes-owner@example.invalid','OWNER'),
  ('b1111111-bbbb-4111-8111-111111111113','a2222222-aaaa-4222-8222-222222222223','Professor','classes-coach@example.invalid','COACH'),
  ('c1111111-cccc-4111-8111-111111111113','c2222222-cccc-4222-8222-222222222223','Outra arena','classes-other@example.invalid','OWNER');
select set_config('request.jwt.claim.sub','a1111111-aaaa-4111-8111-111111111113',true);
select set_config('request.jwt.claims','{"sub":"a1111111-aaaa-4111-8111-111111111113","role":"authenticated"}',true);
insert into public.courts (id,tenant_id,name,sport,price_per_hour,opening_time,closing_time,created_by)
values ('a3333333-aaaa-4333-8333-333333333333','a2222222-aaaa-4222-8222-222222222223','Quadra Aula','Futevôlei',100,'08:00','22:00','a1111111-aaaa-4111-8111-111111111113');
insert into public.customers (id,tenant_id,name,phone,created_by) values
  ('a4444444-aaaa-4444-8444-444444444443','a2222222-aaaa-4222-8222-222222222223','Aluno Um','11999990011','a1111111-aaaa-4111-8111-111111111113'),
  ('a5555555-aaaa-4555-8555-555555555553','a2222222-aaaa-4222-8222-222222222223','Aluno Dois','11999990012','a1111111-aaaa-4111-8111-111111111113');
set local role authenticated;
do $$
declare
  v_coach public.coaches; v_class public.class_sessions;
  v_start timestamptz := ((current_date - 1) + time '10:00') at time zone 'America/Sao_Paulo';
  rejected boolean;
begin
  v_coach := public.create_coach('Professor Um','11999990000','prof@example.invalid',array['Futevôlei'],'percentage',20,
    'b1111111-bbbb-4111-8111-111111111113');
  v_class := public.create_class(v_coach.id,'a3333333-aaaa-4333-8333-333333333333','duo',
    v_start,v_start + interval '1 hour',200,
    array['a4444444-aaaa-4444-8444-444444444443','a5555555-aaaa-4555-8555-555555555553']::uuid[]);
  if (select count(*) from public.class_students where class_id = v_class.id) <> 2
    then raise exception 'Alunos não criados'; end if;
  if (select count(*) from public.reservations where id = v_class.reservation_id and kind = 'block') <> 1
    then raise exception 'Quadra não bloqueada'; end if;
  rejected := false;
  begin
    perform public.create_class(v_coach.id,'a3333333-aaaa-4333-8333-333333333333','individual',
      v_start,v_start + interval '1 hour',100,array['a4444444-aaaa-4444-8444-444444444443']::uuid[]);
  exception when exclusion_violation then rejected := true;
  end;
  if not rejected then raise exception 'Sobreposição aceita'; end if;
  perform set_config('request.jwt.claim.sub','c1111111-cccc-4111-8111-111111111113',true);
  perform set_config('request.jwt.claims','{"sub":"c1111111-cccc-4111-8111-111111111113","role":"authenticated"}',true);
  if (select count(*) from public.class_sessions) <> 0 then raise exception 'Outra arena vê aula'; end if;
  rejected := false;
  begin perform public.cancel_class(v_class.id);
  exception when no_data_found then rejected := true; end;
  if not rejected then raise exception 'Outra arena cancelou aula'; end if;
  perform set_config('request.jwt.claim.sub','b1111111-bbbb-4111-8111-111111111113',true);
  perform set_config('request.jwt.claims','{"sub":"b1111111-bbbb-4111-8111-111111111113","role":"authenticated"}',true);
  if (select count(*) from public.class_sessions) <> 1 then raise exception 'Professor não vê sua aula'; end if;
  if (select count(*) from public.customers) <> 2 then raise exception 'Professor não vê seus alunos'; end if;
  perform public.finish_class(v_class.id,array['a4444444-aaaa-4444-8444-444444444443']::uuid[]);
  if (select count(*) from public.class_students where class_id = v_class.id and attendance = 'present') <> 1
    then raise exception 'Presença incorreta'; end if;
  if (select status from public.class_sessions where id = v_class.id) <> 'completed'
    then raise exception 'Aula não concluída'; end if;
end; $$;
rollback;
