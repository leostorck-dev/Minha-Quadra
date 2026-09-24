create table public.coaches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  profile_id uuid unique references public.profiles(id) on delete set null,
  name text not null check (length(btrim(name)) between 2 and 120),
  phone text check (phone is null or length(btrim(phone)) between 8 and 20),
  email text check (email is null or length(email) <= 254),
  specialties text[] not null default '{}',
  commission_type text not null check (commission_type in ('percentage', 'fixed')),
  commission_value numeric(10,2) not null check (
    commission_value >= 0 and (commission_type <> 'percentage' or commission_value <= 100)
  ),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint coaches_tenant_id_id_key unique (tenant_id, id)
);
create index coaches_tenant_status_idx on public.coaches (tenant_id, status, name);
create index coaches_created_by_idx on public.coaches (created_by);

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  coach_id uuid not null,
  court_id uuid not null,
  reservation_id uuid not null unique,
  kind text not null check (kind in ('individual', 'duo', 'group', 'trial')),
  price numeric(10,2) not null check (price >= 0),
  commission_type text not null check (commission_type in ('percentage', 'fixed')),
  commission_value numeric(10,2) not null check (commission_value >= 0),
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint class_sessions_coach_fk foreign key (tenant_id, coach_id)
    references public.coaches(tenant_id, id) on delete restrict,
  constraint class_sessions_court_fk foreign key (tenant_id, court_id)
    references public.courts(tenant_id, id) on delete restrict,
  constraint class_sessions_reservation_fk foreign key (tenant_id, reservation_id)
    references public.reservations(tenant_id, id) on delete restrict,
  constraint class_sessions_tenant_id_id_key unique (tenant_id, id),
  constraint class_sessions_completed_check check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);
create index class_sessions_tenant_coach_idx on public.class_sessions (tenant_id, coach_id, created_at desc);
create index class_sessions_tenant_court_idx on public.class_sessions (tenant_id, court_id);
create index class_sessions_created_by_idx on public.class_sessions (created_by);

create table public.class_students (
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  class_id uuid not null,
  customer_id uuid not null,
  attendance text not null default 'pending' check (attendance in ('pending', 'present', 'absent')),
  primary key (class_id, customer_id),
  constraint class_students_class_fk foreign key (tenant_id, class_id)
    references public.class_sessions(tenant_id, id) on delete restrict,
  constraint class_students_customer_fk foreign key (tenant_id, customer_id)
    references public.customers(tenant_id, id) on delete restrict
);
create index class_students_tenant_customer_idx on public.class_students (tenant_id, customer_id, class_id);
create index class_students_tenant_class_idx on public.class_students (tenant_id, class_id);

alter table public.coaches enable row level security;
alter table public.class_sessions enable row level security;
alter table public.class_students enable row level security;
revoke all on public.coaches, public.class_sessions, public.class_students from public, anon, authenticated;
grant select on public.coaches, public.class_sessions, public.class_students to authenticated;
grant all on public.coaches, public.class_sessions, public.class_students to service_role;

create policy coaches_read_staff on public.coaches for select to authenticated using (
  tenant_id = (select tenant_id from public.profiles where id = (select auth.uid())
    and role in ('OWNER','MANAGER','RECEPTIONIST'))
  or profile_id = (select auth.uid())
);
create policy class_sessions_read_staff on public.class_sessions for select to authenticated using (
  tenant_id = (select tenant_id from public.profiles where id = (select auth.uid())
    and role in ('OWNER','MANAGER','RECEPTIONIST'))
  or coach_id in (select id from public.coaches where profile_id = (select auth.uid()))
);
create policy class_students_read_staff on public.class_students for select to authenticated using (
  class_id in (select id from public.class_sessions)
);

create function private.class_staff_tenant()
returns uuid language sql stable security definer set search_path = '' as $$
  select tenant_id from public.profiles where id = (select auth.uid())
    and role in ('OWNER','MANAGER','RECEPTIONIST')
$$;
revoke all on function private.class_staff_tenant() from public, anon, authenticated;

create function private.create_coach(
  p_name text, p_phone text, p_email text, p_specialties text[],
  p_commission_type text, p_commission_value numeric, p_profile_id uuid
) returns public.coaches
language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_result public.coaches;
begin
  v_tenant := private.class_staff_tenant();
  if v_tenant is null then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  if p_profile_id is not null and not exists (
    select 1 from public.profiles where id = p_profile_id and tenant_id = v_tenant and role = 'COACH'
  ) then raise exception 'Conta de professor inválida.' using errcode = '22023'; end if;
  insert into public.coaches (tenant_id, profile_id, name, phone, email, specialties,
    commission_type, commission_value, created_by)
  values (v_tenant, p_profile_id, btrim(p_name), nullif(btrim(p_phone), ''),
    nullif(btrim(p_email), ''), p_specialties, p_commission_type,
    p_commission_value, auth.uid()) returning * into v_result;
  return v_result;
end; $$;

create function private.set_coach_status(p_id uuid, p_status text)
returns public.coaches language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_result public.coaches;
begin
  v_tenant := private.class_staff_tenant();
  if v_tenant is null then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  update public.coaches set status = p_status where id = p_id and tenant_id = v_tenant
  returning * into v_result;
  if not found then raise exception 'Professor não encontrado.' using errcode = 'P0002'; end if;
  return v_result;
end; $$;

create function private.create_class(
  p_coach_id uuid, p_court_id uuid, p_kind text, p_start_at timestamptz,
  p_end_at timestamptz, p_price numeric, p_customer_ids uuid[]
) returns public.class_sessions
language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid; v_coach public.coaches; v_reservation public.reservations;
  v_result public.class_sessions; v_count integer;
begin
  v_tenant := private.class_staff_tenant();
  if v_tenant is null then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  v_count := cardinality(p_customer_ids);
  if v_count is null or v_count < 1 or v_count > 12 or
    (p_kind in ('individual','trial') and v_count <> 1) or
    (p_kind = 'duo' and v_count <> 2) or
    (p_kind = 'group' and v_count < 3) then
    raise exception 'Quantidade de alunos incompatível com o tipo.' using errcode = '22023';
  end if;
  if (select count(distinct id) from unnest(p_customer_ids) as id) <> v_count or
    (select count(*) from public.customers where id = any(p_customer_ids)
      and tenant_id = v_tenant and status = 'active') <> v_count then
    raise exception 'Alunos inválidos para esta arena.' using errcode = '22023';
  end if;
  select * into v_coach from public.coaches
  where id = p_coach_id and tenant_id = v_tenant and status = 'active';
  if not found then raise exception 'Professor ativo não encontrado.' using errcode = 'P0002'; end if;
  insert into public.reservations (tenant_id, court_id, customer_id, kind, start_at, end_at, notes)
  values (v_tenant, p_court_id, null, 'block', p_start_at, p_end_at, 'Aula: ' || p_kind)
  returning * into v_reservation;
  insert into public.class_sessions (tenant_id, coach_id, court_id, reservation_id, kind,
    price, commission_type, commission_value, created_by)
  values (v_tenant, p_coach_id, p_court_id, v_reservation.id, p_kind,
    p_price, v_coach.commission_type, v_coach.commission_value, auth.uid())
  returning * into v_result;
  insert into public.class_students (tenant_id, class_id, customer_id)
  select v_tenant, v_result.id, id from unnest(p_customer_ids) as id;
  return v_result;
end; $$;

create function private.finish_class(p_id uuid, p_present_customer_ids uuid[])
returns public.class_sessions
language plpgsql security definer set search_path = '' as $$
declare v_class public.class_sessions; v_result public.class_sessions; v_staff_tenant uuid;
begin
  select * into v_class from public.class_sessions where id = p_id for update;
  if not found then raise exception 'Aula não encontrada.' using errcode = 'P0002'; end if;
  v_staff_tenant := private.class_staff_tenant();
  if v_class.tenant_id is distinct from v_staff_tenant and not exists (
    select 1 from public.coaches where id = v_class.coach_id and profile_id = auth.uid()
  ) then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  if v_class.status <> 'scheduled' or not exists (
    select 1 from public.reservations where id = v_class.reservation_id and status = 'confirmed'
      and start_at <= now()
  ) then raise exception 'Aula não pode ser concluída.' using errcode = '22023'; end if;
  if p_present_customer_ids is null or
    (select count(distinct id) from unnest(p_present_customer_ids) as id) <> cardinality(p_present_customer_ids) or
    (select count(*) from public.class_students where class_id = p_id
      and customer_id = any(p_present_customer_ids)) <> cardinality(p_present_customer_ids) then
    raise exception 'Lista de presença inválida.' using errcode = '22023';
  end if;
  update public.class_students set attendance = case when customer_id = any(p_present_customer_ids)
    then 'present' else 'absent' end where class_id = p_id;
  update public.class_sessions set status = 'completed', completed_at = now()
  where id = p_id returning * into v_result;
  return v_result;
end; $$;

create function private.cancel_class(p_id uuid)
returns public.class_sessions language plpgsql security definer set search_path = '' as $$
declare v_tenant uuid; v_class public.class_sessions; v_result public.class_sessions;
begin
  v_tenant := private.class_staff_tenant();
  if v_tenant is null then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  select * into v_class from public.class_sessions
  where id = p_id and tenant_id = v_tenant for update;
  if not found then raise exception 'Aula não encontrada.' using errcode = 'P0002'; end if;
  if v_class.status <> 'scheduled' then
    raise exception 'Aula já encerrada.' using errcode = '22023'; end if;
  update public.reservations set status = 'cancelled'
    where id = v_class.reservation_id and status = 'confirmed';
  update public.class_sessions set status = 'cancelled'
    where id = p_id returning * into v_result;
  return v_result;
end; $$;

create function private.cancel_class_when_block_cancelled()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'cancelled' and old.status is distinct from new.status then
    update public.class_sessions set status = 'cancelled'
    where reservation_id = new.id and status = 'scheduled';
  end if;
  return new;
end; $$;
revoke all on function private.cancel_class_when_block_cancelled() from public, anon, authenticated;
create trigger class_block_cancelled after update of status on public.reservations
for each row execute function private.cancel_class_when_block_cancelled();

grant execute on function private.create_coach(text,text,text,text[],text,numeric,uuid),
  private.set_coach_status(uuid,text),
  private.create_class(uuid,uuid,text,timestamptz,timestamptz,numeric,uuid[]),
  private.finish_class(uuid,uuid[]), private.cancel_class(uuid) to authenticated;

create function public.create_coach(p_name text, p_phone text, p_email text,
  p_specialties text[], p_commission_type text, p_commission_value numeric, p_profile_id uuid)
returns public.coaches language sql security invoker set search_path = '' as $$
  select private.create_coach(p_name,p_phone,p_email,p_specialties,p_commission_type,p_commission_value,p_profile_id)
$$;
create function public.set_coach_status(p_id uuid, p_status text)
returns public.coaches language sql security invoker set search_path = '' as $$
  select private.set_coach_status(p_id,p_status)
$$;
create function public.create_class(p_coach_id uuid, p_court_id uuid, p_kind text,
  p_start_at timestamptz, p_end_at timestamptz, p_price numeric, p_customer_ids uuid[])
returns public.class_sessions language sql security invoker set search_path = '' as $$
  select private.create_class(p_coach_id,p_court_id,p_kind,p_start_at,p_end_at,p_price,p_customer_ids)
$$;
create function public.finish_class(p_id uuid, p_present_customer_ids uuid[])
returns public.class_sessions language sql security invoker set search_path = '' as $$
  select private.finish_class(p_id,p_present_customer_ids)
$$;
create function public.cancel_class(p_id uuid)
returns public.class_sessions language sql security invoker set search_path = '' as $$
  select private.cancel_class(p_id)
$$;
revoke all on function public.create_coach(text,text,text,text[],text,numeric,uuid),
  public.set_coach_status(uuid,text),
  public.create_class(uuid,uuid,text,timestamptz,timestamptz,numeric,uuid[]),
  public.finish_class(uuid,uuid[]), public.cancel_class(uuid) from public, anon;
grant execute on function public.create_coach(text,text,text,text[],text,numeric,uuid),
  public.set_coach_status(uuid,text),
  public.create_class(uuid,uuid,text,timestamptz,timestamptz,numeric,uuid[]),
  public.finish_class(uuid,uuid[]), public.cancel_class(uuid) to authenticated;
