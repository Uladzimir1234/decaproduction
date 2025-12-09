-- Create construction_issues table for tracking component/manufacturing issues per construction
CREATE TABLE public.construction_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  construction_id UUID NOT NULL REFERENCES public.order_constructions(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL, -- 'hardware', 'glass', 'screen', 'profile', 'other'
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'resolved'
  created_by UUID REFERENCES auth.users(id),
  created_by_email TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_by_email TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.construction_issues ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins full access to construction_issues"
ON public.construction_issues FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND is_user_active(auth.uid()));

CREATE POLICY "Managers full access to construction_issues"
ON public.construction_issues FOR ALL
USING (has_role(auth.uid(), 'manager'::app_role) AND is_user_active(auth.uid()));

CREATE POLICY "Sellers manage own construction_issues"
ON public.construction_issues FOR ALL
USING (
  has_role(auth.uid(), 'seller'::app_role) AND is_user_active(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM order_constructions oc
    JOIN orders o ON o.id = oc.order_id
    WHERE oc.id = construction_issues.construction_id AND o.user_id = auth.uid()
  )
);

CREATE POLICY "Workers view and insert construction_issues"
ON public.construction_issues FOR SELECT
USING (has_role(auth.uid(), 'worker'::app_role) AND is_user_active(auth.uid()));

CREATE POLICY "Workers insert construction_issues"
ON public.construction_issues FOR INSERT
WITH CHECK (has_role(auth.uid(), 'worker'::app_role) AND is_user_active(auth.uid()));

CREATE POLICY "Workers update construction_issues"
ON public.construction_issues FOR UPDATE
USING (has_role(auth.uid(), 'worker'::app_role) AND is_user_active(auth.uid()));

-- Enable realtime for construction_issues
ALTER PUBLICATION supabase_realtime ADD TABLE public.construction_issues;