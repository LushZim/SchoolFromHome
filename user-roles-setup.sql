-- User roles table
create table public.user_roles (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  is_admin boolean default false,
  is_teacher boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.user_roles enable row level security;

-- All authenticated users can read roles (needed for role checks)
create policy "Authenticated read roles" on public.user_roles
  for select using (auth.role() = 'authenticated');

-- Seed the first admin
insert into public.user_roles (email, is_admin, is_teacher)
values ('ayala.karako@gmail.com', true, true)
on conflict (email) do update set is_admin = true, is_teacher = true;

-- Trigger: auto-insert a row into user_roles when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.user_roles (email)
  values (new.email)
  on conflict (email) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RPC function: admins call this to update another user's roles
-- SECURITY DEFINER means it runs as DB owner, bypassing RLS
-- but it checks internally that the caller is an admin
create or replace function public.set_user_role(
  target_email text,
  make_admin boolean,
  make_teacher boolean
)
returns void
language plpgsql
security definer
as $$
begin
  if not exists (
    select 1 from public.user_roles
    where email = auth.jwt() ->> 'email' and is_admin = true
  ) then
    raise exception 'Unauthorized: not an admin';
  end if;

  insert into public.user_roles (email, is_admin, is_teacher)
  values (target_email, make_admin, make_teacher)
  on conflict (email)
  do update set is_admin = make_admin, is_teacher = make_teacher;
end;
$$;
