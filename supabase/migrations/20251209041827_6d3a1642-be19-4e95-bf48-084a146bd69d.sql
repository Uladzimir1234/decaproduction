-- Add tracking columns to order_fulfillment
ALTER TABLE public.order_fulfillment 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_by uuid,
ADD COLUMN IF NOT EXISTS updated_by_email text;

-- Add tracking columns to orders (for ordering stages)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS ordering_updated_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS ordering_updated_by uuid,
ADD COLUMN IF NOT EXISTS ordering_updated_by_email text;

-- Add tracking columns to custom_steps
ALTER TABLE public.custom_steps 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_by uuid,
ADD COLUMN IF NOT EXISTS updated_by_email text;

-- Create function to auto-update fulfillment tracking fields
CREATE OR REPLACE FUNCTION public.update_fulfillment_tracking()
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

-- Create function to auto-update orders tracking fields
CREATE OR REPLACE FUNCTION public.update_orders_ordering_tracking()
RETURNS TRIGGER AS $$
DECLARE
  user_email text;
BEGIN
  -- Only update ordering tracking if ordering-related fields changed
  IF (OLD.reinforcement_status IS DISTINCT FROM NEW.reinforcement_status) OR
     (OLD.windows_profile_status IS DISTINCT FROM NEW.windows_profile_status) OR
     (OLD.glass_status IS DISTINCT FROM NEW.glass_status) OR
     (OLD.screens_status IS DISTINCT FROM NEW.screens_status) OR
     (OLD.plisse_screens_status IS DISTINCT FROM NEW.plisse_screens_status) OR
     (OLD.nail_fins_status IS DISTINCT FROM NEW.nail_fins_status) OR
     (OLD.hardware_status IS DISTINCT FROM NEW.hardware_status) OR
     (OLD.reinforcement_order_date IS DISTINCT FROM NEW.reinforcement_order_date) OR
     (OLD.windows_profile_order_date IS DISTINCT FROM NEW.windows_profile_order_date) OR
     (OLD.glass_order_date IS DISTINCT FROM NEW.glass_order_date) OR
     (OLD.screens_order_date IS DISTINCT FROM NEW.screens_order_date) OR
     (OLD.plisse_screens_order_date IS DISTINCT FROM NEW.plisse_screens_order_date) OR
     (OLD.nail_fins_order_date IS DISTINCT FROM NEW.nail_fins_order_date) OR
     (OLD.hardware_order_date IS DISTINCT FROM NEW.hardware_order_date) THEN
    SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
    NEW.ordering_updated_at = now();
    NEW.ordering_updated_by = auth.uid();
    NEW.ordering_updated_by_email = user_email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to auto-update custom_steps tracking fields
CREATE OR REPLACE FUNCTION public.update_custom_steps_tracking()
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

-- Create triggers
DROP TRIGGER IF EXISTS on_fulfillment_update ON public.order_fulfillment;
CREATE TRIGGER on_fulfillment_update
BEFORE UPDATE ON public.order_fulfillment
FOR EACH ROW EXECUTE FUNCTION public.update_fulfillment_tracking();

DROP TRIGGER IF EXISTS on_orders_ordering_update ON public.orders;
CREATE TRIGGER on_orders_ordering_update
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_orders_ordering_tracking();

DROP TRIGGER IF EXISTS on_custom_steps_update ON public.custom_steps;
CREATE TRIGGER on_custom_steps_update
BEFORE UPDATE ON public.custom_steps
FOR EACH ROW EXECUTE FUNCTION public.update_custom_steps_tracking();