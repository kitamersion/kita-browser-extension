-- supabase/migrations/0008_fix_user_quotas_plan_default.sql

-- 0007 renamed the *value* 'free_tier_1' -> 'free' in kitamersion.plans, but never updated
-- user_quotas.plan's column default, which was still the literal 'free_tier_1' set back when the
-- column was created in 0004. Every new signup's handle_new_user() trigger inserts a bare
-- user_quotas row relying on that default, which no longer exists in plans — violating the
-- user_quotas_tier_fkey foreign key and blocking every signup. Confirmed in production: Postgres
-- error 23503 on that constraint, surfaced by Supabase Auth as "Database error saving new user".
-- 0007 itself has since been corrected too, so a fresh install never hits this — but it was
-- already applied here, and migrations don't re-run once applied, hence this follow-up.
alter table kitamersion.user_quotas alter column plan set default 'free';
