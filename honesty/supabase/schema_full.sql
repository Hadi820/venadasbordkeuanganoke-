-- Supabase full schema for Vena Pictures Dashboard
-- TRANSACTIONS
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  description text not null,
  amount numeric not null,
  type text not null, -- INCOME or EXPENSE
  project_id uuid references public.projects(id) on delete set null,
  category text,
  method text,
  card_id uuid references public.cards(id) on delete set null,
  created_at timestamptz not null default now()
);

-- SUGGESTIONS (Public Suggestion Form)
create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  message text not null,
  date timestamptz not null default now(),
  channel text,
  created_at timestamptz not null default now()
);

-- Enable RLS and set minimal policies for public suggestion intake
alter table public.suggestions enable row level security;
do $$
begin
  begin
    create policy "Allow insert for anon (public form)" on public.suggestions
    for insert
    to anon
    with check (true);
  exception when duplicate_object then null;
  end;
  -- Optional (dev): allow select by authenticated users; keep anon read disabled
  begin
    create policy "Allow select for authenticated" on public.suggestions
    for select
    to authenticated
    using (true);
  exception when duplicate_object then null;
  end;
end $$;

-- PROJECT REVISION SUBMISSIONS (Public Revision Form by freelancer)
create table if not exists public.project_revision_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  freelancer_id uuid not null references public.team_members(id) on delete set null,
  revision_id text not null,
  freelancer_notes text,
  drive_link text not null,
  status text not null, -- matches app enum RevisionStatus
  created_at timestamptz not null default now()
);

-- TEAM PAYMENT RECORDS (for Freelancer Portal slips)
create table if not exists public.team_payment_records (
  id uuid primary key default gen_random_uuid(),
  record_number text not null,
  team_member_id uuid references public.team_members(id) on delete set null,
  date date not null,
  project_payment_ids uuid[] not null default '{}',
  total_amount numeric not null,
  vendor_signature text,
  created_at timestamptz not null default now()
);

-- REWARD LEDGER ENTRIES (Freelancer reward pool movements)
create table if not exists public.reward_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid references public.team_members(id) on delete set null,
  date date not null,
  description text not null,
  amount numeric not null,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now()
);
-- Run this in Supabase SQL Editor. This creates core tables with permissive RLS for development.

-- Extensions (uuid)
create extension if not exists pgcrypto;

-- Helper: updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

-- USERS (simple app users for local auth mock)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password text not null,
  full_name text not null,
  company_name text,
  role text not null default 'Admin',
  permissions text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_users_updated before update on public.users for each row execute function public.set_updated_at();

-- PROFILE (Vendor profile / organization settings)
create table if not exists public.profile (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.users(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  company_name text not null,
  website text,
  address text,
  bank_account text,
  authorized_signer text,
  id_number text,
  bio text,
  income_categories text[] default '{}',
  expense_categories text[] default '{}',
  project_types text[] default '{}',
  event_types text[] default '{}',
  asset_categories text[] default '{}',
  sop_categories text[] default '{}',
  package_categories text[] default '{}',
  project_status_config jsonb,
  brand_color text,
  terms_and_conditions text,
  contract_template text,
  briefing_template text,
  public_page_template text default 'classic',
  public_page_title text default 'Vena Pictures',
  public_page_introduction text,
  logo_base64 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profile_updated before update on public.profile for each row execute function public.set_updated_at();

-- CLIENTS
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  whatsapp text,
  since date not null default current_date,
  instagram text,
  status text not null default 'Aktif',
  client_type text not null default 'Langsung',
  last_contact timestamptz not null default now(),
  portal_access_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_clients_updated before update on public.clients for each row execute function public.set_updated_at();

-- PACKAGES
create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null,
  category text not null,
  digital_items text[] default '{}',
  processing_time text,
  default_printing_cost numeric,
  default_transport_cost numeric,
  photographers text,
  videographers text,
  cover_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_packages_updated before update on public.packages for each row execute function public.set_updated_at();

-- ADD ONS
create table if not exists public.add_ons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_addons_updated before update on public.add_ons for each row execute function public.set_updated_at();

-- PROMO CODES
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric not null,
  is_active boolean not null default true,
  usage_count integer not null default 0,
  max_usage integer,
  expiry_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_promos_updated before update on public.promo_codes for each row execute function public.set_updated_at();

-- PROJECTS
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_name text not null,
  client_name text not null,
  client_id uuid references public.clients(id) on delete set null,
  project_type text not null,
  package_name text not null,
  package_id uuid references public.packages(id) on delete set null,
  date date not null,
  deadline_date date,
  location text,
  progress int not null default 0,
  status text not null,
  booking_status text,
  total_cost numeric not null default 0,
  amount_paid numeric not null default 0,
  payment_status text not null,
  notes text,
  accommodation text,
  drive_link text,
  client_drive_link text,
  final_drive_link text,
  promo_code_id uuid references public.promo_codes(id) on delete set null,
  discount_amount numeric,
  printing_cost numeric,
  transport_cost numeric,
  dp_proof_url text,
  is_editing_confirmed_by_client boolean,
  is_printing_confirmed_by_client boolean,
  is_delivery_confirmed_by_client boolean,
  confirmed_sub_statuses text[] default '{}',
  client_sub_status_notes jsonb,
  sub_status_confirmation_sent_at jsonb,
  completed_digital_items text[] default '{}',
  invoice_signature text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_projects_updated before update on public.projects for each row execute function public.set_updated_at();

-- PROJECT ADDONS (join)
create table if not exists public.project_add_ons (
  project_id uuid references public.projects(id) on delete cascade,
  add_on_id uuid references public.add_ons(id) on delete cascade,
  primary key (project_id, add_on_id)
);

-- TEAM MEMBERS
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  email text,
  phone text,
  standard_fee numeric not null default 0,
  no_rek text,
  reward_balance numeric not null default 0,
  rating numeric not null default 0,
  performance_notes jsonb default '[]'::jsonb,
  portal_access_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_team_members_updated before update on public.team_members for each row execute function public.set_updated_at();

-- TEAM ASSIGNMENTS (per project)
create table if not exists public.project_team (
  project_id uuid references public.projects(id) on delete cascade,
  member_id uuid references public.team_members(id) on delete cascade,
  member_name text not null,
  member_role text not null,
  fee numeric not null default 0,
  reward numeric,
  sub_job text,
  primary key (project_id, member_id)
);

-- TEAM PROJECT PAYMENTS
create table if not exists public.team_project_payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  team_member_name text not null,
  team_member_id uuid references public.team_members(id) on delete set null,
  date date not null,
  status text not null check (status in ('Paid','Unpaid')),
  fee numeric not null,
  reward numeric
);

-- TEAM PAYMENT RECORDS
create table if not exists public.team_payment_records (
  id uuid primary key default gen_random_uuid(),
  record_number text not null unique,
  team_member_id uuid references public.team_members(id) on delete set null,
  date date not null,
  project_payment_ids uuid[] not null default '{}',
  total_amount numeric not null,
  vendor_signature text
);

-- POCKETS
create table if not exists public.pockets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text,
  type text not null check (type in ('Nabung & Bayar','Terkunci','Bersama','Anggaran Pengeluaran','Tabungan Hadiah Freelancer')),
  amount numeric not null default 0,
  goal_amount numeric,
  lock_end_date date,
  members jsonb,
  source_card_id uuid
);

-- CARDS
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  card_holder_name text not null,
  bank_name text not null,
  card_type text not null check (card_type in ('Prabayar','Kredit','Debit','Tunai')),
  last_four_digits text not null,
  expiry_date text,
  balance numeric not null default 0,
  color_gradient text
);

-- RPC: increment card balance (atomic update)
create or replace function public.increment_card_balance(p_card_id uuid, p_delta numeric)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.cards
  set balance = coalesce(balance, 0) + p_delta
  where id = p_card_id;
end;
$$;

-- TRANSACTIONS
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  description text not null,
  amount numeric not null,
  type text not null check (type in ('Pemasukan','Pengeluaran')),
  project_id uuid references public.projects(id) on delete set null,
  category text not null,
  method text not null,
  pocket_id uuid references public.pockets(id) on delete set null,
  card_id uuid references public.cards(id) on delete set null,
  printing_item_id text,
  vendor_signature text
);

-- ASSETS
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  purchase_date date not null,
  purchase_price numeric not null,
  serial_number text,
  status text not null check (status in ('Tersedia','Digunakan','Perbaikan')),
  notes text
);

-- CONTRACTS
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  contract_number text not null unique,
  client_id uuid references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  signing_date date not null,
  signing_location text,
  created_at timestamptz not null default now(),
  client_name1 text not null,
  client_address1 text not null,
  client_phone1 text not null,
  client_name2 text,
  client_address2 text,
  client_phone2 text,
  shooting_duration text,
  guaranteed_photos text,
  album_details text,
  digital_files_format text,
  other_items text,
  personnel_count text,
  delivery_timeframe text,
  dp_date date,
  final_payment_date date,
  cancellation_policy text,
  jurisdiction text,
  vendor_signature text,
  client_signature text
);

-- CLIENT FEEDBACK
create table if not exists public.client_feedback (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  satisfaction text not null,
  rating integer not null,
  feedback text not null,
  date date not null
);

-- NOTIFICATIONS
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  timestamp timestamptz not null default now(),
  is_read boolean not null default false,
  icon text not null,
  link jsonb
);

-- SOCIAL MEDIA POSTS
create table if not exists public.social_media_posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  client_name text not null,
  post_type text not null,
  platform text not null,
  scheduled_date date not null,
  caption text not null,
  media_url text,
  status text not null,
  notes text
);

-- LEADS
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_channel text not null,
  location text,
  status text not null,
  date date not null,
  notes text,
  whatsapp text
);

-- SOPs
create table if not exists public.sops (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  content text not null,
  last_updated date not null
);

-- REWARD LEDGER
create table if not exists public.reward_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid references public.team_members(id) on delete set null,
  date date not null,
  description text not null,
  amount numeric not null,
  project_id uuid references public.projects(id) on delete set null
);

-- CALENDAR EVENTS (Internal events for Calendar page)
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
alter table public.calendar_events enable row level security;

-- RLS (Development-open; tighten for prod)
alter table public.users enable row level security;
alter table public.profile enable row level security;
alter table public.clients enable row level security;
alter table public.packages enable row level security;
alter table public.add_ons enable row level security;
alter table public.promo_codes enable row level security;
alter table public.projects enable row level security;
alter table public.project_add_ons enable row level security;
alter table public.team_members enable row level security;
alter table public.project_team enable row level security;
alter table public.team_project_payments enable row level security;
alter table public.team_payment_records enable row level security;
alter table public.pockets enable row level security;
alter table public.cards enable row level security;
alter table public.transactions enable row level security;
alter table public.assets enable row level security;
alter table public.contracts enable row level security;
alter table public.client_feedback enable row level security;
alter table public.notifications enable row level security;
alter table public.social_media_posts enable row level security;
alter table public.leads enable row level security;
alter table public.sops enable row level security;
alter table public.reward_ledger_entries enable row level security;
alter table public.calendar_events enable row level security;

-- Simple permissive policies (dev only) - compatible creation (no IF NOT EXISTS)
do $$
begin
  begin
    create policy "dev read all" on public.users for select using (true);
  exception when duplicate_object then null;
  end;
  begin
    create policy "dev write all" on public.users for all using (true) with check (true);
  exception when duplicate_object then null;
  end;
end $$;

do $$
begin
  perform 1 from pg_tables where schemaname = 'public' and tablename = 'clients';
  -- apply same open policies to all tables listed
  -- helper procedure
end $$;

-- Generate policies for all tables dynamically (handles duplicates via exceptions)
create or replace function public._open_policies(tbl regclass) returns void as $$
begin
  begin
    execute format('create policy "dev read all" on %s for select using (true);', tbl);
  exception when duplicate_object then null;
  end;
  begin
    execute format('create policy "dev insert all" on %s for insert with check (true);', tbl);
  exception when duplicate_object then null;
  end;
  begin
    execute format('create policy "dev update all" on %s for update using (true) with check (true);', tbl);
  exception when duplicate_object then null;
  end;
  begin
    execute format('create policy "dev delete all" on %s for delete using (true);', tbl);
  exception when duplicate_object then null;
  end;
end;$$ language plpgsql set search_path = public;

select public._open_policies('public.profile');
select public._open_policies('public.clients');
select public._open_policies('public.packages');
select public._open_policies('public.add_ons');
select public._open_policies('public.promo_codes');
select public._open_policies('public.projects');
select public._open_policies('public.project_add_ons');
select public._open_policies('public.team_members');
select public._open_policies('public.project_team');
select public._open_policies('public.team_project_payments');
select public._open_policies('public.team_payment_records');
select public._open_policies('public.pockets');
select public._open_policies('public.cards');
select public._open_policies('public.transactions');
select public._open_policies('public.assets');
select public._open_policies('public.contracts');
select public._open_policies('public.client_feedback');
select public._open_policies('public.notifications');
select public._open_policies('public.social_media_posts');
select public._open_policies('public.leads');
select public._open_policies('public.sops');
select public._open_policies('public.reward_ledger_entries');
select public._open_policies('public.calendar_events');

-- Ensure time fields for client projects exist (for Calendar time display)
do $$
begin
  begin
    alter table public.projects add column if not exists start_time text;
  exception when duplicate_column then null;
  end;
  begin
    alter table public.projects add column if not exists end_time text;
  exception when duplicate_column then null;
  end;
end $$;
