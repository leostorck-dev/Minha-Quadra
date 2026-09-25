create index class_payments_tenant_class_idx
  on public.class_payments (tenant_id, class_id);
create index class_payments_paid_by_idx
  on public.class_payments (paid_by);
create index class_payments_refunded_by_idx
  on public.class_payments (refunded_by);
