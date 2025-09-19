-- Migration: Add sub-status related columns to projects table
-- Created at: 2025-09-18 11:52:00+07:00

BEGIN;

-- Only add columns if they do not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'active_sub_statuses'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN active_sub_statuses text[] DEFAULT '{}'::text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'custom_sub_statuses'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN custom_sub_statuses jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'confirmed_sub_statuses'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN confirmed_sub_statuses text[] DEFAULT '{}'::text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'client_sub_status_notes'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN client_sub_status_notes jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'sub_status_confirmation_sent_at'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN sub_status_confirmation_sent_at jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'invoice_signature'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN invoice_signature text;
  END IF;
END$$;

COMMIT;
