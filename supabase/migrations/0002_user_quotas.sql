-- supabase/migrations/0002_user_quotas.sql

create table kitamersion.user_quotas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  max_bytes bigint not null default 5242880,
  current_bytes bigint not null default 0
);

alter table kitamersion.user_quotas enable row level security;

create policy "user_quotas_owner_select" on kitamersion.user_quotas
  for select using (user_id = auth.uid());

create function kitamersion.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = kitamersion
as $$
begin
  insert into kitamersion.user_quotas (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function kitamersion.handle_new_user();

-- Table-level grant: RLS restricts *which rows*, but PostgREST checks the table-level privilege
-- before RLS is even consulted (same reasoning as the grants in 0001_sync_tables.sql). Without
-- this, getQuotaUsage() gets permission denied. `anon` is deliberately omitted — there is no
-- anonymous quota to read.
grant select on kitamersion.user_quotas to authenticated;

-- Backfill accounts created before this migration was applied. handle_new_user only fires on new
-- signups, so without this any pre-existing user has no quota row and every write for them is
-- rejected by the 0003 enforcement trigger's 'no quota row for user %'. Idempotent, and a no-op
-- when there are no pre-existing users.
insert into kitamersion.user_quotas (user_id) select id from auth.users on conflict do nothing;
