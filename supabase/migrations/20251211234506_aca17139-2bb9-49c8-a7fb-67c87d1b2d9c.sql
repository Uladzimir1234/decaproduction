-- Add is_priority column to orders table
ALTER TABLE public.orders ADD COLUMN is_priority boolean DEFAULT false;