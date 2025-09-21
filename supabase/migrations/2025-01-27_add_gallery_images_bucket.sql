-- Create gallery-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-images', 'gallery-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for gallery-images bucket
CREATE POLICY "Gallery images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'gallery-images');

CREATE POLICY "Authenticated users can upload gallery images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'gallery-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update gallery images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'gallery-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete gallery images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'gallery-images' 
  AND auth.role() = 'authenticated'
);
