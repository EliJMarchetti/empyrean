-- Run after both campaign migrations. Safe to re-run when updating an existing install.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('campaign-maps','campaign-maps',false,10485760,array['image/png','image/jpeg','image/webp','image/gif'])
on conflict(id) do nothing;
drop policy if exists campaign_map_upload on storage.objects;
drop policy if exists campaign_map_read on storage.objects;
drop policy if exists campaign_map_delete on storage.objects;
create policy campaign_map_upload on storage.objects for insert to authenticated
with check(bucket_id='campaign-maps' and private.lock_map_upload((storage.foldername(storage.objects.name))[1]));
create policy campaign_map_read on storage.objects for select to authenticated
using(bucket_id='campaign-maps' and (
  exists(select 1 from public.campaigns c where c.id::text=(storage.foldername(storage.objects.name))[1] and c.gm_id=auth.uid())
  or exists(select 1 from public.maps m where m.storage_path=storage.objects.name and m.visible and private.is_member(m.campaign_id))
  or exists(select 1 from public.campaign_upload_cleanup q where q.gm_id=auth.uid() and q.campaign_id::text=(storage.foldername(storage.objects.name))[1] and storage.objects.name=any(q.paths))
));
create policy campaign_map_delete on storage.objects for delete to authenticated
using(bucket_id='campaign-maps' and (
  exists(select 1 from public.campaigns c where c.id::text=(storage.foldername(storage.objects.name))[1] and c.gm_id=auth.uid())
  or exists(select 1 from public.campaign_upload_cleanup q where q.gm_id=auth.uid() and q.campaign_id::text=(storage.foldername(storage.objects.name))[1] and storage.objects.name=any(q.paths))
));
commit;
