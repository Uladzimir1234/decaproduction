-- Add delivery tracking columns to order_fulfillment
ALTER TABLE order_fulfillment ADD COLUMN IF NOT EXISTS 
  windows_delivered boolean DEFAULT false;
ALTER TABLE order_fulfillment ADD COLUMN IF NOT EXISTS 
  doors_delivered boolean DEFAULT false;
ALTER TABLE order_fulfillment ADD COLUMN IF NOT EXISTS 
  sliding_doors_delivered boolean DEFAULT false;
ALTER TABLE order_fulfillment ADD COLUMN IF NOT EXISTS 
  screens_delivered_final boolean DEFAULT false;
ALTER TABLE order_fulfillment ADD COLUMN IF NOT EXISTS 
  handles_delivered boolean DEFAULT false;
ALTER TABLE order_fulfillment ADD COLUMN IF NOT EXISTS 
  glass_delivered_final boolean DEFAULT false;
ALTER TABLE order_fulfillment ADD COLUMN IF NOT EXISTS 
  nailing_fins_delivered boolean DEFAULT false;
ALTER TABLE order_fulfillment ADD COLUMN IF NOT EXISTS 
  brackets_delivered boolean DEFAULT false;
ALTER TABLE order_fulfillment ADD COLUMN IF NOT EXISTS 
  delivery_notes text;

-- Add order completion tracking to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS 
  delivery_complete boolean DEFAULT false;

-- Create order_delivery_log table for recording each delivery event
CREATE TABLE public.order_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  delivery_date date NOT NULL,
  items_delivered text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

-- Enable RLS
ALTER TABLE public.order_delivery_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_delivery_log (matching existing patterns)
CREATE POLICY "Admins full access to delivery_log"
ON public.order_delivery_log
FOR ALL
USING (has_role(auth.uid(), 'admin') AND is_user_active(auth.uid()));

CREATE POLICY "Managers full access to delivery_log"
ON public.order_delivery_log
FOR ALL
USING (has_role(auth.uid(), 'manager') AND is_user_active(auth.uid()));

CREATE POLICY "Workers view delivery_log"
ON public.order_delivery_log
FOR SELECT
USING (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));

CREATE POLICY "Sellers view own delivery_log"
ON public.order_delivery_log
FOR SELECT
USING (
  has_role(auth.uid(), 'seller') 
  AND is_user_active(auth.uid()) 
  AND EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_delivery_log.order_id 
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Sellers insert own delivery_log"
ON public.order_delivery_log
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'seller') 
  AND is_user_active(auth.uid()) 
  AND EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_delivery_log.order_id 
    AND orders.user_id = auth.uid()
  )
);