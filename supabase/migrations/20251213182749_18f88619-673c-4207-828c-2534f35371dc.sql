-- Create batch_construction_items table to link constructions to delivery batches
CREATE TABLE public.batch_construction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.delivery_batches(id) ON DELETE CASCADE,
  construction_id uuid NOT NULL REFERENCES public.order_constructions(id) ON DELETE CASCADE,
  include_glass boolean NOT NULL DEFAULT true,
  include_screens boolean NOT NULL DEFAULT true,
  include_blinds boolean NOT NULL DEFAULT true,
  include_hardware boolean NOT NULL DEFAULT true,
  is_delivered boolean NOT NULL DEFAULT false,
  delivery_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(batch_id, construction_id)
);

-- Enable RLS
ALTER TABLE public.batch_construction_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins full access to batch_construction_items"
ON public.batch_construction_items FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND is_user_active(auth.uid()));

CREATE POLICY "Managers full access to batch_construction_items"
ON public.batch_construction_items FOR ALL
USING (has_role(auth.uid(), 'manager'::app_role) AND is_user_active(auth.uid()));

CREATE POLICY "Sellers manage own batch_construction_items"
ON public.batch_construction_items FOR ALL
USING (
  has_role(auth.uid(), 'seller'::app_role) AND is_user_active(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM delivery_batches db
    JOIN orders o ON o.id = db.order_id
    WHERE db.id = batch_construction_items.batch_id AND o.user_id = auth.uid()
  )
);

CREATE POLICY "Workers view batch_construction_items"
ON public.batch_construction_items FOR SELECT
USING (has_role(auth.uid(), 'worker'::app_role) AND is_user_active(auth.uid()));

CREATE POLICY "Workers update batch_construction_items"
ON public.batch_construction_items FOR UPDATE
USING (has_role(auth.uid(), 'worker'::app_role) AND is_user_active(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.batch_construction_items;