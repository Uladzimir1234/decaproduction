-- Add sliding door specific component tracking columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS sliding_doors_profile_status text DEFAULT 'not_ordered',
ADD COLUMN IF NOT EXISTS sliding_doors_profile_order_date date,
ADD COLUMN IF NOT EXISTS sliding_doors_hardware_status text DEFAULT 'not_ordered',
ADD COLUMN IF NOT EXISTS sliding_doors_hardware_order_date date;