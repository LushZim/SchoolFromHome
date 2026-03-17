-- User profiles table
create table public.user_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  email text not null unique,
  first_name text not null,
  last_name text not null,
  class_id uuid references public.classes(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.user_profiles enable row level security;

-- Users can manage their own profile
create policy "Users manage own profile" on public.user_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- All authenticated users can read profiles (for admin name search)
create policy "Authenticated read profiles" on public.user_profiles
  for select using (auth.role() = 'authenticated');
