-- Supabase schema for initial integration (clients table)
-- Run this in Supabase SQL Editor

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  whatsapp text,
  since date not null default current_date,
  instagram text,
  status text not null default 'Prospek',
  client_type text not null default 'Langsung',
  last_contact timestamp with time zone not null default now(),
  portal_access_id text not null unique,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Triggers to update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

-- Enable Row Level Security
alter table public.clients enable row level security;

-- Simple open policies for development (adjust for production)
create policy "Allow read for anon" on public.clients
for select
using (true);

create policy "Allow insert for anon" on public.clients
for insert
with check (true);

create policy "Allow update for anon" on public.clients
for update
using (true)
with check (true);

create policy "Allow delete for anon" on public.clients
for delete
using (true);
