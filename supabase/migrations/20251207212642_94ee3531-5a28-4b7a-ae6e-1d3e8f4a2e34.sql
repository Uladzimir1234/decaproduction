-- Create delivery batches table
CREATE TABLE public.delivery_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  delivery_date date NOT NULL,
  status text NOT NULL DEFAULT 'preparing',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- Enable RLS
ALTER TABLE public.delivery_batches ENABLE ROW LEVEL SECURITY;

-- Batch shipping preparation items (standard items from order)
CREATE TABLE public.batch_shipping_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid NOT NULL REFERENCES public.delivery_batches(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  is_complete boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.batch_shipping_items ENABLE ROW LEVEL SECURITY;

-- Batch delivery items (standard items from order)
CREATE TABLE public.batch_delivery_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid NOT NULL REFERENCES public.delivery_batches(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  is_delivered boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.batch_delivery_items ENABLE ROW LEVEL SECURITY;

-- Batch custom shipping items
CREATE TABLE public.batch_custom_shipping_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid NOT NULL REFERENCES public.delivery_batches(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  is_complete boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.batch_custom_shipping_items ENABLE ROW LEVEL SECURITY;

-- Batch custom delivery items
CREATE TABLE public.batch_custom_delivery_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid NOT NULL REFERENCES public.delivery_batches(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  is_delivered boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.batch_custom_delivery_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for delivery_batches
CREATE POLICY "Admins full access to delivery_batches" ON public.delivery_batches
FOR ALL USING (has_role(auth.uid(), 'admin') AND is_user_active(auth.uid()));

CREATE POLICY "Managers full access to delivery_batches" ON public.delivery_batches
FOR ALL USING (has_role(auth.uid(), 'manager') AND is_user_active(auth.uid()));

CREATE POLICY "Sellers manage own delivery_batches" ON public.delivery_batches
FOR ALL USING (
  has_role(auth.uid(), 'seller') AND is_user_active(auth.uid()) AND
  EXISTS (SELECT 1 FROM orders WHERE orders.id = delivery_batches.order_id AND orders.user_id = auth.uid())
);

CREATE POLICY "Workers view and update delivery_batches" ON public.delivery_batches
FOR SELECT USING (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));

CREATE POLICY "Workers update delivery_batches" ON public.delivery_batches
FOR UPDATE USING (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));

-- RLS Policies for batch_shipping_items
CREATE POLICY "Admins full access to batch_shipping_items" ON public.batch_shipping_items
FOR ALL USING (has_role(auth.uid(), 'admin') AND is_user_active(auth.uid()));

CREATE POLICY "Managers full access to batch_shipping_items" ON public.batch_shipping_items
FOR ALL USING (has_role(auth.uid(), 'manager') AND is_user_active(auth.uid()));

CREATE POLICY "Sellers manage own batch_shipping_items" ON public.batch_shipping_items
FOR ALL USING (
  has_role(auth.uid(), 'seller') AND is_user_active(auth.uid()) AND
  EXISTS (SELECT 1 FROM delivery_batches db JOIN orders o ON o.id = db.order_id WHERE db.id = batch_shipping_items.batch_id AND o.user_id = auth.uid())
);

CREATE POLICY "Workers view and update batch_shipping_items" ON public.batch_shipping_items
FOR SELECT USING (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));

CREATE POLICY "Workers update batch_shipping_items" ON public.batch_shipping_items
FOR UPDATE USING (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));

-- RLS Policies for batch_delivery_items
CREATE POLICY "Admins full access to batch_delivery_items" ON public.batch_delivery_items
FOR ALL USING (has_role(auth.uid(), 'admin') AND is_user_active(auth.uid()));

CREATE POLICY "Managers full access to batch_delivery_items" ON public.batch_delivery_items
FOR ALL USING (has_role(auth.uid(), 'manager') AND is_user_active(auth.uid()));

CREATE POLICY "Sellers manage own batch_delivery_items" ON public.batch_delivery_items
FOR ALL USING (
  has_role(auth.uid(), 'seller') AND is_user_active(auth.uid()) AND
  EXISTS (SELECT 1 FROM delivery_batches db JOIN orders o ON o.id = db.order_id WHERE db.id = batch_delivery_items.batch_id AND o.user_id = auth.uid())
);

CREATE POLICY "Workers view and update batch_delivery_items" ON public.batch_delivery_items
FOR SELECT USING (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));

CREATE POLICY "Workers update batch_delivery_items" ON public.batch_delivery_items
FOR UPDATE USING (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));

-- RLS Policies for batch_custom_shipping_items
CREATE POLICY "Admins full access to batch_custom_shipping_items" ON public.batch_custom_shipping_items
FOR ALL USING (has_role(auth.uid(), 'admin') AND is_user_active(auth.uid()));

CREATE POLICY "Managers full access to batch_custom_shipping_items" ON public.batch_custom_shipping_items
FOR ALL USING (has_role(auth.uid(), 'manager') AND is_user_active(auth.uid()));

CREATE POLICY "Sellers manage own batch_custom_shipping_items" ON public.batch_custom_shipping_items
FOR ALL USING (
  has_role(auth.uid(), 'seller') AND is_user_active(auth.uid()) AND
  EXISTS (SELECT 1 FROM delivery_batches db JOIN orders o ON o.id = db.order_id WHERE db.id = batch_custom_shipping_items.batch_id AND o.user_id = auth.uid())
);

CREATE POLICY "Workers view and update batch_custom_shipping_items" ON public.batch_custom_shipping_items
FOR SELECT USING (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));

CREATE POLICY "Workers update batch_custom_shipping_items" ON public.batch_custom_shipping_items
FOR UPDATE USING (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));

-- RLS Policies for batch_custom_delivery_items
CREATE POLICY "Admins full access to batch_custom_delivery_items" ON public.batch_custom_delivery_items
FOR ALL USING (has_role(auth.uid(), 'admin') AND is_user_active(auth.uid()));

CREATE POLICY "Managers full access to batch_custom_delivery_items" ON public.batch_custom_delivery_items
FOR ALL USING (has_role(auth.uid(), 'manager') AND is_user_active(auth.uid()));

CREATE POLICY "Sellers manage own batch_custom_delivery_items" ON public.batch_custom_delivery_items
FOR ALL USING (
  has_role(auth.uid(), 'seller') AND is_user_active(auth.uid()) AND
  EXISTS (SELECT 1 FROM delivery_batches db JOIN orders o ON o.id = db.order_id WHERE db.id = batch_custom_delivery_items.batch_id AND o.user_id = auth.uid())
);

CREATE POLICY "Workers view and update batch_custom_delivery_items" ON public.batch_custom_delivery_items
FOR SELECT USING (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));

CREATE POLICY "Workers update batch_custom_delivery_items" ON public.batch_custom_delivery_items
FOR UPDATE USING (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));