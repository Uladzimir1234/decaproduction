-- Add screens_status field for manufacturing stage (not_started, partial, complete)
ALTER TABLE public.order_fulfillment 
ADD COLUMN screens_cutting TEXT DEFAULT 'not_started';