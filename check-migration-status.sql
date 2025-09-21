-- Check if migrations were successful

-- 1. Check if public_page_config column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profile' 
AND table_schema = 'public'
AND column_name = 'public_page_config';

-- 2. Check current profile data
SELECT id, public_page_config, public_page_template, public_page_title 
FROM public.profile 
LIMIT 1;

-- 3. Check storage policies for gallery-images bucket
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%gallery%'
ORDER BY policyname;