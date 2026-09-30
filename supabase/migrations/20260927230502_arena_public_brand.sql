alter table public.arena_public_pages
  add column whatsapp text check (whatsapp is null or whatsapp ~ '^55[1-9][0-9]{9,10}$'),
  add column address text check (address is null or length(address) between 3 and 180),
  add column player_instructions text check (player_instructions is null or length(player_instructions) between 3 and 500),
  add column logo_updated_at timestamptz;

create index public_requests_pending_start_idx on public.public_booking_requests(tenant_id,start_at)
  where status='pending';

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('arena-branding','arena-branding',true,2097152,array['image/png'])
on conflict(id) do update set public=true,file_size_limit=2097152,allowed_mime_types=array['image/png'];

create policy arena_branding_select_owner on storage.objects for select to authenticated
using (bucket_id='arena-branding' and exists(
  select 1 from public.profiles p join public.tenants t on t.id=p.tenant_id
  where p.id=(select auth.uid()) and p.role='OWNER'
    and storage.objects.name=t.slug || '/logo.png'));
create policy arena_branding_insert_owner on storage.objects for insert to authenticated
with check (bucket_id='arena-branding' and exists(
  select 1 from public.profiles p join public.tenants t on t.id=p.tenant_id
  where p.id=(select auth.uid()) and p.role='OWNER'
    and storage.objects.name=t.slug || '/logo.png'));
create policy arena_branding_update_owner on storage.objects for update to authenticated
using (bucket_id='arena-branding' and exists(
  select 1 from public.profiles p join public.tenants t on t.id=p.tenant_id
  where p.id=(select auth.uid()) and p.role='OWNER'
    and storage.objects.name=t.slug || '/logo.png'))
with check (bucket_id='arena-branding' and exists(
  select 1 from public.profiles p join public.tenants t on t.id=p.tenant_id
  where p.id=(select auth.uid()) and p.role='OWNER'
    and storage.objects.name=t.slug || '/logo.png'));
create policy arena_branding_delete_owner on storage.objects for delete to authenticated
using (bucket_id='arena-branding' and exists(
  select 1 from public.profiles p join public.tenants t on t.id=p.tenant_id
  where p.id=(select auth.uid()) and p.role='OWNER'
    and storage.objects.name=t.slug || '/logo.png'));

create function arena_public_api.get_brand(p_slug text)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('name',t.name,'slug',t.slug,'whatsapp',p.whatsapp,
    'address',p.address,'playerInstructions',p.player_instructions,
    'logoUpdatedAt',p.logo_updated_at)
  from public.tenants t join public.arena_public_pages p on p.tenant_id=t.id and p.enabled
  where t.slug=p_slug and t.status='active' and p_slug is not null and length(p_slug)<=80
$$;
revoke all on function arena_public_api.get_brand(text) from public;
grant execute on function arena_public_api.get_brand(text) to anon,authenticated,service_role;
create function public.get_public_arena_brand(p_slug text)
returns jsonb language sql stable security invoker set search_path='' as $$
  select arena_public_api.get_brand(p_slug)
$$;
revoke all on function public.get_public_arena_brand(text) from public;
grant execute on function public.get_public_arena_brand(text) to anon,authenticated,service_role;;
