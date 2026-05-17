-- ============================================================
-- TwoOfUs — Complete Database Setup
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- 1. PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  public_key text,
  encrypted_private_key text,
  key_salt text,
  key_iv text,
  mood text default '🥰',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can read partner profile" on public.profiles
  for select using (
    id in (
      select user_a from public.couples where user_b = auth.uid() and status = 'active'
      union
      select user_b from public.couples where user_a = auth.uid() and status = 'active'
    )
  );

-- 2. COUPLES
create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id),
  user_b uuid references public.profiles(id),
  invite_token text unique,
  invite_expires_at timestamptz,
  paired_at timestamptz,
  anniversary_date date,
  our_song_url text,
  status text not null default 'active' check (status in ('active', 'ended', 'blocked')),
  ended_at timestamptz,
  created_at timestamptz default now()
);

alter table public.couples enable row level security;

create policy "Users can read own couples" on public.couples
  for select using (auth.uid() = user_a or auth.uid() = user_b);

create policy "Users can insert couples" on public.couples
  for insert with check (auth.uid() = user_a);

create policy "Users can update own couples" on public.couples
  for update using (auth.uid() = user_a or auth.uid() = user_b);

-- Allow anyone to accept an active, unclaimed invite by setting user_b to themselves
create policy "Anyone can accept an invite" on public.couples
  for update
  using (invite_token is not null and user_b is null and status = 'active')
  with check (auth.uid() = user_b);

-- Allow reading couple by invite token (for accepting invites)
create policy "Anyone can read by invite token" on public.couples
  for select using (invite_token is not null);

-- 3. MESSAGES
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id),
  sender_id uuid not null references public.profiles(id),
  ciphertext text not null,
  nonce text not null,
  type text not null default 'text' check (type in ('text', 'photo', 'reaction')),
  reply_to uuid references public.messages(id),
  reaction text,
  seen_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Couple members can read messages" on public.messages
  for select using (
    couple_id in (
      select id from public.couples where auth.uid() = user_a or auth.uid() = user_b
    )
  );

create policy "Couple members can insert messages" on public.messages
  for insert with check (
    auth.uid() = sender_id and
    couple_id in (
      select id from public.couples where (auth.uid() = user_a or auth.uid() = user_b) and status = 'active'
    )
  );

create policy "Couple members can update messages" on public.messages
  for update using (
    couple_id in (
      select id from public.couples where auth.uid() = user_a or auth.uid() = user_b
    )
  );

-- Index for fast message queries
create index if not exists idx_messages_couple_id on public.messages(couple_id, created_at desc);

-- 4. PHOTOS
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id),
  sender_id uuid not null references public.profiles(id),
  storage_path text not null,
  encrypted_key text not null,
  nonce text not null,
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);

alter table public.photos enable row level security;

create policy "Couple members can read photos" on public.photos
  for select using (
    couple_id in (
      select id from public.couples where auth.uid() = user_a or auth.uid() = user_b
    )
  );

create policy "Couple members can insert photos" on public.photos
  for insert with check (
    auth.uid() = sender_id and
    couple_id in (
      select id from public.couples where (auth.uid() = user_a or auth.uid() = user_b) and status = 'active'
    )
  );

-- 5. PHOTO QUOTA
create table if not exists public.photo_quota (
  user_id uuid not null references public.profiles(id),
  quota_date date not null default current_date,
  count int not null default 0,
  primary key (user_id, quota_date)
);

alter table public.photo_quota enable row level security;

create policy "Users can read own quota" on public.photo_quota
  for select using (auth.uid() = user_id);

create policy "Users can upsert own quota" on public.photo_quota
  for insert with check (auth.uid() = user_id);

create policy "Users can update own quota" on public.photo_quota
  for update using (auth.uid() = user_id);

-- 6. CALL SIGNALS
create table if not exists public.call_signals (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id),
  caller_id uuid not null references public.profiles(id),
  type text not null check (type in ('offer', 'answer', 'ice', 'end', 'reject')),
  payload jsonb not null default '{}',
  created_at timestamptz default now()
);

alter table public.call_signals enable row level security;

create policy "Couple members can read call signals" on public.call_signals
  for select using (
    couple_id in (
      select id from public.couples where auth.uid() = user_a or auth.uid() = user_b
    )
  );

create policy "Couple members can insert call signals" on public.call_signals
  for insert with check (
    auth.uid() = caller_id and
    couple_id in (
      select id from public.couples where (auth.uid() = user_a or auth.uid() = user_b) and status = 'active'
    )
  );

-- Auto-cleanup old signals (older than 5 min)
-- You can set up a Supabase cron for this, or just let them accumulate

-- 7. PUSH SUBSCRIPTIONS
create table if not exists public.push_subscriptions (
  user_id uuid primary key references public.profiles(id),
  subscription jsonb not null,
  updated_at timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Users can manage own push sub" on public.push_subscriptions
  for all using (auth.uid() = user_id);

-- 8. ENABLE REALTIME on required tables
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.call_signals;
alter publication supabase_realtime add table public.couples;
alter publication supabase_realtime add table public.profiles;

-- 9. STORAGE BUCKET (run separately if needed)
-- insert into storage.buckets (id, name, public) values ('photos', 'photos', false);
