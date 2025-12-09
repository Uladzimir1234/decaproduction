-- Create function to prevent fulfillment updates when order is on hold
CREATE OR REPLACE FUNCTION public.prevent_fulfillment_update_when_on_hold()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the associated order is on hold
  IF EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = NEW.order_id 
    AND production_status = 'hold'
  ) THEN
    RAISE EXCEPTION 'Cannot update fulfillment: order is on hold';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for order_fulfillment updates
DROP TRIGGER IF EXISTS check_order_hold_before_fulfillment_update ON public.order_fulfillment;
CREATE TRIGGER check_order_hold_before_fulfillment_update
  BEFORE UPDATE ON public.order_fulfillment
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_fulfillment_update_when_on_hold();

-- Create function to prevent custom_steps updates when order is on hold
CREATE OR REPLACE FUNCTION public.prevent_custom_steps_update_when_on_hold()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the associated order is on hold
  IF EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = NEW.order_id 
    AND production_status = 'hold'
  ) THEN
    RAISE EXCEPTION 'Cannot update custom step: order is on hold';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for custom_steps updates
DROP TRIGGER IF EXISTS check_order_hold_before_custom_steps_update ON public.custom_steps;
CREATE TRIGGER check_order_hold_before_custom_steps_update
  BEFORE UPDATE ON public.custom_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_custom_steps_update_when_on_hold();

-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;