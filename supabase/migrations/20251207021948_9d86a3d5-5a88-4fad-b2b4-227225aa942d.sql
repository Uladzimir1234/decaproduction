-- Add policy for sellers to view audit logs for their own orders
CREATE POLICY "Sellers view audit logs for own orders"
ON public.audit_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'seller'::app_role) 
  AND is_user_active(auth.uid())
  AND entity_type = 'order'
  AND entity_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id::text = audit_logs.entity_id::text 
    AND orders.user_id = auth.uid()
  )
);

-- Add policy for sellers to view audit logs for order_fulfillment related to their orders
CREATE POLICY "Sellers view audit logs for own order fulfillment"
ON public.audit_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'seller'::app_role) 
  AND is_user_active(auth.uid())
  AND entity_type = 'order_fulfillment'
  AND entity_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id::text = audit_logs.entity_id::text 
    AND orders.user_id = auth.uid()
  )
);

-- Add policy for sellers to view audit logs for custom_steps related to their orders
CREATE POLICY "Sellers view audit logs for own custom steps"
ON public.audit_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'seller'::app_role) 
  AND is_user_active(auth.uid())
  AND entity_type = 'custom_step'
  AND entity_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.custom_steps cs
    JOIN public.orders o ON o.id = cs.order_id
    WHERE cs.id::text = audit_logs.entity_id::text 
    AND o.user_id = auth.uid()
  )
);

-- Add policy for sellers to view customer-related audit logs they created
CREATE POLICY "Sellers view own customer audit logs"
ON public.audit_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'seller'::app_role) 
  AND is_user_active(auth.uid())
  AND entity_type = 'customer'
  AND user_id = auth.uid()
);