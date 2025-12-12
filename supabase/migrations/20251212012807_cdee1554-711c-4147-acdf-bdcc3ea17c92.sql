-- Ensure full row data is sent for real-time DELETE events
ALTER TABLE public.procurement_cart REPLICA IDENTITY FULL;