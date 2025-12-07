-- Add shipping preparation fields to order_fulfillment table
ALTER TABLE public.order_fulfillment
ADD COLUMN IF NOT EXISTS shipping_handles_boxed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS shipping_hinges_covers boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS shipping_weeping_covers boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS shipping_spec_labels boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS shipping_nailing_fins boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS shipping_brackets boolean DEFAULT false;