-- Wipes the caller's app data across all four synced tables without touching their account or
-- auth session. Deletes each table explicitly (not via a cascade from auth.users) so the
-- storage-quota trigger's `select ... from user_quotas` always finds a live row while it fires
-- per deleted row — user_quotas itself is untouched here.
create function kitamersion.delete_own_data()
returns void
language plpgsql
security definer
set search_path = kitamersion
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  delete from kitamersion.video_tags where user_id = uid;
  delete from kitamersion.auto_tags where user_id = uid;
  delete from kitamersion.videos where user_id = uid;
  delete from kitamersion.tags where user_id = uid;
end;
$$;

grant execute on function kitamersion.delete_own_data() to authenticated;

-- Deletes the caller's app data via delete_own_data() first (same cascade-order reasoning as
-- above), then removes the auth.users row itself. Runs with the function owner's privileges (the
-- same trick 0002's handle_new_user relies on for the reverse direction), which is what makes
-- deleting a row in auth.users possible from a plain authenticated RPC call. user_quotas has no
-- delete trigger of its own, so its on-delete-cascade from auth.users is safe regardless of
-- ordering.
create function kitamersion.delete_own_account()
returns void
language plpgsql
security definer
set search_path = kitamersion
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  perform kitamersion.delete_own_data();
  delete from auth.users where id = uid;
end;
$$;

grant execute on function kitamersion.delete_own_account() to authenticated;
