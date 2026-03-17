-- Run this in Supabase SQL Editor
-- Grants access without a code when the role's code_required setting is false

create or replace function public.request_free_access(role_type text)
returns text language plpgsql security definer as $$
declare
  granted text;
  current_level text;
  level_order text[] := array['student', 'teacher', 'admin'];
begin
  -- Check if free access is allowed for this role
  if role_type = 'student' and
     (select value from public.app_settings where key = 'student_code_required') = 'false' then
    granted := 'student';
  elsif role_type = 'teacher' and
     (select value from public.app_settings where key = 'teacher_code_required') = 'false' then
    granted := 'teacher';
  else
    raise exception 'קוד נדרש לתפקיד זה';
  end if;

  -- Never downgrade existing access
  select access_level into current_level from public.user_access where user_id = auth.uid();
  if current_level is not null and
     array_position(level_order, current_level) >= array_position(level_order, granted) then
    return current_level;
  end if;

  insert into public.user_access (user_id, access_level)
    values (auth.uid(), granted)
    on conflict (user_id) do update set access_level = granted, granted_at = now();

  return granted;
end;
$$;
