-- Ensure required extensions
create extension if not exists pgcrypto;

-- Create calendar_events table for internal calendar items
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null,
  date date not null,
  start_time text,
  end_time text,
  notes text,
  team jsonb default '[]'::jsonb,
  image text,
  location text,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.calendar_events enable row level security;

-- Development-only permissive policies (adjust for production)
-- Allow read for all authenticated/anon (Supabase Edge configs)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'calendar_events' and policyname = 'calendar_events_select'
  ) then
    create policy "calendar_events_select" on public.calendar_events
      for select using (true);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'calendar_events' and policyname = 'calendar_events_insert'
  ) then
    create policy "calendar_events_insert" on public.calendar_events
      for insert with check (true);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'calendar_events' and policyname = 'calendar_events_update'
  ) then
    create policy "calendar_events_update" on public.calendar_events
      for update using (true) with check (true);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'calendar_events' and policyname = 'calendar_events_delete'
  ) then
    create policy "calendar_events_delete" on public.calendar_events
      for delete using (true);
  end if;
end$$;
