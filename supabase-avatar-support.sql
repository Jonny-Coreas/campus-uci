alter table public.profiles
add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Avatar public read'
  ) then
    create policy "Avatar public read"
    on storage.objects
    for select
    using (bucket_id = 'avatars');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users upload own avatar'
  ) then
    create policy "Users upload own avatar"
    on storage.objects
    for insert
    with check (
      bucket_id = 'avatars'
      and auth.uid()::text = split_part(name, '-', 1)
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users update own avatar'
  ) then
    create policy "Users update own avatar"
    on storage.objects
    for update
    using (
      bucket_id = 'avatars'
      and auth.uid()::text = split_part(name, '-', 1)
    )
    with check (
      bucket_id = 'avatars'
      and auth.uid()::text = split_part(name, '-', 1)
    );
  end if;
end $$;
