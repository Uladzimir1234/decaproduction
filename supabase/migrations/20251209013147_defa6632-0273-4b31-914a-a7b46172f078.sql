-- Add hold_started_at column to track when orders entered hold status
ALTER TABLE public.orders 
ADD COLUMN hold_started_at timestamp with time zone DEFAULT now();

-- Set existing orders' hold_started_at based on their current status
-- Orders on hold use created_at, production_ready orders get null
UPDATE public.orders 
SET hold_started_at = CASE 
  WHEN production_status = 'hold' THEN created_at 
  ELSE NULL 
END;