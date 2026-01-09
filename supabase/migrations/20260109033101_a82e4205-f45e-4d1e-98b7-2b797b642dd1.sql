-- Add ready_to_deliver column to orders table
ALTER TABLE public.orders 
ADD COLUMN ready_to_deliver boolean DEFAULT false;