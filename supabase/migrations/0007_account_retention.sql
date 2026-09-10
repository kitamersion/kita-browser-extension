-- supabase/migrations/0007_account_retention.sql

-- Generalizes quota_tiers into plans: every per-plan limit lives on one row, so a future paid
-- plan (or a brand-new kind of limit) is an insert/additive-column, never a breaking migration.
-- Renaming (not dropping+recreating) keeps the existing user_quotas FK intact automatically.
alter table kitamersion.quota_tiers rename to plans;
alter table kitamersion.plans rename column tier to plan;
alter table kitamersion.plans
  add column data_retention_days int not null default 90,
  add column account_retention_days int not null default 365,
  add constraint account_retention_at_least_data_retention
    check (account_retention_days >= data_retention_days);

update kitamersion.plans set plan = 'free' where plan = 'free_tier_1';

alter table kitamersion.user_quotas rename column tier to plan;
-- Server-set (via now()), never client-supplied, so there's no clock-skew trust issue. Defaults
-- to now() so a user who signs up and never completes a first sync still has a starting point —
-- comparing against null in the sweep's where clause would otherwise silently mean "never expires."
alter table kitamersion.user_quotas
  add column last_synced_at timestamptz not null default now();

-- Replaces the 0004 definition: quota_tiers/tier no longer exist under those names. Renaming a
-- table/column doesn't rewrite the text of functions that reference it, so this replace is
-- required even though the rename itself was transparent to the FK (same reasoning 0004 already
-- documented when it replaced 0003's version).
create or replace function kitamersion.enforce_storage_quota()
returns trigger
language plpgsql
security definer
set search_path = kitamersion
as $$
declare
  delta bigint;
  quota kitamersion.user_quotas%rowtype;
  plan_max_bytes bigint;
  target_user_id uuid;
  is_soft_delete boolean := false;
begin
  if tg_op = 'DELETE' then
    target_user_id := old.user_id;
    delta := -pg_column_size(old);
  elsif tg_op = 'UPDATE' then
    target_user_id := new.user_id;
    delta := pg_column_size(new) - pg_column_size(old);
    is_soft_delete := old.deleted_at is null and new.deleted_at is not null;
  else -- INSERT
    target_user_id := new.user_id;
    delta := pg_column_size(new);
  end if;

  select * into quota from kitamersion.user_quotas
    where user_id = target_user_id
    for update;

  if quota is null then
    raise exception 'no quota row for user %', target_user_id;
  end if;

  select max_bytes into plan_max_bytes from kitamersion.plans where plan = quota.plan;

  if not is_soft_delete and delta > 0 and quota.current_bytes + delta > plan_max_bytes then
    raise exception 'storage quota exceeded: % + % > %', quota.current_bytes, delta, plan_max_bytes
      using errcode = 'P0001';
  end if;

  update kitamersion.user_quotas
    set current_bytes = current_bytes + delta
    where user_id = target_user_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Replaces the 0006 definition: stamps last_synced_at in the same call, piggybacking on the RPC
-- that already runs after every successful sync (and from the manual "Clear expired tombstones"
-- Danger Zone button) — no new RPC, no extra round trip. The manual button counting as activity
-- is intentional, not an oversight.
create or replace function kitamersion.purge_expired_tombstones()
returns integer
language plpgsql
security definer
set search_path = kitamersion
as $$
declare
  uid uuid := auth.uid();
  cutoff bigint := (extract(epoch from (now() - interval '30 days')) * 1000)::bigint;
  purged integer := 0;
  deleted integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  delete from kitamersion.video_tags where user_id = uid and deleted_at is not null and deleted_at < cutoff;
  get diagnostics deleted = row_count;
  purged := purged + deleted;

  delete from kitamersion.auto_tags where user_id = uid and deleted_at is not null and deleted_at < cutoff;
  get diagnostics deleted = row_count;
  purged := purged + deleted;

  delete from kitamersion.videos where user_id = uid and deleted_at is not null and deleted_at < cutoff;
  get diagnostics deleted = row_count;
  purged := purged + deleted;

  delete from kitamersion.tags where user_id = uid and deleted_at is not null and deleted_at < cutoff;
  get diagnostics deleted = row_count;
  purged := purged + deleted;

  update kitamersion.user_quotas set last_synced_at = now() where user_id = uid;

  return purged;
end;
$$;

-- Daily sweep, run by pg_cron under its own role (not through PostgREST, so not scoped to a
-- single auth.uid() like every other function in this schema). Two idempotent passes: wipe data
-- for accounts past their plan's data_retention_days (keeps the login alive), then delete
-- accounts entirely past account_retention_days. Temp tables (not a repeated CTE per statement)
-- keep the affected-user set consistent across the four table deletes and the counter reset
-- within one run. Safe to run daily even when nothing is due.
create extension if not exists pg_cron with schema extensions;

create function kitamersion.run_retention_sweep()
returns table(data_wiped integer, accounts_deleted integer)
language plpgsql
security definer
set search_path = kitamersion
as $$
declare
  wiped integer := 0;
  deleted_accounts integer := 0;
begin
  create temporary table expired_data_users on commit drop as
    select uq.user_id
    from kitamersion.user_quotas uq
    join kitamersion.plans p on p.plan = uq.plan
    where uq.last_synced_at < now() - (p.data_retention_days || ' days')::interval
      and uq.current_bytes > 0;

  delete from kitamersion.video_tags where user_id in (select user_id from expired_data_users);
  delete from kitamersion.auto_tags where user_id in (select user_id from expired_data_users);
  delete from kitamersion.videos where user_id in (select user_id from expired_data_users);
  delete from kitamersion.tags where user_id in (select user_id from expired_data_users);

  update kitamersion.user_quotas set current_bytes = 0
    where user_id in (select user_id from expired_data_users);
  select count(*) into wiped from expired_data_users;

  create temporary table expired_accounts on commit drop as
    select uq.user_id
    from kitamersion.user_quotas uq
    join kitamersion.plans p on p.plan = uq.plan
    where uq.last_synced_at < now() - (p.account_retention_days || ' days')::interval;

  delete from auth.users where id in (select user_id from expired_accounts);
  select count(*) into deleted_accounts from expired_accounts;

  return query select wiped, deleted_accounts;
end;
$$;

-- '0 3 * * *' = every day at 03:00 UTC.
select cron.schedule('kitamersion-retention-sweep', '0 3 * * *', $$select kitamersion.run_retention_sweep();$$);
