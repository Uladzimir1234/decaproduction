-- Add quantity column to custom_delivery_items
ALTER TABLE public.custom_delivery_items 
ADD COLUMN quantity integer NOT NULL DEFAULT 1;

-- Add quantity columns for built-in delivery tracking items in order_fulfillment
ALTER TABLE public.order_fulfillment
ADD COLUMN windows_delivered_qty integer DEFAULT 0,
ADD COLUMN doors_delivered_qty integer DEFAULT 0,
ADD COLUMN sliding_doors_delivered_qty integer DEFAULT 0,
ADD COLUMN glass_delivered_qty integer DEFAULT 0,
ADD COLUMN screens_delivered_qty integer DEFAULT 0,
ADD COLUMN handles_delivered_qty integer DEFAULT 0,
ADD COLUMN nailing_fins_delivered_qty integer DEFAULT 0,
ADD COLUMN brackets_delivered_qty integer DEFAULT 0;