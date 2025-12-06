-- Add image URL columns to order_fulfillment
ALTER TABLE public.order_fulfillment 
ADD COLUMN IF NOT EXISTS doors_image_url TEXT,
ADD COLUMN IF NOT EXISTS sliding_doors_image_url TEXT;

-- Create storage bucket for fulfillment images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('fulfillment-images', 'fulfillment-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for authenticated users
CREATE POLICY "Users can upload fulfillment images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'fulfillment-images');

CREATE POLICY "Users can view fulfillment images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'fulfillment-images');

CREATE POLICY "Users can update their fulfillment images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'fulfillment-images');

CREATE POLICY "Users can delete their fulfillment images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'fulfillment-images');

CREATE POLICY "Public can view fulfillment images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'fulfillment-images');