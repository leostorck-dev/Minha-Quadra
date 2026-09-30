grant select(decline_reason) on public.public_booking_requests to authenticated;

create index public_requests_decided_idx
  on public.public_booking_requests(tenant_id, decided_at desc, id desc)
  where status in ('approved', 'declined');

;
