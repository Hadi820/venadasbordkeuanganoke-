-- Run these SQL commands in your Supabase SQL Editor
-- Copy and paste each section one by one

-- 1. Add public_page_config column to profile table
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

-- 2. Fix gallery-images bucket policies to allow anonymous uploads
-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can upload gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete gallery images" ON storage.objects;

-- Drop existing anonymous policies in case they exist
DROP POLICY IF EXISTS "Anyone can upload gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete gallery images" ON storage.objects;

-- Create new policies that allow anonymous access
CREATE POLICY "Anyone can upload gallery images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'gallery-images'
);

CREATE POLICY "Anyone can update gallery images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'gallery-images'
);

CREATE POLICY "Anyone can delete gallery images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'gallery-images'
);