-- Add production_status column to orders table
ALTER TABLE public.orders 
ADD COLUMN production_status text NOT NULL DEFAULT 'hold';

-- Add check constraint for valid values
ALTER TABLE public.orders 
ADD CONSTRAINT orders_production_status_check 
CHECK (production_status IN ('hold', 'production_ready'));