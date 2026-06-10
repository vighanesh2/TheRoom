-- The Room — Supabase schema
-- Run this in the Supabase SQL Editor for your project.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  location text,
  cover_type text not null default 'gradient' check (cover_type in ('image', 'color', 'gradient')),
  cover_value text not null default 'midnight',
  cover_text_color text not null default '#FFFFFF',
  privacy text not null default 'public' check (privacy in ('public', 'private')),
  invite_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rooms_host_id_idx on public.rooms(host_id);
create index if not exists rooms_invite_code_idx on public.rooms(invite_code);

create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'attendee' check (role in ('host', 'attendee')),
  display_name text not null,
  avatar_url text,
  headline text,
  building text,
  looking_for text,
  can_help_with text,
  linkedin_url text,
  joined_at timestamptz not null default now(),
  unique(room_id, user_id)
);

create index if not exists room_members_room_id_idx on public.room_members(room_id);
create index if not exists room_members_user_id_idx on public.room_members(user_id);

create table if not exists public.room_invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  invite_code text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz,
  max_uses int,
  use_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists room_invites_room_id_idx on public.room_invites(room_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists rooms_updated_at on public.rooms;
create trigger rooms_updated_at
  before update on public.rooms
  for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_invites enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "Users can insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

create policy "Authenticated users can create rooms"
  on public.rooms for insert to authenticated with check (auth.uid() = host_id);

create policy "Anyone authenticated can view rooms"
  on public.rooms for select to authenticated using (true);

create policy "Hosts can update own rooms"
  on public.rooms for update to authenticated using (auth.uid() = host_id);

create policy "Hosts can delete own rooms"
  on public.rooms for delete to authenticated using (auth.uid() = host_id);

create policy "Members visible to authenticated users"
  on public.room_members for select to authenticated using (true);

create policy "Users can join rooms"
  on public.room_members for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can update own membership"
  on public.room_members for update to authenticated using (auth.uid() = user_id);

create policy "Invites visible to authenticated users"
  on public.room_invites for select to authenticated using (true);

create policy "Hosts can create invites"
  on public.room_invites for insert to authenticated
  with check (
    exists (
      select 1 from public.rooms
      where rooms.id = room_id and rooms.host_id = auth.uid()
    )
  );

-- Storage: create a public bucket named "room-assets" in Supabase Dashboard (public read).
insert into storage.buckets (id, name, public)
values ('room-assets', 'room-assets', true)
on conflict (id) do nothing;

create policy "Public read room assets"
  on storage.objects for select to public
  using (bucket_id = 'room-assets');

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
