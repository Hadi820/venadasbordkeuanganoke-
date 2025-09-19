-- Migration: Add frequently used operational columns to projects
-- Created at: 2025-09-18 12:31:00+07:00

BEGIN;

DO $$
BEGIN
  -- Schedule & links
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='deadline_date'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN deadline_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='start_time'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN start_time time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='end_time'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN end_time time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='drive_link'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN drive_link text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='client_drive_link'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN client_drive_link text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='final_drive_link'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN final_drive_link text;
  END IF;

  -- Shipping details
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='shipping_details'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN shipping_details text;
  END IF;

  -- Progress
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='progress'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN progress integer DEFAULT 0;
  END IF;

  -- Costs & misc
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='printing_cost'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN printing_cost numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='transport_cost'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN transport_cost numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='dp_proof_url'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN dp_proof_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='completed_digital_items'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN completed_digital_items text[] DEFAULT '{}'::text[];
  END IF;
END$$;

COMMIT;
