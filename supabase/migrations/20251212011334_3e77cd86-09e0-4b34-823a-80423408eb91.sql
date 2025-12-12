-- Create procurement_cart table for shared cart between admin/manager
CREATE TABLE public.procurement_cart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  customer_name text NOT NULL,
  component_type text NOT NULL,
  component_name text,
  quantity integer NOT NULL DEFAULT 1,
  is_file_extracted boolean NOT NULL DEFAULT false,
  added_by uuid NOT NULL,
  added_by_email text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(order_id, component_type, component_name)
);

-- Enable RLS
ALTER TABLE public.procurement_cart ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access to procurement_cart"
ON public.procurement_cart
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND is_user_active(auth.uid()));

-- Managers full access
CREATE POLICY "Managers full access to procurement_cart"
ON public.procurement_cart
FOR ALL
USING (has_role(auth.uid(), 'manager'::app_role) AND is_user_active(auth.uid()));

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.procurement_cart;