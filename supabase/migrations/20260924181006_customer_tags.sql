-- Etiquetas simples no cadastro de clientes, com filtro GIN.
create or replace function private.valid_customer_tags(p_tags text[])
returns boolean language sql immutable set search_path = ''
as $$
  select p_tags is not null
    and cardinality(p_tags) <= 10
    and not exists (
      select 1 from unnest(p_tags) as t(tag)
      where tag is null or length(tag) not between 2 and 30
        or tag <> lower(trim(tag))
    )
    and (select count(*) = count(distinct tag) from unnest(p_tags) as t(tag))
$$;
revoke all on function private.valid_customer_tags(text[]) from public, anon;
grant execute on function private.valid_customer_tags(text[]) to authenticated;

alter table public.customers
  add column tags text[] not null default '{}'::text[]
  constraint customers_tags_valid check (private.valid_customer_tags(tags));
create index customers_tags_gin_idx on public.customers using gin (tags);
grant insert (tags), update (tags) on public.customers to authenticated;

create or replace function private.record_customer_tags_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_name text;
begin
  if new.tags is not distinct from old.tags then return new; end if;
  select p.name into v_name from public.profiles p
  where p.id = v_actor and p.tenant_id = new.tenant_id;
  if v_name is null then
    raise exception 'Usuário responsável não pertence à arena.' using errcode = '42501';
  end if;
  insert into public.audit_logs (
    tenant_id, event, entity_type, entity_id, actor_id, actor_name, details
  ) values (
    new.tenant_id, 'customer.updated', 'customer', new.id, v_actor, v_name,
    jsonb_build_object('changedFields', jsonb_build_array('tags'))
  );
  return new;
end;
$$;
revoke all on function private.record_customer_tags_change() from public, anon, authenticated;
create trigger customers_audit_tags_after_update
  after update of tags on public.customers
  for each row execute function private.record_customer_tags_change();
