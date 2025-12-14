-- Add sliding doors specific manufacturing fields to order_fulfillment
ALTER TABLE public.order_fulfillment 
ADD COLUMN IF NOT EXISTS sliding_doors_reinforcement_cutting text DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS sliding_doors_profile_cutting text DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS sliding_doors_welding_status text DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS sliding_doors_welding_notes text;