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
