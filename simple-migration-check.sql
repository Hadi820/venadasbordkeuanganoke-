-- Simple check and fix for gallery images

-- 1. Check if column exists
DO $$
BEGIN
    -- Add column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profile' 
        AND column_name = 'public_page_config'
    ) THEN
        ALTER TABLE public.profile 
        ADD COLUMN public_page_config JSONB DEFAULT '{
          "template": "classic",
          "title": "Vena Pictures", 
          "introduction": "",
          "galleryImages": []
        }'::jsonb;
    END IF;
END $$;

-- 2. Update existing profiles to have proper structure
UPDATE public.profile 
SET public_page_config = jsonb_build_object(
  'template', COALESCE(public_page_template, 'classic'),
  'title', COALESCE(public_page_title, 'Vena Pictures'),
  'introduction', COALESCE(public_page_introduction, ''),
  'galleryImages', COALESCE(public_page_config->'galleryImages', '[]'::jsonb)
)
WHERE public_page_config IS NULL 
   OR NOT (public_page_config ? 'galleryImages');

-- 3. Show current status
SELECT 
    'Column exists' as status,
    COUNT(*) as profile_count,
    COUNT(CASE WHEN public_page_config IS NOT NULL THEN 1 END) as profiles_with_config
FROM public.profile;