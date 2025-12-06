-- Create table for custom steps (both ordering and manufacturing)
CREATE TABLE public.custom_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  step_type TEXT NOT NULL CHECK (step_type IN ('ordering', 'manufacturing')),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_ordered', 'ordered', 'available', 'not_started', 'partial', 'complete')),
  order_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_steps ENABLE ROW LEVEL SECURITY;

-- Create policies that check ownership through the orders table
CREATE POLICY "Users can view their custom steps"
ON public.custom_steps
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM orders WHERE orders.id = custom_steps.order_id AND orders.user_id = auth.uid()
));

CREATE POLICY "Users can create their custom steps"
ON public.custom_steps
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM orders WHERE orders.id = custom_steps.order_id AND orders.user_id = auth.uid()
));

CREATE POLICY "Users can update their custom steps"
ON public.custom_steps
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM orders WHERE orders.id = custom_steps.order_id AND orders.user_id = auth.uid()
));

CREATE POLICY "Users can delete their custom steps"
ON public.custom_steps
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM orders WHERE orders.id = custom_steps.order_id AND orders.user_id = auth.uid()
));