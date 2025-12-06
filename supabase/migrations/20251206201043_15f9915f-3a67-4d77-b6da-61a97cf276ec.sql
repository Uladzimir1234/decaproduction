-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'seller', 'worker');

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- User profiles table with status
CREATE TABLE public.user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    full_name text,
    status text DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'pending')),
    invited_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Pending invitations table
CREATE TABLE public.user_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    role app_role NOT NULL,
    invited_by uuid REFERENCES auth.users(id) NOT NULL,
    temporary_password text NOT NULL,
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
    accepted_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on user_invitations
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Function to check user role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to check if user is active
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = _user_id AND status = 'active'
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS policies for user_roles table
CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- RLS policies for user_profiles table
CREATE POLICY "Admins can manage all profiles"
ON public.user_profiles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own profile"
ON public.user_profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update own profile name"
ON public.user_profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- RLS policies for user_invitations table
CREATE POLICY "Admins can manage invitations"
ON public.user_invitations FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Drop existing policies on orders table
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can delete their own orders" ON public.orders;

-- New role-based policies for orders
CREATE POLICY "Admins full access to orders"
ON public.orders FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND public.is_user_active(auth.uid()));

CREATE POLICY "Managers full access to orders"
ON public.orders FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'manager') AND public.is_user_active(auth.uid()));

CREATE POLICY "Sellers manage own orders"
ON public.orders FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'seller') 
  AND public.is_user_active(auth.uid())
  AND user_id = auth.uid()
);

CREATE POLICY "Workers view all orders"
ON public.orders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'worker') AND public.is_user_active(auth.uid()));

-- Drop existing policies on customers table
DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can create their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete their own customers" ON public.customers;

-- New role-based policies for customers
CREATE POLICY "Admins full access to customers"
ON public.customers FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND public.is_user_active(auth.uid()));

CREATE POLICY "Managers full access to customers"
ON public.customers FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'manager') AND public.is_user_active(auth.uid()));

CREATE POLICY "Sellers manage own customers"
ON public.customers FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'seller') 
  AND public.is_user_active(auth.uid())
  AND user_id = auth.uid()
);

-- Drop existing policies on order_fulfillment table
DROP POLICY IF EXISTS "Users can view their order fulfillment" ON public.order_fulfillment;
DROP POLICY IF EXISTS "Users can create their order fulfillment" ON public.order_fulfillment;
DROP POLICY IF EXISTS "Users can update their order fulfillment" ON public.order_fulfillment;
DROP POLICY IF EXISTS "Users can delete their order fulfillment" ON public.order_fulfillment;

-- New role-based policies for order_fulfillment
CREATE POLICY "Admins full access to fulfillment"
ON public.order_fulfillment FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND public.is_user_active(auth.uid()));

CREATE POLICY "Managers full access to fulfillment"
ON public.order_fulfillment FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'manager') AND public.is_user_active(auth.uid()));

CREATE POLICY "Workers view fulfillment"
ON public.order_fulfillment FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'worker') AND public.is_user_active(auth.uid()));

CREATE POLICY "Workers update fulfillment"
ON public.order_fulfillment FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'worker') AND public.is_user_active(auth.uid()));

CREATE POLICY "Sellers view own fulfillment"
ON public.order_fulfillment FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'seller') 
  AND public.is_user_active(auth.uid())
  AND EXISTS (SELECT 1 FROM orders WHERE orders.id = order_fulfillment.order_id AND orders.user_id = auth.uid())
);

-- Drop existing policies on custom_steps table
DROP POLICY IF EXISTS "Users can view their custom steps" ON public.custom_steps;
DROP POLICY IF EXISTS "Users can create their custom steps" ON public.custom_steps;
DROP POLICY IF EXISTS "Users can update their custom steps" ON public.custom_steps;
DROP POLICY IF EXISTS "Users can delete their custom steps" ON public.custom_steps;

-- New role-based policies for custom_steps
CREATE POLICY "Admins full access to custom_steps"
ON public.custom_steps FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND public.is_user_active(auth.uid()));

CREATE POLICY "Managers full access to custom_steps"
ON public.custom_steps FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'manager') AND public.is_user_active(auth.uid()));

CREATE POLICY "Workers view custom_steps"
ON public.custom_steps FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'worker') AND public.is_user_active(auth.uid()));

CREATE POLICY "Workers update custom_steps"
ON public.custom_steps FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'worker') AND public.is_user_active(auth.uid()));

CREATE POLICY "Sellers manage own custom_steps"
ON public.custom_steps FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'seller') 
  AND public.is_user_active(auth.uid())
  AND EXISTS (SELECT 1 FROM orders WHERE orders.id = custom_steps.order_id AND orders.user_id = auth.uid())
);

-- Update audit_logs policies for role-based access
DROP POLICY IF EXISTS "Users can view their own logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can create their own logs" ON public.audit_logs;

CREATE POLICY "Admins view all audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND public.is_user_active(auth.uid()));

CREATE POLICY "Users can create audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_user_active(auth.uid()));

-- Trigger to update updated_at on user_profiles
CREATE OR REPLACE FUNCTION public.update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_user_profiles_updated_at();