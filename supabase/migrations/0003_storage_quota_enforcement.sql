-- supabase/migrations/0003_storage_quota_enforcement.sql

create function kitamersion.enforce_storage_quota()
returns trigger
language plpgsql
security definer
set search_path = kitamersion
as $$
declare
  delta bigint;
  quota record;
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

  if not is_soft_delete and delta > 0 and quota.current_bytes + delta > quota.max_bytes then
    raise exception 'storage quota exceeded: % + % > %', quota.current_bytes, delta, quota.max_bytes
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

create trigger videos_quota before insert or update or delete on kitamersion.videos
  for each row execute function kitamersion.enforce_storage_quota();
create trigger tags_quota before insert or update or delete on kitamersion.tags
  for each row execute function kitamersion.enforce_storage_quota();
create trigger video_tags_quota before insert or update or delete on kitamersion.video_tags
  for each row execute function kitamersion.enforce_storage_quota();
create trigger auto_tags_quota before insert or update or delete on kitamersion.auto_tags
  for each row execute function kitamersion.enforce_storage_quota();
