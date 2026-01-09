-- Add delivered column to orders table
ALTER TABLE public.orders 
ADD COLUMN delivered boolean DEFAULT false;