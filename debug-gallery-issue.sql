-- Debug script to check gallery images issue

-- 1. Check if public_page_config column exists
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'profile' 
  AND table_schema = 'public'
  AND column_name = 'public_page_config';

-- 2. Check current profile data
SELECT 
    id,
    full_name,
    public_page_config,
    public_page_template,
    public_page_title,
    public_page_introduction
FROM public.profile 
ORDER BY created_at DESC
LIMIT 1;

-- 3. Check if there are any gallery images in the data
SELECT 
    id,
    full_name,
    public_page_config->'galleryImages' as gallery_images,
    jsonb_array_length(public_page_config->'galleryImages') as gallery_count
FROM public.profile 
WHERE public_page_config IS NOT NULL
ORDER BY created_at DESC;

-- 4. Check storage bucket and objects
SELECT 
    name,
    id,
    public
FROM storage.buckets 
WHERE name = 'gallery-images';

-- 5. Check if there are any uploaded files in gallery-images bucket
SELECT 
    name,
    bucket_id,
    created_at,
    updated_at
FROM storage.objects 
WHERE bucket_id = 'gallery-images'
ORDER BY created_at DESC
LIMIT 10;