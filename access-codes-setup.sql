-- ============================================================
-- Access Code System Setup
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. app_settings: stores codes and config
--    NOT readable by anyone directly (no SELECT policy)
--    Only accessible via SECURITY DEFINER functions
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);
alter table public.app_settings enable row level security;
-- No policies = no direct access from client

-- Seed default values
insert into public.app_settings (key, value) values
  ('student_code', 'Yahalom'),
  ('teacher_code', 'teach@Y'),
  ('admin_code', 'SchoolFromYahalom'),
  ('student_code_required', 'true'),
  ('teacher_code_required', 'true')
on conflict (key) do nothing;

-- ============================================================

-- 2. user_access: per-user access level (keyed by anonymous user_id)
create table if not exists public.user_access (
  user_id uuid references auth.users(id) on delete cascade primary key,
  access_level text not null check (access_level in ('student', 'teacher', 'admin')),
  granted_at timestamptz default now()
);
alter table public.user_access enable row level security;

create policy "Users read own access" on public.user_access
  for select using (auth.uid() = user_id);

create policy "Users manage own access" on public.user_access
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================

-- 3. Helper: get the calling user's current access level
create or replace function public.get_my_access_level()
returns text language sql stable security definer as $$
  select access_level from public.user_access where user_id = auth.uid()
$$;

-- ============================================================

-- 4. RPC: verify a code and grant access (never reveals the actual codes)
--    Returns the granted access level on success, raises exception on failure
create or replace function public.verify_access_code(code text)
returns text language plpgsql security definer as $$
declare
  granted text := null;
  current_level text;
  level_order text[] := array['student', 'teacher', 'admin'];
begin
  -- Check which level this code grants
  if code = (select value from public.app_settings where key = 'admin_code') then
    granted := 'admin';
  elsif code = (select value from public.app_settings where key = 'teacher_code') then
    granted := 'teacher';
  elsif code = (select value from public.app_settings where key = 'student_code') then
    granted := 'student';
  end if;

  if granted is null then
    raise exception 'קוד שגוי';
  end if;

  -- Never downgrade: only upgrade to a higher level
  select access_level into current_level from public.user_access where user_id = auth.uid();
  if current_level is not null and
     array_position(level_order, current_level) >= array_position(level_order, granted) then
    return current_level; -- already at same or higher level, no change needed
  end if;

  -- Upsert access level
  insert into public.user_access (user_id, access_level)
    values (auth.uid(), granted)
    on conflict (user_id) do update set access_level = granted, granted_at = now();

  return granted;
end;
$$;

-- ============================================================

-- 5. RPC: get public settings (only the code_required flags, NOT the codes themselves)
create or replace function public.get_public_settings()
returns json language sql security definer as $$
  select json_build_object(
    'student_code_required', (select value from public.app_settings where key = 'student_code_required'),
    'teacher_code_required', (select value from public.app_settings where key = 'teacher_code_required')
  )
$$;

-- ============================================================

-- 6. RPC: admin updates a setting
--    Caller must either have admin access level OR provide the correct admin code
create or replace function public.admin_update_setting(
  admin_code_input text,
  setting_key text,
  new_value text
)
returns void language plpgsql security definer as $$
begin
  if (select access_level from public.user_access where user_id = auth.uid()) != 'admin'
     and admin_code_input != (select value from public.app_settings where key = 'admin_code') then
    raise exception 'Unauthorized: not an admin';
  end if;

  update public.app_settings
    set value = new_value, updated_at = now()
    where key = setting_key;
end;
$$;

-- ============================================================

-- 7. Update RLS on existing data tables to require at least student access
--    (classes and lessons — adjust names if different in your project)

-- Classes: readable by students+, writable by teachers+
do $$ begin
  drop policy if exists "Authenticated read classes" on public.classes;
  drop policy if exists "Authenticated insert classes" on public.classes;
  drop policy if exists "Authenticated update classes" on public.classes;
  drop policy if exists "Authenticated delete classes" on public.classes;
  drop policy if exists "Student read classes" on public.classes;
  drop policy if exists "Teacher write classes" on public.classes;
  drop policy if exists "Teacher update classes" on public.classes;
  drop policy if exists "Teacher delete classes" on public.classes;
exception when undefined_table then null;
end $$;

create policy "Student read classes" on public.classes
  for select using (public.get_my_access_level() in ('student', 'teacher', 'admin'));

create policy "Teacher write classes" on public.classes
  for insert with check (public.get_my_access_level() in ('teacher', 'admin'));

create policy "Teacher update classes" on public.classes
  for update using (public.get_my_access_level() in ('teacher', 'admin'));

create policy "Teacher delete classes" on public.classes
  for delete using (public.get_my_access_level() in ('teacher', 'admin'));

-- Lessons: readable by students+, writable by teachers+
do $$ begin
  drop policy if exists "Authenticated read lessons" on public.lessons;
  drop policy if exists "Authenticated insert lessons" on public.lessons;
  drop policy if exists "Authenticated update lessons" on public.lessons;
  drop policy if exists "Authenticated delete lessons" on public.lessons;
  drop policy if exists "Student read lessons" on public.lessons;
  drop policy if exists "Teacher write lessons" on public.lessons;
  drop policy if exists "Teacher update lessons" on public.lessons;
  drop policy if exists "Teacher delete lessons" on public.lessons;
exception when undefined_table then null;
end $$;

create policy "Student read lessons" on public.lessons
  for select using (public.get_my_access_level() in ('student', 'teacher', 'admin'));

create policy "Teacher write lessons" on public.lessons
  for insert with check (public.get_my_access_level() in ('teacher', 'admin'));

create policy "Teacher update lessons" on public.lessons
  for update using (public.get_my_access_level() in ('teacher', 'admin'));

create policy "Teacher delete lessons" on public.lessons
  for delete using (public.get_my_access_level() in ('teacher', 'admin'));

-- ============================================================
-- IMPORTANT: Enable anonymous sign-ins in Supabase Dashboard
-- Authentication → Settings → "Allow anonymous sign-ins" → Enable
-- ============================================================
