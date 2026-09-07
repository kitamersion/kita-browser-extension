-- supabase/migrations/0001_sync_tables.sql

create schema if not exists kitamersion;

-- Unlike `public`, a new schema grants no privileges to PostgREST's request
-- roles by default — without this, every query 403s even with correct RLS.
grant usage on schema kitamersion to anon, authenticated;

create table kitamersion.videos (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  video_title text not null,
  video_duration integer not null,
  video_url text not null,
  origin text not null,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  unique_code text,
  tags text[],
  watching_episode_number integer,
  watching_season_year integer,
  media_type text,
  series_title text,
  series_episode_number integer,
  series_season_year integer,
  anilist_series_id integer,
  mal_series_id integer,
  background_cover_image text,
  banner_image text
);

create table kitamersion.tags (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  code text,
  created_at bigint,
  updated_at bigint not null,
  deleted_at bigint,
  color text,
  owner text
);

create table kitamersion.video_tags (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null,
  tag_id uuid not null,
  created_at bigint,
  updated_at bigint not null,
  deleted_at bigint
);

create table kitamersion.auto_tags (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  origin text not null,
  tags text[] not null,
  updated_at bigint not null,
  deleted_at bigint
);

create index videos_user_updated_at_idx on kitamersion.videos (user_id, updated_at);
create index tags_user_updated_at_idx on kitamersion.tags (user_id, updated_at);
create index video_tags_user_updated_at_idx on kitamersion.video_tags (user_id, updated_at);
create index auto_tags_user_updated_at_idx on kitamersion.auto_tags (user_id, updated_at);

alter table kitamersion.videos enable row level security;
alter table kitamersion.tags enable row level security;
alter table kitamersion.video_tags enable row level security;
alter table kitamersion.auto_tags enable row level security;

create policy "videos_owner_all" on kitamersion.videos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "tags_owner_all" on kitamersion.tags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "video_tags_owner_all" on kitamersion.video_tags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "auto_tags_owner_all" on kitamersion.auto_tags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Table-level grants: RLS restricts *which rows*, but PostgREST's anon/authenticated
-- roles also need the underlying table-level privilege before RLS is even considered.
grant select, insert, update, delete on
  kitamersion.videos, kitamersion.tags, kitamersion.video_tags, kitamersion.auto_tags
  to anon, authenticated;
