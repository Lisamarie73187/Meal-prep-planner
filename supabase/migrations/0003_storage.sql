insert into storage.buckets (id, name, public) values ('recipe-photos', 'recipe-photos', true)
  on conflict (id) do nothing;

create policy photos_read on storage.objects for select using (bucket_id = 'recipe-photos');

create policy photos_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'recipe-photos' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or ((storage.foldername(name))[1] = 'recommended' and is_admin())));

create policy photos_update on storage.objects for update to authenticated using (
  bucket_id = 'recipe-photos' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or ((storage.foldername(name))[1] = 'recommended' and is_admin())));

create policy photos_delete on storage.objects for delete to authenticated using (
  bucket_id = 'recipe-photos' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or ((storage.foldername(name))[1] = 'recommended' and is_admin())));
