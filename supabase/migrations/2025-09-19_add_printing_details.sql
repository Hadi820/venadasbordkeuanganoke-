-- Migration: Add printing_details JSONB to projects
-- Created at: 2025-09-19 10:06:00+07:00

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='projects' AND column_name='printing_details'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN printing_details jsonb;
  END IF;
END$$;

COMMIT;
