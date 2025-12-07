-- Make the fulfillment-images bucket private
UPDATE storage.buckets SET public = false WHERE id = 'fulfillment-images';

-- Drop the existing public access policy
DROP POLICY IF EXISTS "Public can view fulfillment images" ON storage.objects;

-- Create policy for authenticated users to view their related images
CREATE POLICY "Authenticated users can view fulfillment images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'fulfillment-images' 
  AND auth.role() = 'authenticated'
);

-- Create policy for authenticated users to upload images
CREATE POLICY "Authenticated users can upload fulfillment images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'fulfillment-images' 
  AND auth.role() = 'authenticated'
);

-- Create policy for authenticated users to delete their uploaded images
CREATE POLICY "Authenticated users can delete fulfillment images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'fulfillment-images' 
  AND auth.role() = 'authenticated'
);