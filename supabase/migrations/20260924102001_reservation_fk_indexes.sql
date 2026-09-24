create index courts_created_by_idx on public.courts (created_by);
create index reservations_tenant_court_idx on public.reservations (tenant_id, court_id);
create index reservations_created_by_idx on public.reservations (created_by);
create index reservations_updated_by_idx on public.reservations (updated_by);
