-- Tombstoned rows (deleted_at set) keep almost all their original content forever and still count
-- against the storage quota — enforce_storage_quota() only ever tracks column-size deltas, it
-- never frees anything. This function permanently removes tombstones older than the retention
-- window, reclaiming their storage. Scoped to the caller's own rows, same pattern as
-- delete_own_data() in 0005_account_deletion.sql.
create function kitamersion.purge_expired_tombstones()
returns integer
language plpgsql
security definer
set search_path = kitamersion
as $$
declare
  uid uuid := auth.uid();
  -- deleted_at/updated_at are the same ms-since-epoch bigint the client writes with Date.now(),
  -- not a Postgres timestamp — this converts now() - 30 days into that representation to compare.
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

  return purged;
end;
$$;

revoke execute on function kitamersion.purge_expired_tombstones() from public;
grant execute on function kitamersion.purge_expired_tombstones() to authenticated;
