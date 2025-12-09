-- Allow managers to view all audit logs
CREATE POLICY "Managers view all audit logs"
ON public.audit_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND is_user_active(auth.uid())
);