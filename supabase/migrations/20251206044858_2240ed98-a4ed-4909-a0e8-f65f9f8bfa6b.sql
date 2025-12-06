-- Add component availability status and order date columns
ALTER TABLE public.orders 
ADD COLUMN reinforcement_status text DEFAULT 'not_ordered',
ADD COLUMN reinforcement_order_date date,
ADD COLUMN windows_profile_status text DEFAULT 'not_ordered',
ADD COLUMN windows_profile_order_date date,
ADD COLUMN glass_status text DEFAULT 'not_ordered',
ADD COLUMN glass_order_date date,
ADD COLUMN screens_status text DEFAULT 'not_ordered',
ADD COLUMN screens_order_date date,
ADD COLUMN plisse_screens_status text DEFAULT 'not_ordered',
ADD COLUMN plisse_screens_order_date date,
ADD COLUMN nail_fins_status text DEFAULT 'not_ordered',
ADD COLUMN nail_fins_order_date date,
ADD COLUMN hardware_status text DEFAULT 'not_ordered',
ADD COLUMN hardware_order_date date;