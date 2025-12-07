-- Add quantity fields to shipping preparation in order_fulfillment
ALTER TABLE public.order_fulfillment
ADD COLUMN IF NOT EXISTS shipping_handles_qty integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_hinges_qty integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_weeping_qty integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_labels_qty integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_fins_qty integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_brackets_qty integer DEFAULT 0;

-- Create table for custom shipping preparation items
CREATE TABLE public.custom_shipping_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  is_complete boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_shipping_items ENABLE ROW LEVEL SECURITY;

-- RLS policies matching orders access patterns
CREATE POLICY "Admins full access to custom_shipping_items"
ON public.custom_shipping_items FOR ALL
USING (has_role(auth.uid(), 'admin') AND is_user_active(auth.uid()));

CREATE POLICY "Managers full access to custom_shipping_items"
ON public.custom_shipping_items FOR ALL
USING (has_role(auth.uid(), 'manager') AND is_user_active(auth.uid()));

CREATE POLICY "Workers view and update custom_shipping_items"
ON public.custom_shipping_items FOR SELECT
USING (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));

CREATE POLICY "Workers update custom_shipping_items"
ON public.custom_shipping_items FOR UPDATE
USING (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));

CREATE POLICY "Sellers manage own custom_shipping_items"
ON public.custom_shipping_items FOR ALL
USING (
  has_role(auth.uid(), 'seller') AND is_user_active(auth.uid()) AND
  EXISTS (SELECT 1 FROM orders WHERE orders.id = custom_shipping_items.order_id AND orders.user_id = auth.uid())
);