-- Add created_by column to orders table to track who created the order
-- The user_id column will now represent the "assigned seller" for visibility
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_by uuid;

-- Add foreign key comment (not constraint to avoid issues with auth.users)
COMMENT ON COLUMN public.orders.created_by IS 'The user who created this order';
COMMENT ON COLUMN public.orders.user_id IS 'The seller this order is assigned to (determines visibility)';