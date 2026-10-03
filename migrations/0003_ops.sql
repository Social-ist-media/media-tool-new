-- Drafts, library, inbox replies, developer keys, approvals, notifications.
create table if not exists drafts (
  id text primary key,
  user_id text not null,
  content text not null default '',
  media_urls text not null default '[]',
  platforms text not null default '[]',
  first_comment text not null default '',
  utm text not null default '',
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists drafts_user_idx on drafts (user_id, updated_at desc);

create table if not exists templates (
  id text primary key,
  user_id text not null,
  title text not null,
  content text not null,
  category text not null default 'general',
  created_at timestamptz not null default now()
);
create index if not exists templates_user_idx on templates (user_id, created_at desc);

create table if not exists canned_replies (
  id text primary key,
  user_id text not null,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists canned_replies_user_idx on canned_replies (user_id);

create table if not exists media_assets (
  id text primary key,
  user_id text not null,
  name text not null,
  mime text not null,
  data_url text not null,
  created_at timestamptz not null default now()
);
create index if not exists media_assets_user_idx on media_assets (user_id, created_at desc);

create table if not exists inbox_replies (
  id text primary key,
  user_id text not null,
  inbox_id text not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists inbox_replies_inbox_idx on inbox_replies (inbox_id, created_at);

create table if not exists notifications (
  id text primary key,
  user_id text not null,
  title text not null,
  body text not null default '',
  href text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

create table if not exists api_keys (
  id text primary key,
  user_id text not null,
  name text not null,
  prefix text not null,
  hash text not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists api_keys_user_idx on api_keys (user_id);
create unique index if not exists api_keys_hash_idx on api_keys (hash);

create table if not exists webhooks (
  id text primary key,
  user_id text not null,
  url text not null,
  events text not null default '[]',
  secret text not null,
  active boolean not null default true,
  last_status int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists webhooks_user_idx on webhooks (user_id);

create table if not exists approvals (
  id text primary key,
  user_id text not null,
  content text not null,
  platforms text not null,
  media_urls text not null default '[]',
  scheduled_at timestamptz,
  status text not null default 'pending',
  reviewer_note text not null default '',
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists approvals_user_idx on approvals (user_id, created_at desc);

create table if not exists job_meta (
  job_id text primary key,
  first_comment text not null default '',
  utm text not null default ''
);
