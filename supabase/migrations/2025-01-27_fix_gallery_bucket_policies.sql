-- Fix gallery-images bucket policies to allow anonymous uploads
-- Since the app uses local authentication, not Supabase Auth

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can upload gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete gallery images" ON storage.objects;

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