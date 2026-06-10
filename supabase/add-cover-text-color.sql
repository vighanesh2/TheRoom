-- Run in Supabase SQL Editor to enable cover title text color.

alter table public.rooms
  add column if not exists cover_text_color text not null default '#FFFFFF';
