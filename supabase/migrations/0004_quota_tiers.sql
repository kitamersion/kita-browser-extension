-- supabase/migrations/0004_quota_tiers.sql

-- Storage limits move out of user_quotas and into a lookup table, so changing a tier's limit
-- (or adding new tiers) is an UPDATE/INSERT against data, not a schema migration.
create table kitamersion.quota_tiers (
  tier text primary key,
  max_bytes bigint not null
);

alter table kitamersion.quota_tiers enable row level security;

-- Tier limits aren't per-user secrets; any authenticated user can read the whole tier list. The
-- table-level grant below (mirroring 0002's reasoning) still keeps `anon` out entirely.
create policy "quota_tiers_select" on kitamersion.quota_tiers
  for select using (true);

grant select on kitamersion.quota_tiers to authenticated;

insert into kitamersion.quota_tiers (tier, max_bytes) values ('free_tier_1', 2097152);

-- 'free_tier_1' must exist before this runs: the new column's default backfills every existing
-- row immediately, and that backfill has to satisfy the foreign key.
alter table kitamersion.user_quotas
  add column tier text not null default 'free_tier_1' references kitamersion.quota_tiers(tier);

alter table kitamersion.user_quotas drop column max_bytes;

-- Replaces the 0003 definition: the quota check now joins quota_tiers for the live limit instead
-- of reading a max_bytes column that no longer exists on user_quotas.
create or replace function kitamersion.enforce_storage_quota()
returns trigger
language plpgsql
security definer
set search_path = kitamersion
as $$
declare
  delta bigint;
  quota kitamersion.user_quotas%rowtype;
  tier_max_bytes bigint;
  target_user_id uuid;
  is_soft_delete boolean := false;
begin
  -- NEW is *unassigned* (not null) in a row-level DELETE trigger, so referencing new.user_id there
  -- — even inside coalesce() — raises 'record "new" is not assigned yet'. Branch on tg_op instead.
  if tg_op = 'DELETE' then
    target_user_id := old.user_id;
    delta := -pg_column_size(old);
  elsif tg_op = 'UPDATE' then
    target_user_id := new.user_id;
    delta := pg_column_size(new) - pg_column_size(old);
    -- A soft-delete (deleted_at null -> timestamp) is technically a small positive size delta. A
    -- user already at their cap must still be able to delete things to free space, so this one
    -- transition is exempt from the quota-exceeded check; the accounting update below still runs.
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

  select max_bytes into tier_max_bytes from kitamersion.quota_tiers where tier = quota.tier;

  if not is_soft_delete and delta > 0 and quota.current_bytes + delta > tier_max_bytes then
    raise exception 'storage quota exceeded: % + % > %', quota.current_bytes, delta, tier_max_bytes
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
