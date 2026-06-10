-- Run this in Supabase SQL Editor if joining a room fails with RLS errors.
-- Safe to re-run (drops and recreates policies).

-- 1. Allow users to create their own profile row (needed if auth trigger missed)
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

-- 2. Backfill profiles for existing auth users missing a row
insert into public.profiles (id, email, full_name)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- 3. Storage bucket + policies for avatar/cover uploads
insert into storage.buckets (id, name, public)
values ('room-assets', 'room-assets', true)
on conflict (id) do nothing;

drop policy if exists "Public read room assets" on storage.objects;
create policy "Public read room assets"
  on storage.objects for select to public
  using (bucket_id = 'room-assets');

drop policy if exists "Users upload own room assets" on storage.objects;
create policy "Users upload own room assets"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'room-assets'
    and (
      (storage.foldername(name))[1] = 'avatars'
      and (storage.foldername(name))[2] = auth.uid()::text
    )
    or (
      (storage.foldername(name))[1] = 'covers'
      and (storage.foldername(name))[2] = auth.uid()::text
    )
  );

drop policy if exists "Users update own room assets" on storage.objects;
create policy "Users update own room assets"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'room-assets'
    and (
      (storage.foldername(name))[1] = 'avatars'
      and (storage.foldername(name))[2] = auth.uid()::text
    )
    or (
      (storage.foldername(name))[1] = 'covers'
      and (storage.foldername(name))[2] = auth.uid()::text
    )
  );
