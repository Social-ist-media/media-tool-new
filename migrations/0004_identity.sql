-- Usernames, listen-only RSS, and recurring series.
alter table profiles add column if not exists username text not null default '';

create unique index if not exists profiles_username_uidx
  on profiles (username)
  where username <> '';

create table if not exists rss_sources (
  id text primary key,
  user_id text not null,
  url text not null,
  title text not null default '',
  last_fetched_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists rss_sources_user_url_idx on rss_sources (user_id, url);
create index if not exists rss_sources_user_idx on rss_sources (user_id, created_at desc);

create table if not exists series (
  id text primary key,
  user_id text not null,
  content text not null,
  platforms text not null,
  cadence text not null,
  next_run_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists series_user_idx on series (user_id, next_run_at);
