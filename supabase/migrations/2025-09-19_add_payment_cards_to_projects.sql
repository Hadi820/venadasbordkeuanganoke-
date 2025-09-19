-- Migration: Add payment card references for printing and transport to projects
-- Created at: 2025-09-19 10:30:00+07:00

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='projects' AND column_name='printing_card_id'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN printing_card_id uuid references public.cards(id) on delete set null;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='projects' AND column_name='transport_card_id'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN transport_card_id uuid references public.cards(id) on delete set null;
  END IF;
END$$;

COMMIT;
