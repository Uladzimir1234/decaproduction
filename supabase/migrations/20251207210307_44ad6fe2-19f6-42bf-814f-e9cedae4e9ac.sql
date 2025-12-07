-- Create table for custom delivery items
CREATE TABLE public.custom_delivery_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_delivered boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_delivery_items ENABLE ROW LEVEL SECURITY;

-- RLS policies matching orders access patterns
CREATE POLICY "Admins full access to custom_delivery_items"
ON public.custom_delivery_items FOR ALL
USING (has_role(auth.uid(), 'admin') AND is_user_active(auth.uid()));

CREATE POLICY "Managers full access to custom_delivery_items"
ON public.custom_delivery_items FOR ALL
USING (has_role(auth.uid(), 'manager') AND is_user_active(auth.uid()));

CREATE POLICY "Workers view and update custom_delivery_items"
ON public.custom_delivery_items FOR SELECT
USING (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));

CREATE POLICY "Workers update custom_delivery_items"
ON public.custom_delivery_items FOR UPDATE
USING (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));

CREATE POLICY "Sellers manage own custom_delivery_items"
ON public.custom_delivery_items FOR ALL
USING (
  has_role(auth.uid(), 'seller') AND is_user_active(auth.uid()) AND
  EXISTS (SELECT 1 FROM orders WHERE orders.id = custom_delivery_items.order_id AND orders.user_id = auth.uid())
);