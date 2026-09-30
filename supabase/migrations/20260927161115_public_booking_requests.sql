create table public.public_booking_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  court_id uuid not null,
  player_name text not null check(length(player_name) between 2 and 120),
  player_phone text not null check(player_phone ~ '^55[1-9][0-9]{9,10}$'),
  start_at timestamptz not null,
  end_at timestamptz not null check(end_at = start_at + interval '1 hour'),
  price numeric(10,2) not null check(price >= 0),
  token_hash text not null unique,
  status text not null default 'pending' check(status in ('pending','approved','declined')),
  reservation_id uuid,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key(tenant_id,court_id) references public.courts(tenant_id,id),
  foreign key(tenant_id,reservation_id) references public.reservations(tenant_id,id),
  check ((status = 'pending' and decided_by is null and decided_at is null and reservation_id is null)
    or (status = 'approved' and decided_by is not null and decided_at is not null and reservation_id is not null)
    or (status = 'declined' and decided_by is not null and decided_at is not null and reservation_id is null))
);
create index public_requests_tenant_created_idx on public.public_booking_requests(tenant_id,created_at desc);
create index public_requests_court_idx on public.public_booking_requests(tenant_id,court_id);
create index public_requests_reservation_idx on public.public_booking_requests(tenant_id,reservation_id);
create index public_requests_actor_idx on public.public_booking_requests(decided_by);
alter table public.public_booking_requests enable row level security;
revoke all on public.public_booking_requests from public,anon,authenticated;
grant select(id,tenant_id,court_id,player_name,player_phone,start_at,end_at,price,status,reservation_id,decided_at,created_at) on public.public_booking_requests to authenticated;
grant all on public.public_booking_requests to service_role;
create policy requests_owner_read on public.public_booking_requests for select to authenticated
using(tenant_id = (select tenant_id from public.profiles where id=(select auth.uid()) and role='OWNER'));

create function arena_public_api.request_status(p_token text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return null; end if;
  select jsonb_build_object('id',r.id,'arena',t.name,'court',c.name,'startAt',coalesce(b.start_at,r.start_at),
    'endAt',coalesce(b.end_at,r.end_at),'price',coalesce(b.price,r.price),'timezone',t.timezone,
    'status',case when r.status='pending' and r.start_at<=now() then 'expired' else r.status end,
    'reservationStatus',b.status)
  into v_result from public.public_booking_requests r join public.tenants t on t.id=r.tenant_id
    join public.courts c on c.id=coalesce((select court_id from public.reservations where id=r.reservation_id),r.court_id)
    left join public.reservations b on b.id=r.reservation_id
  where r.token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
  return v_result;
end;
$$;

create function arena_public_api.submit_request(p_slug text,p_court uuid,p_start timestamptz,p_name text,p_phone text,p_token text,p_website text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_arena public.tenants; v_page jsonb; v_court public.courts; v_existing public.public_booking_requests;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' or p_name is null or length(trim(p_name)) not between 2 and 120
    or p_phone is null or p_phone !~ '^55[1-9][0-9]{9,10}$' or p_start is null or p_court is null
    or coalesce(p_website,'') <> '' then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  select * into v_arena from public.tenants where slug=p_slug and status='active';
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_arena.id::text,0));
  select * into v_existing from public.public_booking_requests where token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
  if found then
    if v_existing.tenant_id<>v_arena.id or v_existing.court_id<>p_court or v_existing.start_at<>p_start
      or v_existing.player_name<>trim(p_name) or v_existing.player_phone<>p_phone then
      raise exception 'RETRY_MISMATCH' using errcode='22023';
    end if;
    return arena_public_api.request_status(p_token);
  end if;
  v_page:=arena_public_api.get_arena(p_slug,p_court,(p_start at time zone v_arena.timezone)::date);
  if v_page is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if not exists(select 1 from jsonb_array_elements(v_page->'slots') s where (s->>'startAt')::timestamptz=p_start) then
    raise exception 'SLOT_TAKEN' using errcode='23P01';
  end if;
  if (select count(*) from public.public_booking_requests where tenant_id=v_arena.id and created_at>now()-interval '1 hour')>=30
    or (select count(*) from public.public_booking_requests where tenant_id=v_arena.id and created_at>now()-interval '1 day')>=100
    or (select count(*) from public.public_booking_requests where tenant_id=v_arena.id and player_phone=p_phone and created_at>now()-interval '1 day')>=3
    then raise exception 'RATE_LIMITED' using errcode='P0001'; end if;
  select * into v_court from public.courts where id=p_court and tenant_id=v_arena.id;
  insert into public.public_booking_requests(tenant_id,court_id,player_name,player_phone,start_at,end_at,price,token_hash)
  values(v_arena.id,p_court,trim(p_name),p_phone,p_start,p_start+interval '1 hour',v_court.price_per_hour,encode(extensions.digest(p_token,'sha256'),'hex'));
  return arena_public_api.request_status(p_token);
end;
$$;

create function arena_public_api.decide_request(p_id uuid,p_approve boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_tenant uuid; v_request public.public_booking_requests; v_customer uuid; v_reservation uuid; v_price numeric;
begin
  select p.tenant_id into v_tenant from public.profiles p join public.tenants t on t.id=p.tenant_id
    where p.id=auth.uid() and p.role='OWNER' and t.status='active';
  if v_tenant is null then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into v_request from public.public_booking_requests where id=p_id and tenant_id=v_tenant for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if p_approve is null then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  if v_request.status='approved' and p_approve then return v_request.reservation_id; end if;
  if v_request.status='declined' and not p_approve then return null; end if;
  if v_request.status<>'pending' then raise exception 'ALREADY_DECIDED' using errcode='23514'; end if;
  if p_approve then
    if v_request.start_at<=now() then raise exception 'EXPIRED' using errcode='23514'; end if;
    select price_per_hour into v_price from public.courts where id=v_request.court_id and tenant_id=v_tenant for share;
    if v_price is distinct from v_request.price then raise exception 'PRICE_CHANGED' using errcode='23514'; end if;
    insert into public.customers(tenant_id,name,phone,created_by) values(v_tenant,v_request.player_name,v_request.player_phone,auth.uid()) returning id into v_customer;
    insert into public.reservations(tenant_id,court_id,customer_id,kind,start_at,end_at,notes,created_by)
    values(v_tenant,v_request.court_id,v_customer,'booking',v_request.start_at,v_request.end_at,'Solicitação online '||v_request.id,auth.uid()) returning id into v_reservation;
  end if;
  update public.public_booking_requests set status=case when p_approve then 'approved' else 'declined' end,
    reservation_id=v_reservation,decided_by=auth.uid(),decided_at=now() where id=p_id;
  return v_reservation;
end;
$$;
revoke all on function arena_public_api.submit_request(text,uuid,timestamptz,text,text,text,text),arena_public_api.request_status(text),arena_public_api.decide_request(uuid,boolean) from public;
grant execute on function arena_public_api.submit_request(text,uuid,timestamptz,text,text,text,text),arena_public_api.request_status(text) to anon,authenticated;
grant execute on function arena_public_api.decide_request(uuid,boolean) to authenticated;

create function public.submit_public_booking_request(p_slug text,p_court uuid,p_start timestamptz,p_name text,p_phone text,p_token text,p_website text default '') returns jsonb language sql security invoker set search_path='' as $$
  select arena_public_api.submit_request(p_slug,p_court,p_start,p_name,p_phone,p_token,p_website)
$$;
create function public.public_booking_request_status(p_token text) returns jsonb language sql stable security invoker set search_path='' as $$
  select arena_public_api.request_status(p_token)
$$;
create function public.decide_public_booking_request(p_id uuid,p_approve boolean) returns uuid language sql security invoker set search_path='' as $$
  select arena_public_api.decide_request(p_id,p_approve)
$$;
revoke all on function public.submit_public_booking_request(text,uuid,timestamptz,text,text,text,text),public.public_booking_request_status(text),public.decide_public_booking_request(uuid,boolean) from public;
grant execute on function public.submit_public_booking_request(text,uuid,timestamptz,text,text,text,text),public.public_booking_request_status(text) to anon,authenticated;
grant execute on function public.decide_public_booking_request(uuid,boolean) to authenticated;;
