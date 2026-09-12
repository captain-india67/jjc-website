-- JJC backend schema. Safe to run more than once.
-- Run the whole file in Supabase > SQL Editor.

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  school      text,
  grade       text,
  committee   text,
  role        text not null default 'student' check (role in ('student','admin')),
  created_at  timestamptz not null default now()
);
alter table public.profiles add column if not exists committee text;

create table if not exists public.service_hours (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  activity     text not null,
  category     text,
  hours        numeric(5,1) not null check (hours > 0 and hours <= 24),
  date         date not null,
  reflection   text,
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by  uuid references public.profiles(id),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);

drop table if exists public.initiatives;

alter table public.profiles enable row level security;
alter table public.service_hours enable row level security;

-- Checks whether the caller is an admin without going through RLS on profiles.
-- Policies on profiles that query profiles directly cause "infinite recursion".
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Nobody uses the site without signing in, so anon gets nothing.
revoke all on public.profiles from anon;
revoke all on public.service_hours from anon;

-- Signed-in users can only write these columns. role and email are never
-- editable through the API; promote admins in the SQL editor (see bottom).
revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant insert (id, full_name, email, school, grade, committee) on public.profiles to authenticated;
grant update (full_name, school, grade, committee) on public.profiles to authenticated;

revoke all on public.service_hours from authenticated;
grant select, insert, update, delete on public.service_hours to authenticated;

drop policy if exists "read own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;
drop policy if exists "admin update any profile" on public.profiles;
drop policy if exists "insert own profile" on public.profiles;
drop policy if exists "profiles: read own or admin" on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;

create policy "profiles: read own or admin" on public.profiles
  for select to authenticated
  using (auth.uid() = id or public.is_admin());

create policy "profiles: insert own" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "read own hours" on public.service_hours;
drop policy if exists "insert own hours" on public.service_hours;
drop policy if exists "update own pending hours" on public.service_hours;
drop policy if exists "delete own pending hours" on public.service_hours;
drop policy if exists "admin update any hours" on public.service_hours;
drop policy if exists "hours: read own or admin" on public.service_hours;
drop policy if exists "hours: insert own pending" on public.service_hours;
drop policy if exists "hours: update own pending" on public.service_hours;
drop policy if exists "hours: delete own pending" on public.service_hours;
drop policy if exists "hours: admin review" on public.service_hours;

create policy "hours: read own or admin" on public.service_hours
  for select to authenticated
  using (auth.uid() = user_id or public.is_admin());

create policy "hours: insert own pending" on public.service_hours
  for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending' and reviewed_by is null);

create policy "hours: update own pending" on public.service_hours
  for update to authenticated
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'pending' and reviewed_by is null);

create policy "hours: delete own pending" on public.service_hours
  for delete to authenticated
  using (auth.uid() = user_id and status = 'pending');

create policy "hours: admin review" on public.service_hours
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Mirror every new Google sign-in into profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for anyone who signed in before the trigger existed.
insert into public.profiles (id, full_name, email)
select u.id,
       coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
       u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- To make someone an admin, sign in with that Google account once, then run:
--   update public.profiles set role = 'admin' where email = 'their-email@gmail.com';
