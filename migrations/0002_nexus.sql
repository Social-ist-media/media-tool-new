-- NEXUS application schema. Per-user rows always keyed by user_id TEXT.
create table if not exists profiles (
  user_id text primary key,
  display_name text not null default '',
  bio text not null default '',
  avatar_url text not null default '',
  theme text not null default 'dark',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists connections (
  id text primary key,
  user_id text not null,
  platform text not null,
  handle text not null,
  display_name text not null default '',
  instance text not null default '',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (user_id, platform, handle)
);
create index if not exists connections_user_id_idx on connections (user_id);

create table if not exists feed_posts (
  id text primary key,
  user_id text not null,
  connection_id text,
  platform text not null,
  external_id text not null,
  author_handle text not null,
  author_name text not null,
  author_avatar text not null default '',
  content text not null,
  media_urls text not null default '[]',
  like_count int not null default 0,
  repost_count int not null default 0,
  reply_count int not null default 0,
  liked boolean not null default false,
  bookmarked boolean not null default false,
  is_own boolean not null default false,
  posted_at timestamptz not null default now(),
  unique (user_id, platform, external_id)
);
create index if not exists feed_posts_user_posted_idx on feed_posts (user_id, posted_at desc);

create table if not exists publish_jobs (
  id text primary key,
  user_id text not null,
  content text not null,
  media_urls text not null default '[]',
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  idempotency_key text
);
create unique index if not exists publish_jobs_user_idem_idx
  on publish_jobs (user_id, idempotency_key)
  where idempotency_key is not null;
create index if not exists publish_jobs_user_created_idx on publish_jobs (user_id, created_at desc);

create table if not exists publish_targets (
  id text primary key,
  job_id text not null references publish_jobs (id) on delete cascade,
  platform text not null,
  status text not null default 'pending',
  external_id text not null default '',
  error text not null default '',
  latency_ms int not null default 0
);
create index if not exists publish_targets_job_idx on publish_targets (job_id);

create table if not exists inbox_items (
  id text primary key,
  user_id text not null,
  platform text not null,
  kind text not null,
  from_handle text not null,
  from_name text not null,
  from_avatar text not null default '',
  content text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists inbox_user_idx on inbox_items (user_id, created_at desc);

create table if not exists audit_events (
  id text primary key,
  user_id text not null,
  action text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists audit_user_idx on audit_events (user_id, created_at desc);

create table if not exists team_invites (
  id text primary key,
  user_id text not null,
  email text not null,
  role text not null default 'member',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists team_invites_user_idx on team_invites (user_id, created_at desc);
