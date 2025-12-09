-- Enable real-time for order_fulfillment table (manufacturing stages)
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_fulfillment;

-- Enable real-time for custom_steps table
ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_steps;