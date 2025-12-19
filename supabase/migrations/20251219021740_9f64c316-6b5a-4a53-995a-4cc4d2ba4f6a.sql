-- Create table to track individual component delivery per construction item in batch
CREATE TABLE public.batch_construction_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_construction_item_id UUID NOT NULL REFERENCES public.batch_construction_items(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_delivered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.batch_construction_components ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins full access to batch_construction_components"
ON public.batch_construction_components
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND is_user_active(auth.uid()));

CREATE POLICY "Managers full access to batch_construction_components"
ON public.batch_construction_components
FOR ALL
USING (has_role(auth.uid(), 'manager'::app_role) AND is_user_active(auth.uid()));

CREATE POLICY "Sellers manage own batch_construction_components"
ON public.batch_construction_components
FOR ALL
USING (
  has_role(auth.uid(), 'seller'::app_role) 
  AND is_user_active(auth.uid()) 
  AND EXISTS (
    SELECT 1 FROM batch_construction_items bci
    JOIN delivery_batches db ON db.id = bci.batch_id
    JOIN orders o ON o.id = db.order_id
    WHERE bci.id = batch_construction_components.batch_construction_item_id 
    AND o.user_id = auth.uid()
  )
);

CREATE POLICY "Workers view batch_construction_components"
ON public.batch_construction_components
FOR SELECT
USING (has_role(auth.uid(), 'worker'::app_role) AND is_user_active(auth.uid()));

CREATE POLICY "Workers update batch_construction_components"
ON public.batch_construction_components
FOR UPDATE
USING (has_role(auth.uid(), 'worker'::app_role) AND is_user_active(auth.uid()));