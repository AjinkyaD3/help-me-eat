-- FoodSpin database setup. Paste into Supabase → SQL Editor → Run. Safe to run once on a new project.

------------------------------------------------------------------
-- 1. Cloud sync: one JSON document per signed-in user
------------------------------------------------------------------
create table public.user_data (
  user_id    uuid primary key default auth.uid() references auth.users on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  constraint user_data_size check (pg_column_size(data) < 2000000)
);

alter table public.user_data enable row level security;

-- Guests (anonymous sessions used for group spins) can't store sync data.
create policy "read own data" on public.user_data
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own data" on public.user_data
  for insert to authenticated
  with check ((select auth.uid()) = user_id and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
create policy "update own data" on public.user_data
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- The server sets the version stamp, so phone clocks never matter.
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger user_data_touch before update on public.user_data
  for each row execute function public.touch_updated_at();

------------------------------------------------------------------
-- 2. Group spins
------------------------------------------------------------------
create table public.rooms (
  code       text primary key check (code ~ '^[A-Z0-9]{6}$'),
  host_id    uuid not null default auth.uid() references auth.users on delete cascade,
  dishes     jsonb not null check (jsonb_typeof(dishes) = 'array' and jsonb_array_length(dishes) between 2 and 10),
  status     text not null default 'voting' check (status in ('voting', 'done')),
  result     jsonb,
  created_at timestamptz not null default now()
);

create table public.room_members (
  room_code text not null references public.rooms (code) on delete cascade,
  user_id   uuid not null default auth.uid() references auth.users on delete cascade,
  name      text not null check (char_length(name) between 1 and 30),
  vetoes    text[] not null default '{}' check (cardinality(vetoes) <= 2),
  joined_at timestamptz not null default now(),
  primary key (room_code, user_id)
);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;

-- Anyone with a session (including guests) can open a room by code for 24 hours.
create policy "read recent rooms" on public.rooms
  for select to authenticated using (created_at > now() - interval '24 hours');
create policy "create own room" on public.rooms
  for insert to authenticated with check ((select auth.uid()) = host_id);
create policy "host updates room" on public.rooms
  for update to authenticated
  using ((select auth.uid()) = host_id) with check ((select auth.uid()) = host_id);

create policy "read members of visible rooms" on public.room_members
  for select to authenticated
  using (exists (select 1 from public.rooms r where r.code = room_code));
create policy "join as yourself" on public.room_members
  for insert to authenticated
  with check ((select auth.uid()) = user_id and exists (select 1 from public.rooms r where r.code = room_code));
create policy "edit your own vetoes" on public.room_members
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

------------------------------------------------------------------
-- 3. Realtime (live vetoes, shared spins, cross-device sync)
------------------------------------------------------------------
alter publication supabase_realtime add table public.user_data, public.rooms, public.room_members;

------------------------------------------------------------------
-- 4. Optional: delete old rooms nightly (enable the pg_cron extension first)
------------------------------------------------------------------
-- select cron.schedule('foodspin-room-cleanup', '0 3 * * *',
--   $$ delete from public.rooms where created_at < now() - interval '2 days' $$);
