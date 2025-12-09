
-- Create order_constructions table for individual window/door units from PDF/CSV
CREATE TABLE public.order_constructions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  construction_number TEXT NOT NULL,
  construction_type TEXT NOT NULL DEFAULT 'window',
  width_inches NUMERIC,
  height_inches NUMERIC,
  width_mm INTEGER,
  height_mm INTEGER,
  rough_opening TEXT,
  location TEXT,
  model TEXT,
  opening_type TEXT,
  color_exterior TEXT,
  color_interior TEXT,
  glass_type TEXT,
  screen_type TEXT,
  handle_type TEXT,
  has_blinds BOOLEAN DEFAULT false,
  blinds_color TEXT,
  center_seal BOOLEAN DEFAULT false,
  comments TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  position_index INTEGER NOT NULL DEFAULT 0,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create construction_manufacturing table for per-construction stage tracking
CREATE TABLE public.construction_manufacturing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  construction_id UUID NOT NULL REFERENCES public.order_constructions(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID,
  updated_by_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create construction_components table for per-construction component tracking
CREATE TABLE public.construction_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  construction_id UUID NOT NULL REFERENCES public.order_constructions(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL,
  component_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'not_ordered',
  notes TEXT,
  order_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID,
  updated_by_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create construction_notes table for inter-department notes
CREATE TABLE public.construction_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  construction_id UUID NOT NULL REFERENCES public.order_constructions(id) ON DELETE CASCADE,
  note_type TEXT NOT NULL DEFAULT 'general',
  note_text TEXT NOT NULL,
  created_by UUID,
  created_by_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create construction_delivery table for delivery batch linking
CREATE TABLE public.construction_delivery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  construction_id UUID NOT NULL REFERENCES public.order_constructions(id) ON DELETE CASCADE,
  delivery_batch_id UUID REFERENCES public.delivery_batches(id) ON DELETE SET NULL,
  is_prepared BOOLEAN NOT NULL DEFAULT false,
  is_delivered BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(construction_id, delivery_batch_id)
);

-- Enable RLS on all tables
ALTER TABLE public.order_constructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_manufacturing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_delivery ENABLE ROW LEVEL SECURITY;

-- RLS Policies for order_constructions (same pattern as orders)
CREATE POLICY "Admins full access to order_constructions"
ON public.order_constructions FOR ALL
USING (has_role(auth.uid(), 'admin') AND is_user_active(auth.uid()));

CREATE POLICY "Managers full access to order_constructions"
ON public.order_constructions FOR ALL
USING (has_role(auth.uid(), 'manager') AND is_user_active(auth.uid()));

CREATE POLICY "Sellers manage own order_constructions"
ON public.order_constructions FOR ALL
USING (has_role(auth.uid(), 'seller') AND is_user_active(auth.uid()) AND EXISTS (
  SELECT 1 FROM orders WHERE orders.id = order_constructions.order_id AND orders.user_id = auth.uid()
));

CREATE POLICY "Workers view order_constructions"
ON public.order_constructions FOR SELECT
USING (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));

-- RLS Policies for construction_manufacturing
CREATE POLICY "Admins full access to construction_manufacturing"
ON public.construction_manufacturing FOR ALL
USING (has_role(auth.uid(), 'admin') AND is_user_active(auth.uid()));

CREATE POLICY "Managers full access to construction_manufacturing"
ON public.construction_manufacturing FOR ALL
USING (has_role(auth.uid(), 'manager') AND is_user_active(auth.uid()));

CREATE POLICY "Sellers view own construction_manufacturing"
ON public.construction_manufacturing FOR SELECT
USING (has_role(auth.uid(), 'seller') AND is_user_active(auth.uid()) AND EXISTS (
  SELECT 1 FROM order_constructions oc JOIN orders o ON o.id = oc.order_id 
  WHERE oc.id = construction_manufacturing.construction_id AND o.user_id = auth.uid()
));

CREATE POLICY "Workers view construction_manufacturing"
ON public.construction_manufacturing FOR SELECT
USING (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));

CREATE POLICY "Workers update construction_manufacturing"
ON public.construction_manufacturing FOR UPDATE
USING (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));

-- RLS Policies for construction_components
CREATE POLICY "Admins full access to construction_components"
ON public.construction_components FOR ALL
USING (has_role(auth.uid(), 'admin') AND is_user_active(auth.uid()));

CREATE POLICY "Managers full access to construction_components"
ON public.construction_components FOR ALL
USING (has_role(auth.uid(), 'manager') AND is_user_active(auth.uid()));

CREATE POLICY "Sellers view own construction_components"
ON public.construction_components FOR SELECT
USING (has_role(auth.uid(), 'seller') AND is_user_active(auth.uid()) AND EXISTS (
  SELECT 1 FROM order_constructions oc JOIN orders o ON o.id = oc.order_id 
  WHERE oc.id = construction_components.construction_id AND o.user_id = auth.uid()
));

CREATE POLICY "Workers view construction_components"
ON public.construction_components FOR SELECT
USING (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));

-- RLS Policies for construction_notes
CREATE POLICY "Admins full access to construction_notes"
ON public.construction_notes FOR ALL
USING (has_role(auth.uid(), 'admin') AND is_user_active(auth.uid()));

CREATE POLICY "Managers full access to construction_notes"
ON public.construction_notes FOR ALL
USING (has_role(auth.uid(), 'manager') AND is_user_active(auth.uid()));

CREATE POLICY "Sellers manage own construction_notes"
ON public.construction_notes FOR ALL
USING (has_role(auth.uid(), 'seller') AND is_user_active(auth.uid()) AND EXISTS (
  SELECT 1 FROM order_constructions oc JOIN orders o ON o.id = oc.order_id 
  WHERE oc.id = construction_notes.construction_id AND o.user_id = auth.uid()
));

CREATE POLICY "Workers view construction_notes"
ON public.construction_notes FOR SELECT
USING (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));

CREATE POLICY "Workers insert construction_notes"
ON public.construction_notes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));

-- RLS Policies for construction_delivery
CREATE POLICY "Admins full access to construction_delivery"
ON public.construction_delivery FOR ALL
USING (has_role(auth.uid(), 'admin') AND is_user_active(auth.uid()));

CREATE POLICY "Managers full access to construction_delivery"
ON public.construction_delivery FOR ALL
USING (has_role(auth.uid(), 'manager') AND is_user_active(auth.uid()));

CREATE POLICY "Sellers manage own construction_delivery"
ON public.construction_delivery FOR ALL
USING (has_role(auth.uid(), 'seller') AND is_user_active(auth.uid()) AND EXISTS (
  SELECT 1 FROM order_constructions oc JOIN orders o ON o.id = oc.order_id 
  WHERE oc.id = construction_delivery.construction_id AND o.user_id = auth.uid()
));

CREATE POLICY "Workers view construction_delivery"
ON public.construction_delivery FOR SELECT
USING (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));

CREATE POLICY "Workers update construction_delivery"
ON public.construction_delivery FOR UPDATE
USING (has_role(auth.uid(), 'worker') AND is_user_active(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_order_constructions_order_id ON public.order_constructions(order_id);
CREATE INDEX idx_construction_manufacturing_construction_id ON public.construction_manufacturing(construction_id);
CREATE INDEX idx_construction_components_construction_id ON public.construction_components(construction_id);
CREATE INDEX idx_construction_notes_construction_id ON public.construction_notes(construction_id);
CREATE INDEX idx_construction_delivery_construction_id ON public.construction_delivery(construction_id);
CREATE INDEX idx_construction_delivery_batch_id ON public.construction_delivery(delivery_batch_id);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_constructions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.construction_manufacturing;
ALTER PUBLICATION supabase_realtime ADD TABLE public.construction_components;
ALTER PUBLICATION supabase_realtime ADD TABLE public.construction_delivery;

-- Trigger for updating timestamps
CREATE TRIGGER update_order_constructions_updated_at
BEFORE UPDATE ON public.order_constructions
FOR EACH ROW
EXECUTE FUNCTION public.update_user_profiles_updated_at();

-- Trigger for tracking who updated construction_manufacturing
CREATE OR REPLACE FUNCTION public.update_construction_manufacturing_tracking()
RETURNS TRIGGER AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  NEW.updated_by_email = user_email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_construction_manufacturing_tracking
BEFORE UPDATE ON public.construction_manufacturing
FOR EACH ROW
EXECUTE FUNCTION public.update_construction_manufacturing_tracking();

CREATE TRIGGER update_construction_components_tracking
BEFORE UPDATE ON public.construction_components
FOR EACH ROW
EXECUTE FUNCTION public.update_construction_manufacturing_tracking();
