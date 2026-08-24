-- Storage bucket for user avatar photos, one folder per user (<user_id>/<file>).

insert into storage.buckets (id, name, public)
values ('avatar-images', 'avatar-images', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatar-images');

create policy "Users can upload their own avatar images"
  on storage.objects for insert
  with check (
    bucket_id = 'avatar-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own avatar images"
  on storage.objects for update
  using (
    bucket_id = 'avatar-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar images"
  on storage.objects for delete
  using (
    bucket_id = 'avatar-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
