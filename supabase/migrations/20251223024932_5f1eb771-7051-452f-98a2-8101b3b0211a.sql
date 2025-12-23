-- Add pdf_file_path column to order_constructions
ALTER TABLE public.order_constructions 
ADD COLUMN pdf_file_path TEXT DEFAULT NULL;

-- Create storage bucket for construction PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('construction-pdfs', 'construction-pdfs', false);

-- RLS policies for construction PDFs bucket
CREATE POLICY "Authenticated users can upload construction PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'construction-pdfs');

CREATE POLICY "Authenticated users can view construction PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'construction-pdfs');

CREATE POLICY "Authenticated users can update construction PDFs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'construction-pdfs');

CREATE POLICY "Authenticated users can delete construction PDFs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'construction-pdfs');