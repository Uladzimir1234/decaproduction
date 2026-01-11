/*
  # Add automatic fulfillment percentage calculation trigger

  1. Function
    - Creates a function to calculate the weighted fulfillment percentage
    - Uses the same weights as the frontend: Reinforcement (10%), Profile (10%), Welding (10%), Doors (10%), Sliding Doors (10%), Assembly (15%), Glass (25%), Screens (10%)
    - Returns an integer percentage value (0-100)

  2. Trigger
    - Automatically updates the fulfillment_percentage column in the orders table
    - Fires whenever the order_fulfillment table is updated
    - Ensures database values are always in sync with the calculated completion percentage

  3. Notes
    - Uses conditional weighting based on order details (doors_count, has_sliding_doors)
    - Handles partial completion (0.5 multiplier) for manufacturing stages
    - Returns 0 if no fulfillment record exists
*/

-- Create function to calculate weighted fulfillment percentage
CREATE OR REPLACE FUNCTION public.calculate_fulfillment_percentage(order_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  v_order RECORD;
  v_fulfillment RECORD;
  v_total_steps NUMERIC := 0;
  v_completed_steps NUMERIC := 0;
BEGIN
  -- Get order details
  SELECT 
    doors_count,
    has_sliding_doors
  INTO v_order
  FROM public.orders
  WHERE id = order_id_param;

  -- Get fulfillment details
  SELECT 
    reinforcement_cutting,
    profile_cutting,
    welding_status,
    doors_status,
    sliding_doors_status,
    assembly_status,
    glass_status,
    screens_cutting
  INTO v_fulfillment
  FROM public.order_fulfillment
  WHERE order_fulfillment.order_id = order_id_param;

  -- If no fulfillment record exists, return 0
  IF v_fulfillment IS NULL THEN
    RETURN 0;
  END IF;

  -- Reinforcement cutting (weight: 10)
  v_total_steps := v_total_steps + 10;
  IF v_fulfillment.reinforcement_cutting = 'complete' THEN
    v_completed_steps := v_completed_steps + 10;
  ELSIF v_fulfillment.reinforcement_cutting = 'partial' THEN
    v_completed_steps := v_completed_steps + 5;
  END IF;

  -- Profile cutting (weight: 10)
  v_total_steps := v_total_steps + 10;
  IF v_fulfillment.profile_cutting = 'complete' THEN
    v_completed_steps := v_completed_steps + 10;
  ELSIF v_fulfillment.profile_cutting = 'partial' THEN
    v_completed_steps := v_completed_steps + 5;
  END IF;

  -- Welding (weight: 10)
  v_total_steps := v_total_steps + 10;
  IF v_fulfillment.welding_status = 'complete' THEN
    v_completed_steps := v_completed_steps + 10;
  ELSIF v_fulfillment.welding_status = 'partial' THEN
    v_completed_steps := v_completed_steps + 5;
  END IF;

  -- Doors (weight: 10, if applicable)
  IF v_order.doors_count > 0 THEN
    v_total_steps := v_total_steps + 10;
    IF v_fulfillment.doors_status = 'complete' THEN
      v_completed_steps := v_completed_steps + 10;
    ELSIF v_fulfillment.doors_status = 'partial' THEN
      v_completed_steps := v_completed_steps + 5;
    END IF;
  END IF;

  -- Sliding doors (weight: 10, if applicable)
  IF v_order.has_sliding_doors THEN
    v_total_steps := v_total_steps + 10;
    IF v_fulfillment.sliding_doors_status = 'complete' THEN
      v_completed_steps := v_completed_steps + 10;
    ELSIF v_fulfillment.sliding_doors_status = 'partial' THEN
      v_completed_steps := v_completed_steps + 5;
    END IF;
  END IF;

  -- Assembly (weight: 15)
  v_total_steps := v_total_steps + 15;
  IF v_fulfillment.assembly_status = 'complete' THEN
    v_completed_steps := v_completed_steps + 15;
  ELSIF v_fulfillment.assembly_status = 'partial' THEN
    v_completed_steps := v_completed_steps + 7.5;
  END IF;

  -- Glass (weight: 25)
  v_total_steps := v_total_steps + 25;
  IF v_fulfillment.glass_status = 'complete' THEN
    v_completed_steps := v_completed_steps + 25;
  ELSIF v_fulfillment.glass_status = 'partial' THEN
    v_completed_steps := v_completed_steps + 12.5;
  END IF;

  -- Screens (weight: 10)
  v_total_steps := v_total_steps + 10;
  IF v_fulfillment.screens_cutting = 'complete' THEN
    v_completed_steps := v_completed_steps + 10;
  ELSIF v_fulfillment.screens_cutting = 'partial' THEN
    v_completed_steps := v_completed_steps + 5;
  END IF;

  -- Calculate and return percentage
  IF v_total_steps > 0 THEN
    RETURN ROUND((v_completed_steps / v_total_steps) * 100);
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger function to update fulfillment percentage
CREATE OR REPLACE FUNCTION public.update_fulfillment_percentage()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the fulfillment_percentage in orders table
  UPDATE public.orders
  SET fulfillment_percentage = public.calculate_fulfillment_percentage(NEW.order_id)
  WHERE id = NEW.order_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on order_fulfillment table
DROP TRIGGER IF EXISTS trigger_update_fulfillment_percentage ON public.order_fulfillment;
CREATE TRIGGER trigger_update_fulfillment_percentage
  AFTER INSERT OR UPDATE ON public.order_fulfillment
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fulfillment_percentage();

-- Create trigger function to update fulfillment percentage when order details change
CREATE OR REPLACE FUNCTION public.update_fulfillment_percentage_on_order_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only recalculate if doors_count or has_sliding_doors changed
  IF OLD.doors_count IS DISTINCT FROM NEW.doors_count 
     OR OLD.has_sliding_doors IS DISTINCT FROM NEW.has_sliding_doors THEN
    NEW.fulfillment_percentage := public.calculate_fulfillment_percentage(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on orders table for when order details change
DROP TRIGGER IF EXISTS trigger_update_fulfillment_on_order_change ON public.orders;
CREATE TRIGGER trigger_update_fulfillment_on_order_change
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fulfillment_percentage_on_order_change();

-- Update existing orders to have correct fulfillment percentages
UPDATE public.orders
SET fulfillment_percentage = public.calculate_fulfillment_percentage(id)
WHERE id IN (SELECT order_id FROM public.order_fulfillment);
