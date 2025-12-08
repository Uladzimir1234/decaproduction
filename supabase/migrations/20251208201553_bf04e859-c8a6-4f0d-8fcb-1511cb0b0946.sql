-- Add CHECK constraints for server-side input validation on orders table

-- Add constraint for delivery_date >= order_date
ALTER TABLE public.orders
ADD CONSTRAINT orders_delivery_date_check CHECK (delivery_date >= order_date);

-- Add constraints for reasonable bounds on count fields (non-negative, max 10000)
ALTER TABLE public.orders
ADD CONSTRAINT orders_windows_count_check CHECK (windows_count IS NULL OR (windows_count >= 0 AND windows_count <= 10000));

ALTER TABLE public.orders
ADD CONSTRAINT orders_doors_count_check CHECK (doors_count IS NULL OR (doors_count >= 0 AND doors_count <= 10000));

ALTER TABLE public.orders
ADD CONSTRAINT orders_sliding_doors_count_check CHECK (sliding_doors_count IS NULL OR (sliding_doors_count >= 0 AND sliding_doors_count <= 10000));

ALTER TABLE public.orders
ADD CONSTRAINT orders_plisse_screens_count_check CHECK (plisse_screens_count IS NULL OR (plisse_screens_count >= 0 AND plisse_screens_count <= 10000));

ALTER TABLE public.orders
ADD CONSTRAINT orders_plisse_door_count_check CHECK (plisse_door_count IS NULL OR (plisse_door_count >= 0 AND plisse_door_count <= 10000));

ALTER TABLE public.orders
ADD CONSTRAINT orders_plisse_window_count_check CHECK (plisse_window_count IS NULL OR (plisse_window_count >= 0 AND plisse_window_count <= 10000));

ALTER TABLE public.orders
ADD CONSTRAINT orders_hidden_hinges_count_check CHECK (hidden_hinges_count IS NULL OR (hidden_hinges_count >= 0 AND hidden_hinges_count <= 10000));

ALTER TABLE public.orders
ADD CONSTRAINT orders_visible_hinges_count_check CHECK (visible_hinges_count IS NULL OR (visible_hinges_count >= 0 AND visible_hinges_count <= 10000));

-- Add string length constraints
ALTER TABLE public.orders
ADD CONSTRAINT orders_order_number_length CHECK (char_length(order_number) <= 100);

ALTER TABLE public.orders
ADD CONSTRAINT orders_customer_name_length CHECK (char_length(customer_name) <= 200);

-- Add similar constraints for customers table
ALTER TABLE public.customers
ADD CONSTRAINT customers_name_length CHECK (char_length(name) <= 200);

ALTER TABLE public.customers
ADD CONSTRAINT customers_email_length CHECK (email IS NULL OR char_length(email) <= 255);

ALTER TABLE public.customers
ADD CONSTRAINT customers_phone_length CHECK (phone IS NULL OR char_length(phone) <= 50);

ALTER TABLE public.customers
ADD CONSTRAINT customers_address_length CHECK (address IS NULL OR char_length(address) <= 500);