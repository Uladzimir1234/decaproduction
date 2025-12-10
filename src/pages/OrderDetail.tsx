import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusButtonGroup, orderingStatusOptions, manufacturingStatusOptions } from "@/components/ui/status-button-group";
import { Switch } from "@/components/ui/switch";
import { ProgressCircle } from "@/components/ui/progress-circle";
import { StatusBadge } from "@/components/ui/status-badge";
import { ImageUpload } from "@/components/ui/image-upload";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import { ArrowLeft, Calendar, Package, Wrench, Lock, CheckCircle2, Clock, AlertCircle, ShoppingCart, Plus, Trash2, Pause, PlayCircle, Grid3X3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createAuditLog } from "@/lib/auditLog";
import { DeliveryBatchSection } from "@/components/delivery/DeliveryBatchSection";
import { OrderMap } from "@/components/order/OrderMap";

type StageStatus = "not_started" | "partial" | "complete";

interface CustomStep {
  id: string;
  order_id: string;
  step_type: 'ordering' | 'manufacturing';
  name: string;
  status: string;
  order_date: string | null;
  notes: string | null;
}

interface OrderFulfillment {
  id: string;
  order_id: string;
  reinforcement_cutting: string | null;
  profile_cutting: string | null;
  frames_welded: boolean | null;
  welding_status: string | null;
  welding_notes: string | null;
  doors_assembled: boolean | null;
  doors_glass_available: boolean | null;
  doors_glass_installed: boolean | null;
  doors_status: string | null;
  doors_notes: string | null;
  doors_image_url: string | null;
  sliding_doors_assembled: boolean | null;
  sliding_doors_glass_available: boolean | null;
  sliding_doors_glass_installed: boolean | null;
  sliding_doors_status: string | null;
  sliding_doors_notes: string | null;
  sliding_doors_image_url: string | null;
  frame_sash_assembled: boolean | null;
  assembly_status: string | null;
  assembly_notes: string | null;
  glass_delivered: boolean | null;
  glass_not_delivered_notes: string | null;
  glass_installed: boolean | null;
  glass_not_installed_notes: string | null;
  glass_status: string | null;
  glass_notes: string | null;
  screens_made: boolean | null;
  screens_delivered: boolean | null;
  screens_cutting: string | null;
  screens_notes: string | null;
  // Delivery tracking fields
  windows_delivered: boolean | null;
  doors_delivered: boolean | null;
  sliding_doors_delivered: boolean | null;
  screens_delivered_final: boolean | null;
  handles_delivered: boolean | null;
  glass_delivered_final: boolean | null;
  nailing_fins_delivered: boolean | null;
  brackets_delivered: boolean | null;
  delivery_notes: string | null;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  order_date: string;
  delivery_date: string;
  fulfillment_percentage: number;
  windows_count: number;
  doors_count: number;
  has_sliding_doors: boolean;
  sliding_doors_count: number;
  sliding_door_type: string | null;
  screen_type: string | null;
  has_plisse_screens: boolean;
  has_nailing_flanges: boolean | null;
  glass_ordered: boolean;
  delivery_complete: boolean;
  // Component availability status
  reinforcement_status: string | null;
  reinforcement_order_date: string | null;
  windows_profile_status: string | null;
  windows_profile_order_date: string | null;
  glass_status: string | null;
  glass_order_date: string | null;
  glass_delivery_date: string | null;
  screens_status: string | null;
  screens_order_date: string | null;
  plisse_screens_status: string | null;
  plisse_screens_order_date: string | null;
  nail_fins_status: string | null;
  nail_fins_order_date: string | null;
  hardware_status: string | null;
  hardware_order_date: string | null;
  production_status: string;
}

// Static helper for calculating fulfillment percentage
const calculateFulfillmentPercentageStatic = (data: Partial<OrderFulfillment>, orderData: Order | null) => {
  let totalSteps = 0;
  let completedSteps = 0;

  const getStatusPoints = (status: string | null | undefined, weight: number) => {
    if (status === 'complete') return weight;
    if (status === 'partial') return weight * 0.5;
    return 0;
  };

  // Reinforcement cutting (weight: 10%)
  totalSteps += 10;
  completedSteps += getStatusPoints(data.reinforcement_cutting, 10);

  // Profile cutting (weight: 10%)
  totalSteps += 10;
  completedSteps += getStatusPoints(data.profile_cutting, 10);

  // Welding (weight: 10%)
  totalSteps += 10;
  completedSteps += getStatusPoints(data.welding_status, 10);

  // Doors assembled (if applicable) (weight: 10%)
  if (orderData?.doors_count && orderData.doors_count > 0) {
    totalSteps += 10;
    completedSteps += getStatusPoints(data.doors_status, 10);
  }

  // Sliding doors assembled (if applicable) (weight: 10%)
  if (orderData?.has_sliding_doors) {
    totalSteps += 10;
    completedSteps += getStatusPoints(data.sliding_doors_status, 10);
  }

  // Frame/sash assembled (weight: 15%)
  totalSteps += 15;
  completedSteps += getStatusPoints(data.assembly_status, 15);

  // Glass installed (weight: 25%)
  totalSteps += 25;
  completedSteps += getStatusPoints(data.glass_status, 25);

  // Screens (weight: 10%)
  totalSteps += 10;
  completedSteps += getStatusPoints(data.screens_cutting, 10);

  return Math.round(completedSteps / totalSteps * 100);
};

// Aggregated component from constructions
interface AggregatedComponent {
  component_type: string;
  component_name: string | null;
  total_quantity: number;
  status: string;
  order_date: string | null;
  component_ids: string[];
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canUpdateOrdering, canUpdateManufacturing, isWorker, isSeller, isAdmin, loading: roleLoading } = useRole();
  const [order, setOrder] = useState<Order | null>(null);
  const [fulfillment, setFulfillment] = useState<OrderFulfillment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customSteps, setCustomSteps] = useState<CustomStep[]>([]);
  const [newOrderingStepName, setNewOrderingStepName] = useState("");
  const [newManufacturingStepName, setNewManufacturingStepName] = useState("");
  const [orderingDialogOpen, setOrderingDialogOpen] = useState(false);
  const [manufacturingDialogOpen, setManufacturingDialogOpen] = useState(false);
  const [orderMapOpen, setOrderMapOpen] = useState(false);
  const [hasConstructions, setHasConstructions] = useState(false);
  const [aggregatedComponents, setAggregatedComponents] = useState<AggregatedComponent[]>([]);

  useEffect(() => {
    // Wait for role to be loaded before fetching order
    if (id && !roleLoading) {
      fetchOrder();
      fetchCustomSteps();
      checkConstructions();
      fetchAggregatedComponents();
    }
  }, [id, roleLoading, isWorker]);

  const checkConstructions = async () => {
    if (!id) return;
    const { count } = await supabase
      .from('order_constructions')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', id);
    setHasConstructions((count || 0) > 0);
  };

  // Real-time subscription for order changes
  useEffect(() => {
    if (!id) return;

    const orderChannel = supabase
      .channel(`order-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${id}`
        },
        (payload) => {
          setOrder(prev => prev ? { ...prev, ...payload.new } : prev);
          // If order was put on hold, notify the user
          if (payload.new.production_status === 'hold' && payload.old?.production_status !== 'hold') {
            toast({
              title: "Order put on hold",
              description: "This order has been put on hold. Manufacturing stages are now locked.",
            });
          }
        }
      )
      .subscribe();

    // Real-time subscription for fulfillment changes (manufacturing stages)
    const fulfillmentChannel = supabase
      .channel(`fulfillment-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_fulfillment',
          filter: `order_id=eq.${id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setFulfillment(prev => prev ? { ...prev, ...payload.new } : payload.new as OrderFulfillment);
          }
        }
      )
      .subscribe();

    // Real-time subscription for custom steps changes
    const customStepsChannel = supabase
      .channel(`customsteps-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'custom_steps',
          filter: `order_id=eq.${id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCustomSteps(prev => [...prev, payload.new as CustomStep]);
          } else if (payload.eventType === 'UPDATE') {
            setCustomSteps(prev => prev.map(step => 
              step.id === payload.new.id ? { ...step, ...payload.new } : step
            ));
          } else if (payload.eventType === 'DELETE') {
            setCustomSteps(prev => prev.filter(step => step.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(fulfillmentChannel);
      supabase.removeChannel(customStepsChannel);
    };
  }, [id, toast]);

  const fetchCustomSteps = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("custom_steps")
      .select("*")
      .eq("order_id", id)
      .order("created_at");
    if (!error && data) {
      setCustomSteps(data as CustomStep[]);
    }
  };

  const fetchAggregatedComponents = async () => {
    if (!id) return;
    
    // Fetch all construction components for this order through constructions
    const { data, error } = await supabase
      .from("construction_components")
      .select(`
        id,
        component_type,
        component_name,
        quantity,
        status,
        order_date,
        construction:order_constructions!inner(order_id)
      `)
      .eq("construction.order_id", id);
    
    if (error) {
      console.error("Error fetching components:", error);
      return;
    }
    
    if (!data || data.length === 0) {
      setAggregatedComponents([]);
      return;
    }
    
    // Aggregate by component_type + component_name
    const aggregated: Record<string, AggregatedComponent> = {};
    
    for (const comp of data) {
      const key = `${comp.component_type}::${comp.component_name || 'default'}`;
      
      if (!aggregated[key]) {
        aggregated[key] = {
          component_type: comp.component_type,
          component_name: comp.component_name,
          total_quantity: 0,
          status: comp.status || 'not_ordered',
          order_date: comp.order_date,
          component_ids: [],
        };
      }
      
      aggregated[key].total_quantity += comp.quantity;
      aggregated[key].component_ids.push(comp.id);
      
      // Use worst-case status (not_ordered > ordered > available)
      const statusPriority: Record<string, number> = { 'not_ordered': 0, 'ordered': 1, 'available': 2 };
      if (statusPriority[comp.status || 'not_ordered'] < statusPriority[aggregated[key].status]) {
        aggregated[key].status = comp.status || 'not_ordered';
      }
    }
    
    setAggregatedComponents(Object.values(aggregated));
  };

  const updateAggregatedComponent = async (component: AggregatedComponent, updates: { status: string; order_date?: string | null }) => {
    const { error } = await supabase
      .from("construction_components")
      .update({
        status: updates.status,
        order_date: updates.order_date || null,
      })
      .in("id", component.component_ids);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update component",
        variant: "destructive"
      });
      return;
    }
    
    // Update local state
    setAggregatedComponents(prev => prev.map(c => 
      c.component_type === component.component_type && c.component_name === component.component_name
        ? { ...c, status: updates.status, order_date: updates.order_date || null }
        : c
    ));
    
    toast({
      title: "Saved",
      description: `${formatComponentName(component.component_type)} status updated`
    });
  };

  const formatComponentName = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Helper functions to check component availability - considers both legacy order fields AND file-extracted components
  const isProfileAvailable = () => {
    // Check if ANY file-extracted profile component is available (not all)
    const profileComponents = aggregatedComponents.filter(c => c.component_type === 'profile');
    if (profileComponents.length > 0) {
      return profileComponents.some(c => c.status === 'available');
    }
    // Fall back to legacy order field
    return order?.windows_profile_status === 'available';
  };

  const isGlassAvailable = () => {
    // Check if ANY file-extracted glass component is available (not all)
    const glassComponents = aggregatedComponents.filter(c => c.component_type === 'glass');
    if (glassComponents.length > 0) {
      return glassComponents.some(c => c.status === 'available');
    }
    // Fall back to legacy order field
    return order?.glass_status === 'available';
  };

  const isHardwareAvailable = () => {
    // Check if ANY file-extracted hardware component is available (not all)
    const hardwareComponents = aggregatedComponents.filter(c => c.component_type === 'hardware');
    if (hardwareComponents.length > 0) {
      return hardwareComponents.some(c => c.status === 'available');
    }
    // Fall back to legacy order field
    return order?.hardware_status === 'available';
  };

  const isScreensAvailable = () => {
    // Check if ANY file-extracted screens component is available (not all)
    const screensComponents = aggregatedComponents.filter(c => c.component_type === 'screens');
    if (screensComponents.length > 0) {
      return screensComponents.some(c => c.status === 'available');
    }
    // Fall back to legacy order field
    return order?.screens_status === 'available';
  };

  const getProfileLockText = () => {
    const profileComponent = aggregatedComponents.find(c => c.component_type === 'profile');
    if (profileComponent) {
      return profileComponent.status === 'ordered' ? 'Ordered' : 'Not Ordered';
    }
    return order?.windows_profile_status === 'ordered' ? 'Ordered' : 'Not Ordered';
  };

  const getGlassLockText = () => {
    const glassComponent = aggregatedComponents.find(c => c.component_type === 'glass');
    if (glassComponent) {
      return glassComponent.status === 'ordered' ? 'Ordered' : 'Not Ordered';
    }
    return order?.glass_status === 'ordered' ? 'Ordered' : 'Not Ordered';
  };

  const getHardwareLockText = () => {
    const hardwareComponent = aggregatedComponents.find(c => c.component_type === 'hardware');
    if (hardwareComponent) {
      return hardwareComponent.status === 'ordered' ? 'Ordered' : 'Not Ordered';
    }
    return order?.hardware_status === 'ordered' ? 'Ordered' : 'Not Ordered';
  };

  const getScreensLockText = () => {
    const screensComponent = aggregatedComponents.find(c => c.component_type === 'screens');
    if (screensComponent) {
      return screensComponent.status === 'ordered' ? 'Ordered' : 'Not Ordered';
    }
    return order?.screens_status === 'ordered' ? 'Ordered' : 'Not Ordered';
  };

  const addCustomStep = async (stepType: 'ordering' | 'manufacturing', name: string) => {
    if (!id || !name.trim()) return;
    const defaultStatus = stepType === 'ordering' ? 'not_ordered' : 'not_started';
    const { data, error } = await supabase
      .from("custom_steps")
      .insert({
        order_id: id,
        step_type: stepType,
        name: name.trim(),
        status: defaultStatus
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add custom step",
        variant: "destructive"
      });
      return;
    }

    setCustomSteps([...customSteps, data as CustomStep]);
    
    await createAuditLog({
      action: 'custom_step_created',
      description: `Added custom ${stepType} step "${name.trim()}" to order #${order?.order_number}`,
      entityType: 'custom_step',
      entityId: data.id,
    });
    
    toast({
      title: "Added",
      description: `Custom ${stepType} step added`
    });

    if (stepType === 'ordering') {
      setNewOrderingStepName("");
      setOrderingDialogOpen(false);
    } else {
      setNewManufacturingStepName("");
      setManufacturingDialogOpen(false);
    }
  };

  const updateCustomStep = async (stepId: string, updates: Partial<CustomStep>) => {
    const { error } = await supabase
      .from("custom_steps")
      .update(updates)
      .eq("id", stepId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update custom step",
        variant: "destructive"
      });
      return;
    }

    setCustomSteps(customSteps.map(s => s.id === stepId ? { ...s, ...updates } : s));
    
    const step = customSteps.find(s => s.id === stepId);
    await createAuditLog({
      action: 'custom_step_updated',
      description: `Updated custom step "${step?.name}" on order #${order?.order_number}`,
      entityType: 'custom_step',
      entityId: stepId,
    });
    
    toast({
      title: "Saved",
      description: "Custom step updated"
    });
  };

  const deleteCustomStep = async (stepId: string) => {
    const step = customSteps.find(s => s.id === stepId);
    const { error } = await supabase
      .from("custom_steps")
      .delete()
      .eq("id", stepId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete custom step",
        variant: "destructive"
      });
      return;
    }

    setCustomSteps(customSteps.filter(s => s.id !== stepId));
    
    await createAuditLog({
      action: 'custom_step_deleted',
      description: `Deleted custom step "${step?.name}" from order #${order?.order_number}`,
      entityType: 'custom_step',
      entityId: stepId,
    });
    
    toast({
      title: "Deleted",
      description: "Custom step removed"
    });
  };

  const fetchOrder = async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (orderError) throw orderError;
      if (!orderData) {
        navigate("/orders");
        return;
      }
      setOrder(orderData);

      // Fetch or create fulfillment record
      let { data: fulfillmentData, error: fulfillmentError } = await supabase
        .from("order_fulfillment")
        .select("*")
        .eq("order_id", id)
        .maybeSingle();

      if (fulfillmentError && fulfillmentError.code !== "PGRST116") throw fulfillmentError;

      if (!fulfillmentData) {
        // Only non-workers can create fulfillment records
        if (isWorker) {
          // Workers can't create - just set empty fulfillment for display
          toast({
            title: "Notice",
            description: "Fulfillment record not yet created for this order.",
          });
          setFulfillment(null);
        } else {
          // Create fulfillment record
          const { data: newFulfillment, error: createError } = await supabase
            .from("order_fulfillment")
            .insert({
              order_id: id,
              reinforcement_cutting: "not_started",
              profile_cutting: "not_started",
              frames_welded: false,
              doors_assembled: false,
              doors_glass_available: false,
              doors_glass_installed: false,
              sliding_doors_assembled: false,
              sliding_doors_glass_available: false,
              sliding_doors_glass_installed: false,
              frame_sash_assembled: false,
              glass_delivered: false,
              glass_installed: false,
              screens_made: false,
              screens_delivered: false
            })
            .select()
            .single();

          if (createError) throw createError;
          fulfillmentData = newFulfillment;
          setFulfillment(fulfillmentData);
        }
      } else {
        setFulfillment(fulfillmentData);
        // Recalculate and update fulfillment percentage if out of sync
        const calculatedPercentage = calculateFulfillmentPercentageStatic(fulfillmentData, orderData);
        if (calculatedPercentage !== orderData.fulfillment_percentage) {
          await supabase.from("orders").update({ fulfillment_percentage: calculatedPercentage }).eq("id", id);
          setOrder({ ...orderData, fulfillment_percentage: calculatedPercentage });
        }
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateFulfillmentPercentage = (data: Partial<OrderFulfillment>, orderData?: Order | null) => {
    return calculateFulfillmentPercentageStatic(data, orderData || order);
  };

  const updateFulfillment = async (key: keyof OrderFulfillment, value: any) => {
    if (!fulfillment || !order) return;

    const updatedFulfillment = { ...fulfillment, [key]: value };
    setFulfillment(updatedFulfillment);

    // Auto-save on change
    setSaving(true);
    try {
      const newPercentage = calculateFulfillmentPercentage(updatedFulfillment);
      const { error: fulfillmentError } = await supabase
        .from("order_fulfillment")
        .update(updatedFulfillment)
        .eq("id", fulfillment.id);

      if (fulfillmentError) {
        // Check if error is due to order being on hold
        if (fulfillmentError.message?.includes('order is on hold')) {
          toast({
            title: "Order is on hold",
            description: "This order has been put on hold. Manufacturing stages cannot be updated.",
            variant: "destructive"
          });
          // Revert local state and refresh
          setFulfillment(fulfillment);
          fetchOrder();
          return;
        }
        throw fulfillmentError;
      }

      // When Glass Installed is set to complete, update ALL constructions to glass_installation = complete
      if (key === 'glass_status' && value === 'complete') {
        const { data: constructions } = await supabase
          .from("order_constructions")
          .select("id")
          .eq("order_id", order.id);
        
        if (constructions && constructions.length > 0) {
          const constructionIds = constructions.map(c => c.id);
          const upsertData = constructionIds.map(cid => ({
            construction_id: cid,
            stage: 'glass_installation',
            status: 'complete'
          }));
          
          await supabase
            .from("construction_manufacturing")
            .upsert(upsertData, { onConflict: 'construction_id,stage' });
        }
      }

      const { error: orderError } = await supabase
        .from("orders")
        .update({ fulfillment_percentage: newPercentage })
        .eq("id", order.id);

      if (orderError) throw orderError;

      setOrder({ ...order, fulfillment_percentage: newPercentage });
      
      const fieldLabel = String(key).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      await createAuditLog({
        action: 'fulfillment_updated',
        description: `Updated "${fieldLabel}" to "${value}" on order #${order.order_number}`,
        entityType: 'order_fulfillment',
        entityId: order.id,
      });
      
      toast({
        title: "Saved",
        description: "Order fulfillment updated successfully."
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save changes",
        variant: "destructive"
      });
      // Revert on error
      setFulfillment(fulfillment);
    } finally {
      setSaving(false);
    }
  };

  const updateOrderComponent = async (updates: Partial<Order>) => {
    if (!order) return;

    const updatedOrder = { ...order, ...updates };
    setOrder(updatedOrder);

    setSaving(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", order.id);

      if (error) throw error;
      
      const updateKeys = Object.keys(updates);
      const fieldLabel = updateKeys.map(k => k.replace(/_/g, ' ')).join(', ');
      await createAuditLog({
        action: 'order_updated',
        description: `Updated component availability (${fieldLabel}) on order #${order.order_number}`,
        entityType: 'order',
        entityId: order.id,
      });
      
      toast({
        title: "Saved",
        description: "Component availability updated successfully."
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save changes",
        variant: "destructive"
      });
      // Revert on error
      setOrder(order);
    } finally {
      setSaving(false);
    }
  };

  const getDaysUntilDelivery = () => {
    if (!order) return 0;
    const delivery = new Date(order.delivery_date);
    const now = new Date();
    return Math.ceil((delivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getTimePercentage = () => {
    if (!order) return 0;
    const orderDate = new Date(order.order_date);
    const delivery = new Date(order.delivery_date);
    const now = new Date();
    const total = delivery.getTime() - orderDate.getTime();
    const elapsed = now.getTime() - orderDate.getTime();
    return Math.max(0, Math.min(100, 100 - elapsed / total * 100));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading order...</div>
      </div>
    );
  }

  if (!order || !fulfillment) {
    return null;
  }

  const daysUntil = getDaysUntilDelivery();
  const timeLeft = getTimePercentage();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Button variant="ghost" onClick={() => navigate("/orders")} className="gap-2 mb-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">Order #{order.order_number}</h1>
            {order.production_status === 'hold' ? (
              <Badge variant="outline" className="gap-1 text-sm border-amber-500/50 text-amber-600 dark:text-amber-400">
                <Pause className="h-3.5 w-3.5" />
                On Hold
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-sm border-success/50 text-success">
                <PlayCircle className="h-3.5 w-3.5" />
                Production Ready
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{order.customer_name}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasConstructions && (
            <Button variant="outline" size="sm" onClick={() => setOrderMapOpen(true)} className="gap-2">
              <Grid3X3 className="h-4 w-4" />
              Order Map
            </Button>
          )}
          {saving && <span className="text-sm text-muted-foreground">Saving...</span>}
        </div>
      </div>

      {/* Order Map Overlay */}
      {orderMapOpen && (
        <OrderMap
          orderId={order.id}
          orderNumber={order.order_number}
          isProductionReady={order.production_status === 'production_ready'}
          onClose={() => setOrderMapOpen(false)}
        />
      )}

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fulfillment</p>
                <p className="text-2xl font-bold">{order.fulfillment_percentage}%</p>
              </div>
              <ProgressCircle value={order.fulfillment_percentage} size="md" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Time Left</p>
                <p className="text-2xl font-bold">{daysUntil}d</p>
              </div>
              <ProgressCircle value={timeLeft} size="md" colorVariant={daysUntil < 0 ? "danger" : daysUntil < 7 ? "warning" : "info"} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Package className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Products</p>
              <p className="font-medium">
                {order.windows_count}W / {order.doors_count}D
                {order.has_sliding_doors && ` / ${order.sliding_doors_count}S`}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Calendar className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Delivery</p>
              <p className="font-medium">
                {new Date(order.delivery_date).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Component Availability Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Component Availability
          </CardTitle>
          <CardDescription>Status of components needed for manufacturing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <TooltipProvider>
              {/* Reinforcement - always shown */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
                    order.reinforcement_status === 'available' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' :
                    order.reinforcement_status === 'ordered' ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400' :
                    'bg-destructive/10 border-destructive/30 text-destructive'
                  }`}>
                    {order.reinforcement_status === 'available' ? <CheckCircle2 className="h-5 w-5 mb-1" /> :
                     order.reinforcement_status === 'ordered' ? <Clock className="h-5 w-5 mb-1" /> :
                     <AlertCircle className="h-5 w-5 mb-1" />}
                    <span className="text-xs font-medium text-center leading-tight">Reinforcement</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reinforcement: {order.reinforcement_status === 'available' ? 'Available' : order.reinforcement_status === 'ordered' ? 'Ordered' : 'Not Ordered'}</p>
                </TooltipContent>
              </Tooltip>
              
              {/* Components from File Summary */}
              {aggregatedComponents.length > 0 && (() => {
                const available = aggregatedComponents.filter(c => c.status === 'available').length;
                const ordered = aggregatedComponents.filter(c => c.status === 'ordered').length;
                const notOrdered = aggregatedComponents.filter(c => c.status === 'not_ordered' || !c.status).length;
                const total = aggregatedComponents.length;
                const allAvailable = available === total;
                const hasOrdered = ordered > 0 && !allAvailable;
                
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors col-span-2 sm:col-span-2 ${
                        allAvailable ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' :
                        hasOrdered ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400' :
                        'bg-destructive/10 border-destructive/30 text-destructive'
                      }`}>
                        {allAvailable ? <CheckCircle2 className="h-5 w-5 mb-1" /> :
                         hasOrdered ? <Clock className="h-5 w-5 mb-1" /> :
                         <AlertCircle className="h-5 w-5 mb-1" />}
                        <span className="text-xs font-medium text-center leading-tight">
                          Components from File
                        </span>
                        <span className="text-[10px] mt-0.5">
                          {available}/{total} available
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{available} available, {ordered} ordered, {notOrdered} not ordered</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })()}
            </TooltipProvider>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>Ordered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              <span>Not Ordered</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ordering and Manufacturing Stages Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ordering Stages */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Ordering Stages - #{order.order_number}
                </CardTitle>
                <CardDescription className="my-[4px] py-[8px] pt-[16px]">Update component availability and order dates</CardDescription>
              </div>
              {canUpdateOrdering && !isSeller && (
                <Dialog open={orderingDialogOpen} onOpenChange={setOrderingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Plus className="h-4 w-4" />
                      Add Step
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Custom Ordering Step</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Step Name</Label>
                      <Input
                        placeholder="e.g., Special Hardware, Custom Seals..."
                        value={newOrderingStepName}
                        onChange={e => setNewOrderingStepName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addCustomStep('ordering', newOrderingStepName)}
                      />
                    </div>
                    <Button onClick={() => addCustomStep('ordering', newOrderingStepName)} disabled={!newOrderingStepName.trim()} className="w-full">
                      Add Step
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {/* Reinforcement */}
              <AccordionItem value="order-reinforcement">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    {order.reinforcement_status === 'available' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
                     order.reinforcement_status === 'ordered' ? <Clock className="h-4 w-4 text-amber-500" /> :
                     <AlertCircle className="h-4 w-4 text-destructive" />}
                    <span>Reinforcement</span>
                    <Badge variant="outline" className="ml-2 capitalize">
                      {(order.reinforcement_status || 'not_ordered').replace('_', ' ')}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  <div className="space-y-3">
                    <Label>Status</Label>
                    <StatusButtonGroup
                      value={order.reinforcement_status || 'not_ordered'}
                      onChange={value => updateOrderComponent({
                        reinforcement_status: value,
                        reinforcement_order_date: value === 'ordered' ? order.reinforcement_order_date || new Date().toISOString().split('T')[0] : null
                      })}
                      options={orderingStatusOptions}
                      disabled={!canUpdateOrdering || isSeller}
                    />
                  </div>
                  {order.reinforcement_status === 'ordered' && (
                    <div className="space-y-2">
                      <Label>Order Date</Label>
                      <Input
                        type="date"
                        value={order.reinforcement_order_date || ''}
                        onChange={e => updateOrderComponent({ reinforcement_order_date: e.target.value })}
                        disabled={!canUpdateOrdering || isSeller}
                      />
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>


              {/* Aggregated Components from Constructions */}
              {aggregatedComponents.length > 0 && (
                <>
                  <div className="text-xs text-muted-foreground mt-4 mb-2 font-medium uppercase tracking-wide">
                    Components from File
                  </div>
                  {aggregatedComponents.map((comp, index) => (
                    <AccordionItem key={`aggr-${comp.component_type}-${index}`} value={`aggr-${comp.component_type}-${index}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          {comp.status === 'available' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
                           comp.status === 'ordered' ? <Clock className="h-4 w-4 text-amber-500" /> :
                           <AlertCircle className="h-4 w-4 text-destructive" />}
                          <span>{formatComponentName(comp.component_type)}</span>
                          {comp.component_name && (
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                              ({comp.component_name})
                            </span>
                          )}
                          <Badge variant="secondary" className="ml-1 text-xs">
                            x{comp.total_quantity}
                          </Badge>
                          <Badge variant="outline" className="ml-2 capitalize">
                            {(comp.status || 'not_ordered').replace('_', ' ')}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4 space-y-4">
                        {comp.component_name && (
                          <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                            {comp.component_name}
                          </div>
                        )}
                        <div className="space-y-3">
                          <Label>Status</Label>
                          <StatusButtonGroup
                            value={comp.status || 'not_ordered'}
                            onChange={value => updateAggregatedComponent(comp, {
                              status: value,
                              order_date: value === 'ordered' ? comp.order_date || new Date().toISOString().split('T')[0] : null
                            })}
                            options={orderingStatusOptions}
                            disabled={!canUpdateOrdering || isSeller}
                          />
                        </div>
                        {comp.status === 'ordered' && (
                          <div className="space-y-2">
                            <Label>Order Date</Label>
                            <Input
                              type="date"
                              value={comp.order_date || ''}
                              onChange={e => updateAggregatedComponent(comp, { status: comp.status, order_date: e.target.value })}
                              disabled={!canUpdateOrdering || isSeller}
                            />
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </>
              )}

              {/* Custom Ordering Steps */}
              {customSteps.filter(s => s.step_type === 'ordering').map(step => (
                <AccordionItem key={step.id} value={`custom-ordering-${step.id}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      {step.status === 'available' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
                       step.status === 'ordered' ? <Clock className="h-4 w-4 text-amber-500" /> :
                       <AlertCircle className="h-4 w-4 text-destructive" />}
                      <span>{step.name}</span>
                      <Badge variant="outline" className="ml-2 capitalize">
                        {step.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <div className="space-y-3">
                      <Label>Status</Label>
                      <StatusButtonGroup
                        value={step.status}
                        onChange={value => updateCustomStep(step.id, {
                          status: value,
                          order_date: value === 'ordered' ? step.order_date || new Date().toISOString().split('T')[0] : null
                        })}
                        options={orderingStatusOptions}
                        disabled={!canUpdateOrdering || isSeller}
                      />
                    </div>
                      {step.status === 'ordered' && (
                      <div className="space-y-2">
                        <Label>Order Date</Label>
                        <Input
                          type="date"
                          value={step.order_date || ''}
                          onChange={e => updateCustomStep(step.id, { order_date: e.target.value })}
                          disabled={!canUpdateOrdering || isSeller}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        placeholder="Add notes..."
                        value={step.notes || ""}
                        onChange={e => updateCustomStep(step.id, { notes: e.target.value })}
                        disabled={!canUpdateOrdering || isSeller}
                      />
                    </div>
                    {isAdmin && (
                      <Button variant="destructive" size="sm" onClick={() => deleteCustomStep(step.id)} className="gap-1">
                        <Trash2 className="h-4 w-4" />
                        Delete Step
                      </Button>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Manufacturing Stages */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Manufacturing Stages - #{order.order_number}
                </CardTitle>
                <CardDescription>Track progress through each manufacturing step</CardDescription>
              </div>
              {canUpdateManufacturing && (
                <Dialog open={manufacturingDialogOpen} onOpenChange={setManufacturingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Plus className="h-4 w-4" />
                      Add Step
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Custom Manufacturing Step</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Step Name</Label>
                        <Input
                          placeholder="e.g., Quality Check, Packaging..."
                          value={newManufacturingStepName}
                          onChange={e => setNewManufacturingStepName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addCustomStep('manufacturing', newManufacturingStepName)}
                        />
                      </div>
                      <Button onClick={() => addCustomStep('manufacturing', newManufacturingStepName)} disabled={!newManufacturingStepName.trim()} className="w-full">
                        Add Step
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {/* On Hold Warning Banner */}
            {order.production_status === 'hold' && (
              <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <Pause className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Manufacturing is locked - Order On Hold</p>
                  <p className="text-xs text-muted-foreground">Change the production status to "Production Ready" to enable manufacturing stages.</p>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {/* Reinforcement Cutting */}
              <AccordionItem value="reinforcement">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={fulfillment.reinforcement_cutting as StageStatus || "not_started"} />
                    <span>Reinforcement Cutting</span>
                    {order.production_status === 'hold' ? (
                      <Badge variant="outline" className="ml-2 text-amber-600 dark:text-amber-400 gap-1 border-amber-500/50">
                        <Pause className="h-3 w-3" />
                        On Hold
                      </Badge>
                    ) : order.reinforcement_status !== 'available' && (
                      <Badge variant="outline" className="ml-2 text-muted-foreground gap-1">
                        <Lock className="h-3 w-3" />
                        {order.reinforcement_status === 'not_ordered' ? 'Not Ordered' : 'Ordered'}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  {order.production_status === 'hold' ? (
                    <p className="text-sm text-muted-foreground">Order is on hold. Change production status to "Production Ready" to update manufacturing stages.</p>
                  ) : order.reinforcement_status !== 'available' ? (
                    <p className="text-sm text-muted-foreground">Reinforcement must be available before this stage can be updated.</p>
                  ) : (
                    <StatusButtonGroup
                      value={fulfillment.reinforcement_cutting || "not_started"}
                      onChange={value => updateFulfillment("reinforcement_cutting", value)}
                      options={manufacturingStatusOptions}
                      disabled={!canUpdateManufacturing}
                    />
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Profile Cutting */}
              <AccordionItem value="profile">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={fulfillment.profile_cutting as StageStatus || "not_started"} />
                    <span>Profile Cutting</span>
                    {order.production_status === 'hold' ? (
                      <Badge variant="outline" className="ml-2 text-amber-600 dark:text-amber-400 gap-1 border-amber-500/50">
                        <Pause className="h-3 w-3" />
                        On Hold
                      </Badge>
                    ) : !isProfileAvailable() && (
                      <Badge variant="outline" className="ml-2 text-muted-foreground gap-1">
                        <Lock className="h-3 w-3" />
                        {getProfileLockText()}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  {order.production_status === 'hold' ? (
                    <p className="text-sm text-muted-foreground">Order is on hold. Change production status to "Production Ready" to update manufacturing stages.</p>
                  ) : !isProfileAvailable() ? (
                    <p className="text-sm text-muted-foreground">Profile must be available before this stage can be updated.</p>
                  ) : (
                    <StatusButtonGroup
                      value={fulfillment.profile_cutting || "not_started"}
                      onChange={value => updateFulfillment("profile_cutting", value)}
                      options={manufacturingStatusOptions}
                      disabled={!canUpdateManufacturing}
                    />
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Frames Welded */}
              <AccordionItem value="welding">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={fulfillment.welding_status === 'complete' ? 'complete' : fulfillment.welding_status === 'partial' ? 'partial' : 'not_started'} />
                    <span>Frames/Sashes Welded</span>
                    {order.production_status === 'hold' ? (
                      <Badge variant="outline" className="ml-2 text-amber-600 dark:text-amber-400 gap-1 border-amber-500/50">
                        <Pause className="h-3 w-3" />
                        On Hold
                      </Badge>
                    ) : !isProfileAvailable() && (
                      <Badge variant="outline" className="ml-2 text-muted-foreground gap-1">
                        <Lock className="h-3 w-3" />
                        Profile {getProfileLockText()}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  {order.production_status === 'hold' ? (
                    <p className="text-sm text-muted-foreground">Order is on hold. Change production status to "Production Ready" to update manufacturing stages.</p>
                  ) : !isProfileAvailable() ? (
                    <p className="text-sm text-muted-foreground">Profile must be available before this stage can be updated.</p>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <Label>Status</Label>
                        <StatusButtonGroup
                          value={fulfillment.welding_status || "not_started"}
                          onChange={value => updateFulfillment("welding_status", value)}
                          options={manufacturingStatusOptions}
                          disabled={!canUpdateManufacturing}
                        />
                      </div>
                      {fulfillment.welding_status === 'partial' && (
                        <div className="space-y-2">
                          <Label>Notes</Label>
                          <Textarea
                            placeholder="Add notes about welding progress..."
                            value={fulfillment.welding_notes || ""}
                            onChange={e => updateFulfillment("welding_notes", e.target.value)}
                            disabled={!canUpdateManufacturing}
                          />
                        </div>
                      )}
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Doors Assembled - only if order has doors */}
              {order.doors_count > 0 && (
                <AccordionItem value="doors">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={fulfillment.doors_status === 'complete' ? 'complete' : fulfillment.doors_status === 'partial' ? 'partial' : 'not_started'} />
                      <span>Doors Assembled</span>
                      {order.production_status === 'hold' ? (
                        <Badge variant="outline" className="ml-2 text-amber-600 dark:text-amber-400 gap-1 border-amber-500/50">
                          <Pause className="h-3 w-3" />
                          On Hold
                        </Badge>
                      ) : !isHardwareAvailable() && (
                        <Badge variant="outline" className="ml-2 text-muted-foreground gap-1">
                          <Lock className="h-3 w-3" />
                          Hardware {getHardwareLockText()}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    {order.production_status === 'hold' ? (
                      <p className="text-sm text-muted-foreground">Order is on hold. Change production status to "Production Ready" to update manufacturing stages.</p>
                    ) : !isHardwareAvailable() ? (
                      <p className="text-sm text-muted-foreground">Hardware must be available before this stage can be updated.</p>
                    ) : (
                      <>
                        <div className="space-y-3">
                          <Label>Status</Label>
                          <StatusButtonGroup
                            value={fulfillment.doors_status || "not_started"}
                            onChange={value => updateFulfillment("doors_status", value)}
                            options={manufacturingStatusOptions}
                            disabled={!canUpdateManufacturing}
                          />
                        </div>
                        {fulfillment.doors_status === 'partial' && (
                          <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                              placeholder="Add notes about door assembly..."
                              value={fulfillment.doors_notes || ""}
                              onChange={e => updateFulfillment("doors_notes", e.target.value)}
                              disabled={!canUpdateManufacturing}
                            />
                          </div>
                        )}
                        
                        {/* Doors Glass Installation - locked until doors assembled */}
                        <div className="border-t pt-4 mt-4">
                          <div className="flex items-center gap-3 mb-2">
                            <Label>Glass Installed</Label>
                            {fulfillment.doors_status !== 'complete' && (
                              <Badge variant="outline" className="text-muted-foreground gap-1">
                                <Lock className="h-3 w-3" />
                                Doors Not Assembled
                              </Badge>
                            )}
                          </div>
                          {fulfillment.doors_status !== 'complete' ? (
                            <p className="text-sm text-muted-foreground">Doors must be assembled before glass can be installed.</p>
                          ) : (
                            <Switch 
                              checked={fulfillment.doors_glass_installed || false} 
                              onCheckedChange={checked => updateFulfillment("doors_glass_installed", checked)}
                              disabled={!canUpdateManufacturing}
                            />
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Photo</Label>
                          <ImageUpload
                            value={fulfillment.doors_image_url}
                            onChange={url => updateFulfillment("doors_image_url", url)}
                            folder={`doors/${order.id}`}
                            disabled={saving || !canUpdateManufacturing}
                          />
                        </div>
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Sliding Doors Assembled - only if order has sliding doors */}
              {order.has_sliding_doors && (
                <AccordionItem value="sliding">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={fulfillment.sliding_doors_status === 'complete' ? 'complete' : fulfillment.sliding_doors_status === 'partial' ? 'partial' : 'not_started'} />
                      <span>Sliding Doors Assembled</span>
                      {order.production_status === 'hold' ? (
                        <Badge variant="outline" className="ml-2 text-amber-600 dark:text-amber-400 gap-1 border-amber-500/50">
                          <Pause className="h-3 w-3" />
                          On Hold
                        </Badge>
                      ) : !isHardwareAvailable() && (
                        <Badge variant="outline" className="ml-2 text-muted-foreground gap-1">
                          <Lock className="h-3 w-3" />
                          Hardware {getHardwareLockText()}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    {order.production_status === 'hold' ? (
                      <p className="text-sm text-muted-foreground">Order is on hold. Change production status to "Production Ready" to update manufacturing stages.</p>
                    ) : !isHardwareAvailable() ? (
                      <p className="text-sm text-muted-foreground">Hardware must be available before this stage can be updated.</p>
                    ) : (
                      <>
                        <div className="space-y-3">
                          <Label>Status</Label>
                          <StatusButtonGroup
                            value={fulfillment.sliding_doors_status || "not_started"}
                            onChange={value => updateFulfillment("sliding_doors_status", value)}
                            options={manufacturingStatusOptions}
                            disabled={!canUpdateManufacturing}
                          />
                        </div>
                        {fulfillment.sliding_doors_status === 'partial' && (
                          <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                              placeholder="Add notes about sliding door assembly..."
                              value={fulfillment.sliding_doors_notes || ""}
                              onChange={e => updateFulfillment("sliding_doors_notes", e.target.value)}
                              disabled={!canUpdateManufacturing}
                            />
                          </div>
                        )}
                        
                        {/* Sliding Doors Glass Installation - locked until sliding doors assembled */}
                        <div className="border-t pt-4 mt-4">
                          <div className="flex items-center gap-3 mb-2">
                            <Label>Glass Installed</Label>
                            {fulfillment.sliding_doors_status !== 'complete' && (
                              <Badge variant="outline" className="text-muted-foreground gap-1">
                                <Lock className="h-3 w-3" />
                                Sliding Doors Not Assembled
                              </Badge>
                            )}
                          </div>
                          {fulfillment.sliding_doors_status !== 'complete' ? (
                            <p className="text-sm text-muted-foreground">Sliding doors must be assembled before glass can be installed.</p>
                          ) : (
                            <Switch 
                              checked={fulfillment.sliding_doors_glass_installed || false} 
                              onCheckedChange={checked => updateFulfillment("sliding_doors_glass_installed", checked)}
                              disabled={!canUpdateManufacturing}
                            />
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Photo</Label>
                          <ImageUpload
                            value={fulfillment.sliding_doors_image_url}
                            onChange={url => updateFulfillment("sliding_doors_image_url", url)}
                            folder={`sliding-doors/${order.id}`}
                            disabled={saving || !canUpdateManufacturing}
                          />
                        </div>
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Frame & Sash Assembled */}
              <AccordionItem value="frame-sash">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={fulfillment.assembly_status === 'complete' ? 'complete' : fulfillment.assembly_status === 'partial' ? 'partial' : 'not_started'} />
                    <span>Frame & Sash Assembled</span>
                    {order.production_status === 'hold' ? (
                      <Badge variant="outline" className="ml-2 text-amber-600 dark:text-amber-400 gap-1 border-amber-500/50">
                        <Pause className="h-3 w-3" />
                        On Hold
                      </Badge>
                    ) : !isHardwareAvailable() && (
                      <Badge variant="outline" className="ml-2 text-muted-foreground gap-1">
                        <Lock className="h-3 w-3" />
                        Hardware {getHardwareLockText()}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  {order.production_status === 'hold' ? (
                    <p className="text-sm text-muted-foreground">Order is on hold. Change production status to "Production Ready" to update manufacturing stages.</p>
                  ) : !isHardwareAvailable() ? (
                    <p className="text-sm text-muted-foreground">Hardware must be available before this stage can be updated.</p>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <Label>Status</Label>
                        <StatusButtonGroup
                          value={fulfillment.assembly_status || "not_started"}
                          onChange={value => updateFulfillment("assembly_status", value)}
                          options={manufacturingStatusOptions}
                          disabled={!canUpdateManufacturing}
                        />
                      </div>
                      {fulfillment.assembly_status === 'partial' && (
                        <div className="space-y-2">
                          <Label>Notes</Label>
                          <Textarea
                            placeholder="Add notes about assembly progress..."
                            value={fulfillment.assembly_notes || ""}
                            onChange={e => updateFulfillment("assembly_notes", e.target.value)}
                            disabled={!canUpdateManufacturing}
                          />
                        </div>
                      )}
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Glass Installed */}
              <AccordionItem value="glass-install">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={fulfillment.glass_status === 'complete' ? 'complete' : fulfillment.glass_status === 'partial' ? 'partial' : 'not_started'} />
                    <span>Glass Installed</span>
                    {order.production_status === 'hold' ? (
                      <Badge variant="outline" className="ml-2 text-amber-600 dark:text-amber-400 gap-1 border-amber-500/50">
                        <Pause className="h-3 w-3" />
                        On Hold
                      </Badge>
                    ) : !isGlassAvailable() ? (
                      <Badge variant="outline" className="ml-2 text-muted-foreground gap-1">
                        <Lock className="h-3 w-3" />
                        Glass {getGlassLockText()}
                      </Badge>
                    ) : fulfillment.assembly_status !== 'complete' && (
                      <Badge variant="outline" className="ml-2 text-muted-foreground gap-1">
                        <Lock className="h-3 w-3" />
                        Frame & Sash Not Complete
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  {order.production_status === 'hold' ? (
                    <p className="text-sm text-muted-foreground">Order is on hold. Change production status to "Production Ready" to update manufacturing stages.</p>
                  ) : !isGlassAvailable() ? (
                    <p className="text-sm text-muted-foreground">Glass must be available before this stage can be updated.</p>
                  ) : fulfillment.assembly_status !== 'complete' ? (
                    <p className="text-sm text-muted-foreground">Frame & Sash must be assembled before glass can be installed.</p>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <Label>Status</Label>
                        <StatusButtonGroup
                          value={fulfillment.glass_status || "not_started"}
                          onChange={value => updateFulfillment("glass_status", value)}
                          options={manufacturingStatusOptions}
                          disabled={!canUpdateManufacturing}
                        />
                      </div>
                      {fulfillment.glass_status === 'partial' && (
                        <div className="space-y-2">
                          <Label>Notes</Label>
                          <Textarea
                            placeholder="Add notes about glass installation..."
                            value={fulfillment.glass_notes || ""}
                            onChange={e => updateFulfillment("glass_notes", e.target.value)}
                            disabled={!canUpdateManufacturing}
                          />
                        </div>
                      )}
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Made Screens */}
              <AccordionItem value="screens">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={fulfillment.screens_cutting === 'complete' ? 'complete' : fulfillment.screens_cutting === 'partial' ? 'partial' : 'not_started'} />
                    <span>Made Screens</span>
                    {order.production_status === 'hold' ? (
                      <Badge variant="outline" className="ml-2 text-amber-600 dark:text-amber-400 gap-1 border-amber-500/50">
                        <Pause className="h-3 w-3" />
                        On Hold
                      </Badge>
                    ) : !isScreensAvailable() && (
                      <Badge variant="outline" className="ml-2 text-muted-foreground gap-1">
                        <Lock className="h-3 w-3" />
                        Screens {getScreensLockText()}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  {order.production_status === 'hold' ? (
                    <p className="text-sm text-muted-foreground">Order is on hold. Change production status to "Production Ready" to update manufacturing stages.</p>
                  ) : !isScreensAvailable() ? (
                    <p className="text-sm text-muted-foreground">Screens must be available before this stage can be updated.</p>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <Label>Status</Label>
                        <StatusButtonGroup
                          value={fulfillment.screens_cutting || "not_started"}
                          onChange={value => updateFulfillment("screens_cutting", value)}
                          options={manufacturingStatusOptions}
                          disabled={!canUpdateManufacturing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Notes (reason if not complete, expected date)</Label>
                        <Textarea
                          placeholder="Add notes about screens..."
                          value={fulfillment.screens_notes || ""}
                          onChange={e => updateFulfillment("screens_notes", e.target.value)}
                          disabled={!canUpdateManufacturing}
                        />
                      </div>
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Custom Manufacturing Steps */}
              {customSteps.filter(s => s.step_type === 'manufacturing').map(step => (
                <AccordionItem key={step.id} value={`custom-manufacturing-${step.id}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={step.status === 'complete' ? 'complete' : step.status === 'partial' ? 'partial' : 'not_started'} />
                      <span>{step.name}</span>
                      {order.production_status === 'hold' && (
                        <Badge variant="outline" className="ml-2 text-amber-600 dark:text-amber-400 gap-1 border-amber-500/50">
                          <Pause className="h-3 w-3" />
                          On Hold
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    {order.production_status === 'hold' ? (
                      <p className="text-sm text-muted-foreground">Order is on hold. Change production status to "Production Ready" to update manufacturing stages.</p>
                    ) : (
                      <div className="space-y-3">
                        <Label>Status</Label>
                        <StatusButtonGroup
                          value={step.status}
                          onChange={value => updateCustomStep(step.id, { status: value })}
                          options={manufacturingStatusOptions}
                          disabled={!canUpdateManufacturing}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        placeholder="Add notes..."
                        value={step.notes || ""}
                        onChange={e => updateCustomStep(step.id, { notes: e.target.value })}
                        disabled={!canUpdateManufacturing}
                      />
                    </div>
                    {isAdmin && (
                      <Button variant="destructive" size="sm" onClick={() => deleteCustomStep(step.id)} className="gap-1">
                        <Trash2 className="h-4 w-4" />
                        Delete Step
                      </Button>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Batches Section */}
      <DeliveryBatchSection
        order={{
          id: order.id,
          order_number: order.order_number,
          windows_count: order.windows_count,
          doors_count: order.doors_count,
          sliding_doors_count: order.sliding_doors_count,
          has_sliding_doors: order.has_sliding_doors,
          screen_type: order.screen_type,
        }}
        manufacturingProgress={order.fulfillment_percentage}
      />
    </div>
  );
}
