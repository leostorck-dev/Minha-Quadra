create policy customers_select_assigned_coach on public.customers
for select to authenticated using (
  id in (
    select customer_id from public.class_students
    where class_id in (select id from public.class_sessions)
  )
);
