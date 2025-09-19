-- Migration: Add transport_paid (boolean) and transport_note (text) to projects
-- Created at: 2025-09-19 10:26:00+07:00

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='projects' AND column_name='transport_paid'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN transport_paid boolean default false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='projects' AND column_name='transport_note'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN transport_note text;
  END IF;
END$$;

COMMIT;
