-- Add glass delivery date column to orders table
ALTER TABLE public.orders
ADD COLUMN glass_delivery_date date;