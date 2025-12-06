import { supabase } from "@/integrations/supabase/client";

export type AuditAction = 
  | 'order_created'
  | 'order_updated'
  | 'order_deleted'
  | 'fulfillment_updated'
  | 'custom_step_created'
  | 'custom_step_updated'
  | 'custom_step_deleted'
  | 'customer_created'
  | 'customer_updated';

export interface CreateAuditLogParams {
  action: AuditAction;
  description: string;
  entityType?: string;
  entityId?: string;
}

export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('No authenticated user found for audit log');
      return;
    }

    const { error } = await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: user.email || 'Unknown',
      action: params.action,
      description: params.description,
      entity_type: params.entityType,
      entity_id: params.entityId,
    });

    if (error) {
      console.error('Failed to create audit log:', error);
    }
  } catch (err) {
    console.error('Error creating audit log:', err);
  }
}
