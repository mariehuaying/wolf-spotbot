-- Run this in your Supabase SQL editor

create table if not exists spots (
  id uuid primary key default gen_random_uuid(),
  spotter_id text not null,       -- Slack user ID of who spotted
  spotted_id text not null,       -- Slack user ID of who got spotted
  channel_id text not null,
  message_ts text not null,
  photo_url text,
  spotted_at timestamptz not null default now()
);

-- Index for fast weekly leaderboard queries
create index if not exists spots_spotted_at_idx on spots (spotted_at);
