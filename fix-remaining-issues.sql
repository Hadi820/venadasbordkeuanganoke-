-- Only run the parts that might be missing

-- 1. Ensure public_page_config column exists (safe to run multiple times)
ALTER TABLE public.profile 
ADD COLUMN IF NOT EXISTS public_page_config JSONB DEFAULT '{
  "template": "classic",
  "title": "Vena Pictures", 
  "introduction": "",
  "galleryImages": []
}'::jsonb;

-- 2. Update existing profiles that don't have public_page_config set
UPDATE public.profile 
SET public_page_config = jsonb_build_object(
  'template', COALESCE(public_page_template, 'classic'),
  'title', COALESCE(public_page_title, 'Vena Pictures'),
  'introduction', COALESCE(public_page_introduction, ''),
  'galleryImages', '[]'::jsonb
)
WHERE public_page_config IS NULL 
   OR public_page_config = '{}'::jsonb
   OR NOT (public_page_config ? 'galleryImages');