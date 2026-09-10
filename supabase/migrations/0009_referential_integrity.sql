-- supabase/migrations/0009_referential_integrity.sql

-- video_tags.video_id/tag_id have never been foreign keys — nothing server-side has ever verified
-- they point at real rows. The client's sync engine (src/api/sync/syncEngine.ts) already pushes in
-- a fixed order (tags/videos before video_tags, with tag_id/video_id remapped via
-- reconcileByNaturalKey's idRemap before push) specifically so a video_tags row is never pushed
-- before the row it references — this constraint makes that assumption enforced, not just implicit.
-- It also gets us cascading cleanup for free: today, if purge_expired_tombstones() or
-- run_retention_sweep() hard-deletes a video/tag, nothing removes video_tags rows still pointing at
-- it unless that row's own deleted_at happens to be set too — they'd otherwise dangle forever.

-- Any row already dangling (referencing a video/tag that no longer exists) is unambiguous garbage —
-- its referent is gone, there's nothing to reconcile it against. Clean these up first so this
-- migration doesn't fail on pre-existing drift.
delete from kitamersion.video_tags
  where video_id not in (select id from kitamersion.videos)
     or tag_id not in (select id from kitamersion.tags);

alter table kitamersion.video_tags
  add constraint video_tags_video_id_fkey foreign key (video_id) references kitamersion.videos(id) on delete cascade,
  add constraint video_tags_tag_id_fkey foreign key (tag_id) references kitamersion.tags(id) on delete cascade;

-- reconcileByNaturalKey (src/api/sync/reconcile.ts) assumes at most one live row per (user_id, code)
-- for tags and (user_id, unique_code) for videos — it builds a Map keyed by that natural key, so if
-- the server ever held two live rows sharing one, the map would silently keep whichever the pull
-- happened to return last rather than erroring. These indexes turn that silent assumption into an
-- enforced one. Partial (deleted_at is null) so a tombstoned tag/video's code can be reused by a
-- fresh row later, matching the soft-delete convention everywhere else in this schema. Also
-- excludes null codes, matching reconcile.ts's own guard (`typeof key === "string" && key.length >
-- 0`) — a null code was never treated as a natural key to begin with, so it shouldn't be forced
-- unique either.
--
-- If either create statement below fails, there's already a live duplicate — find it first with:
--   select user_id, code, count(*) from kitamersion.tags
--     where deleted_at is null and code is not null group by 1, 2 having count(*) > 1;
--   select user_id, unique_code, count(*) from kitamersion.videos
--     where deleted_at is null and unique_code is not null group by 1, 2 having count(*) > 1;
create unique index tags_user_code_live_idx on kitamersion.tags (user_id, code)
  where deleted_at is null and code is not null;
create unique index videos_user_unique_code_live_idx on kitamersion.videos (user_id, unique_code)
  where deleted_at is null and unique_code is not null;
