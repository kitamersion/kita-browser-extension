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
begin
  if tg_op = 'INSERT' then
    delta := pg_column_size(new);
  elsif tg_op = 'UPDATE' then
    delta := pg_column_size(new) - pg_column_size(old);
  else -- DELETE
    delta := -pg_column_size(old);
  end if;

  select * into quota from kitamersion.user_quotas
    where user_id = coalesce(new.user_id, old.user_id)
    for update;

  if quota is null then
    raise exception 'no quota row for user %', coalesce(new.user_id, old.user_id);
  end if;

  if delta > 0 and quota.current_bytes + delta > quota.max_bytes then
    raise exception 'storage quota exceeded: % + % > %', quota.current_bytes, delta, quota.max_bytes
      using errcode = 'P0001';
  end if;

  update kitamersion.user_quotas
    set current_bytes = current_bytes + delta
    where user_id = coalesce(new.user_id, old.user_id);

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
