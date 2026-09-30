alter table public.public_booking_requests
  add column decline_reason text
    check (decline_reason is null or length(decline_reason) between 5 and 240),
  add constraint public_request_reason_only_declined
    check (decline_reason is null or status = 'declined');

create or replace function arena_public_api.request_status(p_token text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return null; end if;
  select jsonb_build_object('id',r.id,'arena',t.name,'court',c.name,'startAt',coalesce(b.start_at,r.start_at),
    'endAt',coalesce(b.end_at,r.end_at),'price',coalesce(b.price,r.price),'timezone',t.timezone,
    'status',case when r.status='pending' and r.start_at<=now() then 'expired' else r.status end,
    'reservationStatus',b.status,
    'declineReason',case when r.status='declined' then r.decline_reason else null end)
  into v_result from public.public_booking_requests r join public.tenants t on t.id=r.tenant_id
    join public.courts c on c.id=coalesce((select court_id from public.reservations where id=r.reservation_id),r.court_id)
    left join public.reservations b on b.id=r.reservation_id
  where r.token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
  return v_result;
end;
$$;

drop function public.decide_public_booking_request(uuid,boolean);
drop function arena_public_api.decide_request(uuid,boolean);

create function arena_public_api.decide_request(p_id uuid,p_approve boolean,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_tenant uuid; v_request public.public_booking_requests; v_customer uuid; v_reservation uuid;
  v_price numeric; v_reason text;
begin
  select p.tenant_id into v_tenant from public.profiles p join public.tenants t on t.id=p.tenant_id
    where p.id=auth.uid() and p.role='OWNER' and t.status='active';
  if v_tenant is null then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into v_request from public.public_booking_requests where id=p_id and tenant_id=v_tenant for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if p_approve is null then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  v_reason := nullif(pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(p_reason,'')), '[[:space:]]+', ' ', 'g'), '');
  if (p_approve and p_reason is not null)
    or (not p_approve and (v_reason is null or length(v_reason) not between 5 and 240))
    then raise exception 'INVALID_REASON' using errcode='22023'; end if;
  if v_request.status='approved' and p_approve then return v_request.reservation_id; end if;
  if v_request.status='declined' and not p_approve then return null; end if;
  if v_request.status<>'pending' then raise exception 'ALREADY_DECIDED' using errcode='23514'; end if;
  if p_approve then
    if v_request.start_at<=now() then raise exception 'EXPIRED' using errcode='23514'; end if;
    select price_per_hour into v_price from public.courts where id=v_request.court_id and tenant_id=v_tenant for share;
    if v_price is distinct from v_request.price then raise exception 'PRICE_CHANGED' using errcode='23514'; end if;
    insert into public.customers(tenant_id,name,phone,created_by)
      values(v_tenant,v_request.player_name,v_request.player_phone,auth.uid()) returning id into v_customer;
    insert into public.reservations(tenant_id,court_id,customer_id,kind,start_at,end_at,notes,created_by)
      values(v_tenant,v_request.court_id,v_customer,'booking',v_request.start_at,v_request.end_at,
        'Solicitação online '||v_request.id,auth.uid()) returning id into v_reservation;
  end if;
  update public.public_booking_requests
    set status=case when p_approve then 'approved' else 'declined' end,
      reservation_id=v_reservation,decided_by=auth.uid(),decided_at=now(),
      decline_reason=case when p_approve then null else v_reason end
    where id=p_id;
  return v_reservation;
end;
$$;

revoke all on function arena_public_api.decide_request(uuid,boolean,text) from public;
grant execute on function arena_public_api.decide_request(uuid,boolean,text) to authenticated;

create function public.decide_public_booking_request(p_id uuid,p_approve boolean,p_reason text)
returns uuid language sql security invoker set search_path='' as $$
  select arena_public_api.decide_request(p_id,p_approve,p_reason)
$$;
revoke all on function public.decide_public_booking_request(uuid,boolean,text) from public;
grant execute on function public.decide_public_booking_request(uuid,boolean,text) to authenticated;

;
