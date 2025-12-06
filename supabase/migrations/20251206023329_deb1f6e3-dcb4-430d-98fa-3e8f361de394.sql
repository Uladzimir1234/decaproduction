-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own customers" ON public.customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own customers" ON public.customers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own customers" ON public.customers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own customers" ON public.customers FOR DELETE USING (auth.uid() = user_id);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  order_number TEXT NOT NULL,
  order_date DATE NOT NULL,
  delivery_date DATE NOT NULL,
  windows_count INTEGER DEFAULT 0,
  doors_count INTEGER DEFAULT 0,
  has_sliding_doors BOOLEAN DEFAULT false,
  sliding_doors_count INTEGER DEFAULT 0,
  sliding_door_type TEXT,
  has_plisse_screens BOOLEAN DEFAULT false,
  plisse_screens_count INTEGER DEFAULT 0,
  plisse_door_count INTEGER DEFAULT 0,
  plisse_window_count INTEGER DEFAULT 0,
  screen_type TEXT,
  has_nailing_flanges BOOLEAN DEFAULT false,
  glass_ordered BOOLEAN DEFAULT false,
  screen_profile_available BOOLEAN,
  screen_profile_ordered BOOLEAN,
  windows_profile_type TEXT,
  windows_profile_available BOOLEAN DEFAULT false,
  hidden_hinges_count INTEGER DEFAULT 0,
  visible_hinges_count INTEGER DEFAULT 0,
  hardware_available BOOLEAN DEFAULT false,
  fulfillment_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own orders" ON public.orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own orders" ON public.orders FOR DELETE USING (auth.uid() = user_id);

-- Create order_fulfillment table
CREATE TABLE public.order_fulfillment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL UNIQUE,
  reinforcement_cutting TEXT DEFAULT 'not_started',
  profile_cutting TEXT DEFAULT 'not_started',
  frames_welded BOOLEAN DEFAULT false,
  doors_assembled BOOLEAN DEFAULT false,
  doors_glass_available BOOLEAN DEFAULT false,
  doors_glass_installed BOOLEAN DEFAULT false,
  doors_notes TEXT,
  sliding_doors_assembled BOOLEAN DEFAULT false,
  sliding_doors_glass_available BOOLEAN DEFAULT false,
  sliding_doors_glass_installed BOOLEAN DEFAULT false,
  sliding_doors_notes TEXT,
  frame_sash_assembled BOOLEAN DEFAULT false,
  glass_delivered BOOLEAN DEFAULT false,
  glass_not_delivered_notes TEXT,
  glass_installed BOOLEAN DEFAULT false,
  glass_not_installed_notes TEXT,
  screens_made BOOLEAN DEFAULT false,
  screens_delivered BOOLEAN DEFAULT false,
  screens_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.order_fulfillment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their order fulfillment" ON public.order_fulfillment FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_fulfillment.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Users can create their order fulfillment" ON public.order_fulfillment FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_fulfillment.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Users can update their order fulfillment" ON public.order_fulfillment FOR UPDATE USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_fulfillment.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Users can delete their order fulfillment" ON public.order_fulfillment FOR DELETE USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_fulfillment.order_id AND orders.user_id = auth.uid()));