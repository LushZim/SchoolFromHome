-- Classes / grades
create table public.classes (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  teacher_name text,
  created_at timestamptz default now()
);

-- Lessons
create table public.lessons (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes(id) on delete cascade not null,
  date date not null,
  start_time time not null,
  subject text not null,
  teacher_name text not null,
  join_link text,
  group_name text,
  summary text,
  homework text,
  created_at timestamptz default now()
);

-- Day summaries (the yellow card)
create table public.day_summaries (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes(id) on delete cascade not null,
  date date not null,
  content text not null,
  updated_at timestamptz default now(),
  unique(class_id, date)
);

-- Enable Row Level Security
alter table public.classes enable row level security;
alter table public.lessons enable row level security;
alter table public.day_summaries enable row level security;

-- Anyone (students) can read
create policy "Public read classes" on public.classes for select using (true);
create policy "Public read lessons" on public.lessons for select using (true);
create policy "Public read day_summaries" on public.day_summaries for select using (true);

-- Only logged-in teachers can write
create policy "Auth manage classes" on public.classes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Auth manage lessons" on public.lessons for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Auth manage day_summaries" on public.day_summaries for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
