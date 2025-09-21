-- Add public_page_config column to profile table to store gallery images and other public page settings

ALTER TABLE public.profile 
ADD COLUMN IF NOT EXISTS public_page_config JSONB DEFAULT '{
  "template": "classic",
  "title": "Vena Pictures", 
  "introduction": "",
  "galleryImages": []
}'::jsonb;

-- Update existing profiles to have the default public_page_config if they don't have one
UPDATE public.profile 
SET public_page_config = '{
  "template": "classic",
  "title": "Vena Pictures",
  "introduction": "",
  "galleryImages": []
}'::jsonb
WHERE public_page_config IS NULL;