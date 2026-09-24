-- Keep elevated writes outside the exposed PostgREST schema. Public wrappers
-- run as the caller and forward to checked private functions.
alter function public.create_membership_plan(text, numeric, integer) set schema private;
alter function public.set_membership_plan_active(uuid, boolean) set schema private;
alter function public.enroll_customer_membership(uuid, uuid, date) set schema private;
alter function public.cancel_customer_membership(uuid) set schema private;
alter function public.pay_membership_due(uuid, text) set schema private;

grant execute on function private.create_membership_plan(text, numeric, integer),
  private.set_membership_plan_active(uuid, boolean),
  private.enroll_customer_membership(uuid, uuid, date),
  private.cancel_customer_membership(uuid),
  private.pay_membership_due(uuid, text) to authenticated;

create function public.create_membership_plan(
  p_name text, p_monthly_price numeric, p_classes_per_month integer
) returns public.membership_plans
language sql security invoker set search_path = '' as $$
  select private.create_membership_plan(p_name, p_monthly_price, p_classes_per_month)
$$;
create function public.set_membership_plan_active(p_id uuid, p_active boolean)
returns public.membership_plans
language sql security invoker set search_path = '' as $$
  select private.set_membership_plan_active(p_id, p_active)
$$;
create function public.enroll_customer_membership(p_customer_id uuid, p_plan_id uuid, p_start_on date)
returns public.customer_memberships
language sql security invoker set search_path = '' as $$
  select private.enroll_customer_membership(p_customer_id, p_plan_id, p_start_on)
$$;
create function public.cancel_customer_membership(p_id uuid)
returns public.customer_memberships
language sql security invoker set search_path = '' as $$
  select private.cancel_customer_membership(p_id)
$$;
create function public.pay_membership_due(p_membership_id uuid, p_method text)
returns public.membership_payments
language sql security invoker set search_path = '' as $$
  select private.pay_membership_due(p_membership_id, p_method)
$$;

revoke all on function public.create_membership_plan(text, numeric, integer),
  public.set_membership_plan_active(uuid, boolean),
  public.enroll_customer_membership(uuid, uuid, date),
  public.cancel_customer_membership(uuid),
  public.pay_membership_due(uuid, text) from public, anon;
grant execute on function public.create_membership_plan(text, numeric, integer),
  public.set_membership_plan_active(uuid, boolean),
  public.enroll_customer_membership(uuid, uuid, date),
  public.cancel_customer_membership(uuid),
  public.pay_membership_due(uuid, text) to authenticated;

create index customer_memberships_plan_idx on public.customer_memberships (tenant_id, plan_id);
create index customer_memberships_created_by_idx on public.customer_memberships (created_by);
create index membership_payments_membership_idx on public.membership_payments (tenant_id, membership_id);
create index membership_payments_paid_by_idx on public.membership_payments (paid_by);
create index membership_plans_created_by_idx on public.membership_plans (created_by);
