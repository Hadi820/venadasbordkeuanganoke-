-- Create table for project revisions
create table if not exists public.project_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  date timestamptz not null,
  admin_notes text not null,
  deadline timestamptz not null,
  freelancer_id text not null,
  status text not null,
  freelancer_notes text,
  drive_link text,
  completed_date timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_project_revisions_project_id on public.project_revisions(project_id);
