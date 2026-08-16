-- CareerRadar AI — initial persistent schema
-- Run via Supabase CLI: supabase db push
-- Or paste into Supabase Dashboard → SQL Editor

-- ---------------------------------------------------------------------------
-- Profiles (structured professional data; skills as JSONB arrays)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  email text,
  first_name text,
  profile_data jsonb not null default '{}'::jsonb,
  normalized_skills jsonb not null default '[]'::jsonb,
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_user_id_idx on public.profiles(user_id);

-- ---------------------------------------------------------------------------
-- Resumes (file metadata + parsed data; exactly one active per user)
-- ---------------------------------------------------------------------------
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  storage_path text not null,
  file_type text,
  parsed_data jsonb,
  raw_text text,
  version integer not null default 1,
  is_active boolean not null default false,
  uploaded_at timestamptz not null default now()
);

create index if not exists resumes_user_id_idx on public.resumes(user_id);
create index if not exists resumes_user_active_idx on public.resumes(user_id, is_active)
  where is_active = true;

-- ---------------------------------------------------------------------------
-- User preferences & career goals
-- ---------------------------------------------------------------------------
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  role_suggestions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Saved / applied / dismissed jobs + interaction payloads
-- ---------------------------------------------------------------------------
create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text not null,
  job_snapshot jsonb not null,
  status text not null default 'SAVED',
  match_score numeric,
  match_category text,
  application_package jsonb,
  resume_optimization jsonb,
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create index if not exists saved_jobs_user_id_idx on public.saved_jobs(user_id);

-- ---------------------------------------------------------------------------
-- Latest job search cache (matches, market analysis, learning plan)
-- ---------------------------------------------------------------------------
create table if not exists public.job_search_cache (
  user_id uuid primary key references auth.users(id) on delete cascade,
  jobs jsonb not null default '[]'::jsonb,
  matches jsonb not null default '{}'::jsonb,
  market_analysis jsonb,
  learning_plan jsonb,
  last_job_search timestamptz,
  last_search_freshness text,
  last_search_remote_type text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists user_preferences_updated_at on public.user_preferences;
create trigger user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

drop trigger if exists saved_jobs_updated_at on public.saved_jobs;
create trigger saved_jobs_updated_at
  before update on public.saved_jobs
  for each row execute function public.set_updated_at();

drop trigger if exists job_search_cache_updated_at on public.job_search_cache;
create trigger job_search_cache_updated_at
  before update on public.job_search_cache
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.user_preferences enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.job_search_cache enable row level security;

-- profiles
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = user_id);

-- resumes
create policy "resumes_select_own" on public.resumes for select using (auth.uid() = user_id);
create policy "resumes_insert_own" on public.resumes for insert with check (auth.uid() = user_id);
create policy "resumes_update_own" on public.resumes for update using (auth.uid() = user_id);
create policy "resumes_delete_own" on public.resumes for delete using (auth.uid() = user_id);

-- user_preferences
create policy "user_preferences_select_own" on public.user_preferences for select using (auth.uid() = user_id);
create policy "user_preferences_insert_own" on public.user_preferences for insert with check (auth.uid() = user_id);
create policy "user_preferences_update_own" on public.user_preferences for update using (auth.uid() = user_id);
create policy "user_preferences_delete_own" on public.user_preferences for delete using (auth.uid() = user_id);

-- saved_jobs
create policy "saved_jobs_select_own" on public.saved_jobs for select using (auth.uid() = user_id);
create policy "saved_jobs_insert_own" on public.saved_jobs for insert with check (auth.uid() = user_id);
create policy "saved_jobs_update_own" on public.saved_jobs for update using (auth.uid() = user_id);
create policy "saved_jobs_delete_own" on public.saved_jobs for delete using (auth.uid() = user_id);

-- job_search_cache
create policy "job_search_cache_select_own" on public.job_search_cache for select using (auth.uid() = user_id);
create policy "job_search_cache_insert_own" on public.job_search_cache for insert with check (auth.uid() = user_id);
create policy "job_search_cache_update_own" on public.job_search_cache for update using (auth.uid() = user_id);
create policy "job_search_cache_delete_own" on public.job_search_cache for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket (run once; safe to re-run with on conflict)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
  ]
)
on conflict (id) do nothing;

create policy "resumes_storage_select_own"
  on storage.objects for select
  using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "resumes_storage_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "resumes_storage_update_own"
  on storage.objects for update
  using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "resumes_storage_delete_own"
  on storage.objects for delete
  using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
