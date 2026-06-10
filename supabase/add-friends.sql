-- Friend requests, friendships, and same-event notifications
-- Run in Supabase SQL Editor after schema.sql

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friend_requests_no_self check (requester_id <> addressee_id),
  constraint friend_requests_pair_unique unique (requester_id, addressee_id)
);

create index if not exists friend_requests_requester_idx on public.friend_requests(requester_id);
create index if not exists friend_requests_addressee_idx on public.friend_requests(addressee_id);
create index if not exists friend_requests_pending_idx on public.friend_requests(addressee_id, status)
  where status = 'pending';

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friendships_ordered_pair check (user_a < user_b),
  constraint friendships_unique unique (user_a, user_b)
);

create index if not exists friendships_user_a_idx on public.friendships(user_a);
create index if not exists friendships_user_b_idx on public.friendships(user_b);

create table if not exists public.friend_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint friend_notifications_no_self check (user_id <> friend_id),
  constraint friend_notifications_unique unique (user_id, friend_id, room_id)
);

create index if not exists friend_notifications_user_idx on public.friend_notifications(user_id, read_at);

alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.friend_notifications enable row level security;

create policy "Users see own friend requests"
  on public.friend_requests for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Users can send friend requests"
  on public.friend_requests for insert to authenticated
  with check (auth.uid() = requester_id);

create policy "Addressees can respond to friend requests"
  on public.friend_requests for update to authenticated
  using (auth.uid() = addressee_id);

create policy "Users see own friendships"
  on public.friendships for select to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "Users can create friendships when accepting"
  on public.friendships for insert to authenticated
  with check (auth.uid() = user_a or auth.uid() = user_b);

create policy "Users see own friend notifications"
  on public.friend_notifications for select to authenticated
  using (auth.uid() = user_id);

create policy "Users receive friend notifications"
  on public.friend_notifications for insert to authenticated
  with check (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can mark notifications read"
  on public.friend_notifications for update to authenticated
  using (auth.uid() = user_id);
