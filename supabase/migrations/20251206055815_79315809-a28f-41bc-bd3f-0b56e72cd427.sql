-- Add status and notes fields for all manufacturing stages
ALTER TABLE public.order_fulfillment 
ADD COLUMN welding_status TEXT DEFAULT 'not_started',
ADD COLUMN welding_notes TEXT,
ADD COLUMN doors_status TEXT DEFAULT 'not_started',
ADD COLUMN sliding_doors_status TEXT DEFAULT 'not_started',
ADD COLUMN assembly_status TEXT DEFAULT 'not_started',
ADD COLUMN assembly_notes TEXT,
ADD COLUMN glass_status TEXT DEFAULT 'not_started',
ADD COLUMN glass_notes TEXT;