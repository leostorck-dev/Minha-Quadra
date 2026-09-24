create index class_sessions_reservation_tenant_idx
  on public.class_sessions (tenant_id, reservation_id);

drop policy customers_select_assigned_coach on public.customers;
alter policy "customers_select_tenant_staff" on public.customers
using (
  tenant_id = (
    select tenant_id from public.profiles
    where id = (select auth.uid())
      and role in ('OWNER', 'MANAGER', 'RECEPTIONIST')
  )
  or id in (
    select customer_id from public.class_students
    where class_id in (select id from public.class_sessions)
  )
);
