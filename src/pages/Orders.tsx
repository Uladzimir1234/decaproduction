import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Pencil, Trash2, AlertCircle, Clock, Wrench, Truck, BoxIcon, CheckCircle, Pause, PlayCircle, Grid3X3, Lock, Star, ShoppingCart, Archive, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ProgressCircle } from "@/components/ui/progress-circle";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderEditDialog } from "@/components/OrderEditDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { createAuditLog } from "@/lib/auditLog";
import { StatusPopoverButtons, orderingPopoverOptions, manufacturingPopoverOptions } from "@/components/ui/status-popover-buttons";
import { format } from "date-fns";
import { OrderMapInline } from "@/components/order/OrderMapInline";
import { useProcurementCart } from "@/contexts/ProcurementCartContext";
import { ManufacturingPipelineSection } from "@/components/order/ManufacturingPipeline";
interface OrderFulfillment {
  order_id: string;
  reinforcement_cutting: string | null;
  profile_cutting: string | null;
  frames_welded: boolean | null;
  welding_status: string | null;
  welding_notes: string | null;
  doors_assembled: boolean | null;
  doors_glass_installed: boolean | null;
  doors_status: string | null;
  doors_notes: string | null;
  sliding_doors_assembled: boolean | null;
  sliding_doors_glass_installed: boolean | null;
  sliding_doors_status: string | null;
  sliding_doors_notes: string | null;
  // Sliding doors independent track
  sliding_doors_reinforcement_cutting: string | null;
  sliding_doors_profile_cutting: string | null;
  sliding_doors_welding_status: string | null;
  sliding_doors_welding_notes: string | null;
  frame_sash_assembled: boolean | null;
  assembly_status: string | null;
  assembly_notes: string | null;
  glass_delivered: boolean | null;
  glass_installed: boolean | null;
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
  // Shipping preparation fields
  shipping_handles_boxed: boolean | null;
  shipping_hinges_covers: boolean | null;
  shipping_weeping_covers: boolean | null;
  shipping_spec_labels: boolean | null;
  shipping_nailing_fins: boolean | null;
  shipping_brackets: boolean | null;
  // Tracking fields
  updated_at: string | null;
  updated_by: string | null;
  updated_by_email: string | null;
}

interface CustomStep {
  id: string;
  order_id: string;
  step_type: 'ordering' | 'manufacturing';
  name: string;
  status: string;
  order_date: string | null;
  notes: string | null;
  updated_at: string | null;
  updated_by: string | null;
  updated_by_email: string | null;
}

interface DeliveryBatch {
  id: string;
  order_id: string;
  delivery_date: string;
  status: string;
}

interface ConstructionComponent {
  construction_id: string;
  component_type: string;
  component_name: string | null;
  status: string;
  quantity: number;
  order_id: string;
}

interface ConstructionManufacturing {
  construction_id: string;
  stage: string;
  status: string;
  order_id: string;
}

interface OrderConstruction {
  order_id: string;
  construction_id: string;
  construction_type: string;
  construction_number: string;
  quantity: number;
  screen_type: string | null;
  has_blinds: boolean;
}

interface BatchConstructionItemDetail {
  construction_id: string;
  order_id: string;
  quantity: number;
  include_glass: boolean;
  include_screens: boolean;
  include_blinds: boolean;
  include_hardware: boolean;
}

interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  order_date: string;
  delivery_date: string;
  user_id: string;
  fulfillment_percentage: number;
  windows_count: number;
  doors_count: number;
  sliding_doors_count: number;
  has_sliding_doors: boolean | null;
  sliding_door_type: string | null;
  has_plisse_screens: boolean | null;
  plisse_screens_count: number | null;
  plisse_door_count: number | null;
  plisse_window_count: number | null;
  screen_type: string | null;
  has_nailing_flanges: boolean | null;
  windows_profile_type: string | null;
  hidden_hinges_count: number | null;
  visible_hinges_count: number | null;
  reinforcement_status: string | null;
  reinforcement_order_date: string | null;
  windows_profile_status: string | null;
  windows_profile_order_date: string | null;
  glass_status: string | null;
  glass_order_date: string | null;
  screens_status: string | null;
  screens_order_date: string | null;
  plisse_screens_status: string | null;
  plisse_screens_order_date: string | null;
  nail_fins_status: string | null;
  nail_fins_order_date: string | null;
  hardware_status: string | null;
  hardware_order_date: string | null;
  // Sliding doors independent components
  sliding_doors_profile_status: string | null;
  sliding_doors_profile_order_date: string | null;
  sliding_doors_hardware_status: string | null;
  sliding_doors_hardware_order_date: string | null;
  production_status: string;
  hold_started_at: string | null;
  is_priority: boolean | null;
  delivery_complete: boolean | null;
  // Ordering tracking fields
  ordering_updated_at: string | null;
  ordering_updated_by: string | null;
  ordering_updated_by_email: string | null;
}

// Helper to format tracking info for tooltips
const formatTrackingInfo = (updatedAt: string | null, updatedByEmail: string | null): string | null => {
  if (!updatedAt) return null;
  try {
    const date = new Date(updatedAt);
    const formattedDate = format(date, "MMM d, yyyy 'at' h:mm a");
    return updatedByEmail 
      ? `Last updated: ${formattedDate}\nBy: ${updatedByEmail}`
      : `Last updated: ${formattedDate}`;
  } catch {
    return null;
  }
};

export default function Orders() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { isWorker, isSeller, isAdmin, isManager, canUpdateOrdering, canUpdateManufacturing } = useRole();
  const { addToCart, isInCart, cartItems } = useProcurementCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fulfillments, setFulfillments] = useState<Record<string, OrderFulfillment>>({});
  const [sellers, setSellers] = useState<Record<string, { email: string; full_name: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [customSteps, setCustomSteps] = useState<CustomStep[]>([]);
  const [deliveryBatches, setDeliveryBatches] = useState<DeliveryBatch[]>([]);
  const [ordersWithConstructions, setOrdersWithConstructions] = useState<Set<string>>(new Set());
  const [orderConstructions, setOrderConstructions] = useState<Record<string, OrderConstruction[]>>({});
  const [constructionComponents, setConstructionComponents] = useState<Record<string, ConstructionComponent[]>>({});
  const [constructionManufacturing, setConstructionManufacturing] = useState<Record<string, ConstructionManufacturing[]>>({});
  const [batchConstructionItems, setBatchConstructionItems] = useState<Record<string, BatchConstructionItemDetail[]>>({});
  
  // Per-order toggle states - store COLLAPSED order maps (inverted: open by default)
  const [collapsedOrderMaps, setCollapsedOrderMaps] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('collapsedOrderMaps');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [expandedAvailableComponents, setExpandedAvailableComponents] = useState<Set<string>>(new Set());
  
  // Sort state with localStorage persistence
  const [sortBy, setSortBy] = useState<string>(() => {
    const saved = localStorage.getItem('ordersSortBy');
    return saved || 'time_left_asc';
  });
  
  // Persist sort preference
  useEffect(() => {
    localStorage.setItem('ordersSortBy', sortBy);
  }, [sortBy]);
  
  // Scroll to order when navigating back from order detail
  useEffect(() => {
    if (location.hash && !loading) {
      const elementId = location.hash.slice(1); // Remove the '#'
      const element = document.getElementById(elementId);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-primary');
          setTimeout(() => element.classList.remove('ring-2', 'ring-primary'), 2000);
        }, 100);
      }
    }
  }, [location.hash, loading]);
  
  // Ref to track if initial data has been loaded (to avoid toast on first load)
  const initialLoadComplete = useRef(false);

  // Toggle handlers for per-order visibility
  const toggleOrderMap = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedOrderMaps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      localStorage.setItem('collapsedOrderMaps', JSON.stringify([...newSet]));
      return newSet;
    });
  };

  const toggleAvailableComponents = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedAvailableComponents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        fetchOrders(),
        fetchFulfillments(),
        fetchCustomSteps(),
        fetchDeliveryBatches(),
        fetchSellers(),
        fetchOrdersWithConstructions(),
        fetchConstructionComponents(),
        fetchConstructionManufacturing(),
        fetchBatchConstructionItems()
      ]);
      // Mark initial load as complete after data is fetched
      setTimeout(() => {
        initialLoadComplete.current = true;
      }, 1000);
    };
    
    loadInitialData();

    // Subscribe to real-time updates on orders table
    const ordersChannel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order;
            setOrders(prev => prev.map(order => 
              order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
            ));
            
            // Show toast for ordering stage updates
            if (initialLoadComplete.current && updatedOrder.ordering_updated_by_email) {
              const order = orders.find(o => o.id === updatedOrder.id);
              toast({
                title: "Ordering Stage Updated",
                description: `Order #${order?.order_number || 'Unknown'} updated by ${updatedOrder.ordering_updated_by_email}`,
              });
            }
          } else if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new as Order, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(order => order.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to real-time updates on order_fulfillment table (manufacturing stages)
    const fulfillmentChannel = supabase
      .channel('fulfillments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_fulfillment'
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newFulfillment = payload.new as OrderFulfillment;
            setFulfillments(prev => ({
              ...prev,
              [newFulfillment.order_id]: newFulfillment
            }));
            
            // Show toast for manufacturing stage updates
            if (initialLoadComplete.current && payload.eventType === 'UPDATE' && newFulfillment.updated_by_email) {
              const order = orders.find(o => o.id === newFulfillment.order_id);
              toast({
                title: "Manufacturing Stage Updated",
                description: `Order #${order?.order_number || 'Unknown'} updated by ${newFulfillment.updated_by_email}`,
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const oldFulfillment = payload.old as { order_id: string };
            setFulfillments(prev => {
              const updated = { ...prev };
              delete updated[oldFulfillment.order_id];
              return updated;
            });
          }
        }
      )
      .subscribe();

    // Subscribe to real-time updates on custom_steps table
    const customStepsChannel = supabase
      .channel('customsteps-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'custom_steps'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCustomSteps(prev => [...prev, payload.new as CustomStep]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedStep = payload.new as CustomStep;
            setCustomSteps(prev => prev.map(step => 
              step.id === updatedStep.id ? { ...step, ...updatedStep } : step
            ));
            
            // Show toast for custom step updates
            if (initialLoadComplete.current && updatedStep.updated_by_email) {
              toast({
                title: "Custom Step Updated",
                description: `"${updatedStep.name}" updated by ${updatedStep.updated_by_email}`,
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setCustomSteps(prev => prev.filter(step => step.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to real-time updates on delivery_batches table
    const deliveryBatchesChannel = supabase
      .channel('deliverybatches-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_batches'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setDeliveryBatches(prev => [...prev, payload.new as DeliveryBatch]);
          } else if (payload.eventType === 'UPDATE') {
            setDeliveryBatches(prev => prev.map(batch => 
              batch.id === payload.new.id ? { ...batch, ...payload.new } : batch
            ));
          } else if (payload.eventType === 'DELETE') {
            setDeliveryBatches(prev => prev.filter(batch => batch.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to real-time updates on construction_components table
    const componentsChannel = supabase
      .channel('construction-components-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'construction_components'
        },
        () => {
          fetchConstructionComponents();
        }
      )
      .subscribe();

    // Subscribe to real-time updates on construction_manufacturing table
    const manufacturingChannel = supabase
      .channel('construction-manufacturing-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'construction_manufacturing'
        },
        () => {
          fetchConstructionManufacturing();
        }
      )
      .subscribe();

    // Subscribe to real-time updates on batch_construction_items table
    const batchConstructionChannel = supabase
      .channel('batch-construction-items-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'batch_construction_items'
        },
        () => {
          fetchBatchConstructionItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(fulfillmentChannel);
      supabase.removeChannel(customStepsChannel);
      supabase.removeChannel(deliveryBatchesChannel);
      supabase.removeChannel(componentsChannel);
      supabase.removeChannel(manufacturingChannel);
      supabase.removeChannel(batchConstructionChannel);
    };
  }, [orders, toast]);

  const fetchSellers = async () => {
    try {
      // Get all users with seller role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "seller");
      
      if (roleError) throw roleError;
      
      if (roleData && roleData.length > 0) {
        const sellerIds = roleData.map(r => r.user_id);
        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("id, email, full_name")
          .in("id", sellerIds);
        
        if (profileError) throw profileError;
        
        const sellerMap: Record<string, { email: string; full_name: string | null }> = {};
        profileData?.forEach(s => {
          sellerMap[s.id] = { email: s.email, full_name: s.full_name };
        });
        setSellers(sellerMap);
      }
    } catch (error) {
      console.error("Error fetching sellers:", error);
    }
  };

  const fetchCustomSteps = async () => {
    try {
      const { data, error } = await supabase.from("custom_steps").select("*");
      if (error) throw error;
      setCustomSteps((data || []) as CustomStep[]);
    } catch (error) {
      console.error("Error fetching custom steps:", error);
    }
  };

  const fetchDeliveryBatches = async () => {
    try {
      const { data, error } = await supabase
        .from("delivery_batches")
        .select("id, order_id, delivery_date, status")
        .order("delivery_date", { ascending: true });
      if (error) throw error;
      setDeliveryBatches((data || []) as DeliveryBatch[]);
    } catch (error) {
      console.error("Error fetching delivery batches:", error);
    }
  };

  const fetchOrdersWithConstructions = async () => {
    try {
      const { data, error } = await supabase
        .from("order_constructions")
        .select("id, order_id, construction_type, construction_number, quantity, screen_type, has_blinds");
      if (error) throw error;
      const orderIds = new Set(data?.map(c => c.order_id) || []);
      setOrdersWithConstructions(orderIds);
      
      // Group constructions by order_id
      const constructionsByOrder: Record<string, OrderConstruction[]> = {};
      data?.forEach((item) => {
        if (!constructionsByOrder[item.order_id]) {
          constructionsByOrder[item.order_id] = [];
        }
        constructionsByOrder[item.order_id].push({
          order_id: item.order_id,
          construction_id: item.id,
          construction_type: item.construction_type,
          construction_number: item.construction_number,
          quantity: item.quantity,
          screen_type: item.screen_type,
          has_blinds: item.has_blinds || false,
        });
      });
      setOrderConstructions(constructionsByOrder);
    } catch (error) {
      console.error("Error fetching orders with constructions:", error);
    }
  };

  const fetchBatchConstructionItems = async () => {
    try {
      const { data, error } = await supabase
        .from("batch_construction_items")
        .select(`
          construction_id,
          quantity,
          include_glass,
          include_screens,
          include_blinds,
          include_hardware,
          delivery_batches!inner(order_id)
        `);
      if (error) throw error;
      
      // Group by order_id - array of batch item details
      const itemsByOrder: Record<string, BatchConstructionItemDetail[]> = {};
      data?.forEach((item: any) => {
        const orderId = item.delivery_batches.order_id;
        if (!itemsByOrder[orderId]) {
          itemsByOrder[orderId] = [];
        }
        itemsByOrder[orderId].push({
          construction_id: item.construction_id,
          order_id: orderId,
          quantity: item.quantity ?? 1,
          include_glass: item.include_glass ?? true,
          include_screens: item.include_screens ?? true,
          include_blinds: item.include_blinds ?? true,
          include_hardware: item.include_hardware ?? true,
        });
      });
      setBatchConstructionItems(itemsByOrder);
    } catch (error) {
      console.error("Error fetching batch construction items:", error);
    }
  };

  const fetchConstructionComponents = async () => {
    try {
      const { data, error } = await supabase
        .from("construction_components")
        .select(`
          construction_id,
          component_type,
          component_name,
          status,
          quantity,
          order_constructions!inner(order_id)
        `);
      if (error) throw error;
      
      // Group by order_id
      const componentsByOrder: Record<string, ConstructionComponent[]> = {};
      data?.forEach((item: any) => {
        const orderId = item.order_constructions.order_id;
        if (!componentsByOrder[orderId]) {
          componentsByOrder[orderId] = [];
        }
        componentsByOrder[orderId].push({
          construction_id: item.construction_id,
          component_type: item.component_type,
          component_name: item.component_name,
          status: item.status,
          quantity: item.quantity,
          order_id: orderId
        });
      });
      setConstructionComponents(componentsByOrder);
    } catch (error) {
      console.error("Error fetching construction components:", error);
    }
  };

  const fetchConstructionManufacturing = async () => {
    try {
      const { data, error } = await supabase
        .from("construction_manufacturing")
        .select(`
          construction_id,
          stage,
          status,
          order_constructions!inner(order_id)
        `);
      if (error) throw error;
      
      // Group by order_id
      const mfgByOrder: Record<string, ConstructionManufacturing[]> = {};
      data?.forEach((item: any) => {
        const orderId = item.order_constructions.order_id;
        if (!mfgByOrder[orderId]) {
          mfgByOrder[orderId] = [];
        }
        mfgByOrder[orderId].push({
          construction_id: item.construction_id,
          stage: item.stage,
          status: item.status,
          order_id: orderId
        });
      });
      setConstructionManufacturing(mfgByOrder);
    } catch (error) {
      console.error("Error fetching construction manufacturing:", error);
    }
  };

  const getOrderDeliveryBatches = (orderId: string) => {
    return deliveryBatches.filter(b => b.order_id === orderId);
  };

  const handleCustomStepStatusChange = async (stepId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("custom_steps")
        .update({ status: newStatus })
        .eq("id", stepId);
      
      if (error) {
        // Check if error is due to order being on hold
        if (error.message?.includes('order is on hold')) {
          toast({
            title: "Order is on hold",
            description: "This order was put on hold. Custom steps cannot be updated. Refreshing...",
            variant: "destructive",
          });
          fetchOrders();
          fetchCustomSteps();
          return;
        }
        throw error;
      }
      
      setCustomSteps(prev => prev.map(step => 
        step.id === stepId ? { ...step, status: newStatus } : step
      ));
      
      toast({
        title: "Status updated",
        description: `Custom step updated to ${newStatus.replace('_', ' ')}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const getCustomOrderingSteps = (orderId: string) => {
    return customSteps.filter(s => s.order_id === orderId && s.step_type === 'ordering');
  };

  const getCustomManufacturingSteps = (orderId: string) => {
    return customSteps.filter(s => s.order_id === orderId && s.step_type === 'manufacturing');
  };

  const handleEditClick = (e: React.MouseEvent, order: Order) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedOrder(order);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, order: Order) => {
    e.preventDefault();
    e.stopPropagation();
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;
    setDeleting(true);
    try {
      // Delete order fulfillment first (if exists)
      await supabase.from("order_fulfillment").delete().eq("order_id", orderToDelete.id);
      
      // Then delete the order
      const { error } = await supabase.from("orders").delete().eq("id", orderToDelete.id);
      if (error) throw error;

      await createAuditLog({
        action: 'order_deleted',
        description: `Deleted order #${orderToDelete.order_number}`,
        entityType: 'order',
        entityId: orderToDelete.id,
      });

      toast({
        title: "Order deleted",
        description: `Order #${orderToDelete.order_number} has been deleted.`,
      });
      fetchOrders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete order",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    }
  };
  const fetchOrders = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("orders").select("*").order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFulfillments = async () => {
    try {
      const { data, error } = await supabase.from("order_fulfillment").select("*");
      if (error) throw error;
      const fulfillmentMap: Record<string, OrderFulfillment> = {};
      data?.forEach((f) => {
        fulfillmentMap[f.order_id] = f;
      });
      setFulfillments(fulfillmentMap);
    } catch (error) {
      console.error("Error fetching fulfillments:", error);
    }
  };

  const getManufacturingStages = (order: Order) => {
    type StageStatus = 'complete' | 'partial' | 'not_started';
    type LockInfo = { isLocked: boolean; lockReason?: string };
    
    // Check if order has construction-level manufacturing data
    const mfgData = constructionManufacturing[order.id];
    const components = constructionComponents[order.id] || [];
    
    // Helper to check component availability from construction_components
    const isComponentAvailable = (componentTypes: string[]): boolean => {
      if (components.length === 0) return false;
      const matchingComponents = components.filter(c => 
        componentTypes.some(type => c.component_type.toLowerCase().includes(type.toLowerCase()))
      );
      if (matchingComponents.length === 0) return true; // No such component needed
      return matchingComponents.every(c => c.status === 'available');
    };
    
    const getComponentLockStatus = (componentTypes: string[], componentName: string): LockInfo => {
      if (components.length === 0) return { isLocked: false }; // No components data, don't lock
      const matchingComponents = components.filter(c => 
        componentTypes.some(type => c.component_type.toLowerCase().includes(type.toLowerCase()))
      );
      if (matchingComponents.length === 0) return { isLocked: false }; // No such component needed
      
      // Changed from allAvailable (every) to anyAvailable (some) - unlock if ANY component is available
      const anyAvailable = matchingComponents.some(c => c.status === 'available');
      if (anyAvailable) return { isLocked: false };
      
      const anyOrdered = matchingComponents.some(c => c.status === 'ordered');
      const statusText = anyOrdered ? 'Ordered' : 'Not Ordered';
      return { isLocked: true, lockReason: `${componentName} ${statusText}` };
    };
    
    // Manufacturing badges ALWAYS use order_fulfillment data (main badges = primary source)
    // Order Map uses construction_manufacturing for per-construction fine-tuning (separate)
    const f = fulfillments[order.id];
    
    const stages: { name: string; status: StageStatus; hasNotes: boolean; field: string; progress?: string; lock?: LockInfo }[] = [];
    
    const getStatus = (value: string | null | undefined): StageStatus => {
      if (value === 'complete') return 'complete';
      if (value === 'partial') return 'partial';
      return 'not_started';
    };
    
    // getLockStatus checks construction_components first, then falls back to legacy order fields
    const getLockStatus = (componentTypes: string[], legacyStatus: string | null | undefined, componentName: string): LockInfo => {
      if (components.length > 0) {
        const matchingComponents = components.filter(c => 
          componentTypes.some(type => c.component_type.toLowerCase().includes(type.toLowerCase()))
        );
        if (matchingComponents.length > 0) {
          const anyAvailable = matchingComponents.some(c => c.status === 'available');
          if (anyAvailable) return { isLocked: false };
          const anyOrdered = matchingComponents.some(c => c.status === 'ordered');
          const statusText = anyOrdered ? 'Ordered' : 'Not Ordered';
          return { isLocked: true, lockReason: `${componentName} ${statusText}` };
        }
      }
      
      if (legacyStatus === 'available') {
        return { isLocked: false };
      }
      const statusText = legacyStatus === 'ordered' ? 'Ordered' : 'Not Ordered';
      return { isLocked: true, lockReason: `${componentName} ${statusText}` };
    };
    
    // Helper to get stage dependency lock status (based on previous stages being complete)
    const getStageDependencyLock = (requiredStages: { status: string | null | undefined; name: string }[]): LockInfo => {
      for (const stage of requiredStages) {
        if (stage.status !== 'complete') {
          return { isLocked: true, lockReason: `${stage.name} Not Complete` };
        }
      }
      return { isLocked: false };
    };
    
    // Combined lock: check stage dependencies first, then component availability
    const getCombinedLock = (
      stageDeps: { status: string | null | undefined; name: string }[],
      componentTypes: string[],
      legacyStatus: string | null | undefined,
      componentName: string
    ): LockInfo => {
      // Check stage dependencies first
      const stageLock = getStageDependencyLock(stageDeps);
      if (stageLock.isLocked) return stageLock;
      
      // Then check component availability
      return getLockStatus(componentTypes, legacyStatus, componentName);
    };
    
    // Reinforcement Cutting - depends on reinforcement_status only
    stages.push({ 
      name: 'Reinforcement Cutting', 
      status: getStatus(f?.reinforcement_cutting), 
      hasNotes: false, 
      field: 'reinforcement_cutting',
      lock: getLockStatus(['reinforcement'], order.reinforcement_status, 'Reinforcement')
    });
    
    // Profile Cutting - depends on windows_profile_status only (independent from reinforcement)
    stages.push({ 
      name: 'Profile Cutting', 
      status: getStatus(f?.profile_cutting), 
      hasNotes: false, 
      field: 'profile_cutting',
      lock: getLockStatus(['profile', 'window_profile'], order.windows_profile_status, 'Profile')
    });
    
    // Frames/Sashes Welded - requires BOTH Reinforcement Cutting complete AND Profile Cutting complete
    const weldingLock = (() => {
      if (f?.reinforcement_cutting !== 'complete') {
        return { isLocked: true, lockReason: 'Reinforcement Not Cut' };
      }
      if (f?.profile_cutting !== 'complete') {
        return { isLocked: true, lockReason: 'Profile Not Cut' };
      }
      return { isLocked: false };
    })();
    stages.push({ 
      name: 'Frames/Sashes Welded', 
      status: getStatus(f?.welding_status), 
      hasNotes: !!(f?.welding_notes), 
      field: 'welding_status',
      lock: weldingLock
    });
    
    // Doors Assembled - requires Welding complete AND Hardware available
    if (order.doors_count && order.doors_count > 0) {
      stages.push({ 
        name: 'Doors Assembled', 
        status: getStatus(f?.doors_status), 
        hasNotes: !!(f?.doors_notes), 
        field: 'doors_status',
        lock: getCombinedLock(
          [{ status: f?.welding_status, name: 'Welding' }],
          ['hardware', 'handle'],
          order.hardware_status,
          'Hardware'
        )
      });
    }
    
    // SLIDING DOORS INDEPENDENT TRACK (when order has sliding doors)
    if (order.has_sliding_doors) {
      // SD Reinforcement Cutting - depends on reinforcement_status only
      stages.push({ 
        name: 'SD Reinf. Cutting', 
        status: getStatus(f?.sliding_doors_reinforcement_cutting), 
        hasNotes: false, 
        field: 'sliding_doors_reinforcement_cutting',
        lock: getLockStatus(['reinforcement'], order.reinforcement_status, 'Reinforcement')
      });
      
      // SD Profile Cutting - depends on sliding_doors_profile_status
      const sdProfileLock = order.sliding_doors_profile_status === 'available' 
        ? { isLocked: false } 
        : { isLocked: true, lockReason: `SD Profile ${order.sliding_doors_profile_status === 'ordered' ? 'Ordered' : 'Not Ordered'}` };
      stages.push({ 
        name: 'SD Profile Cutting', 
        status: getStatus(f?.sliding_doors_profile_cutting), 
        hasNotes: false, 
        field: 'sliding_doors_profile_cutting',
        lock: sdProfileLock
      });
      
      // SD Welded - requires SD Reinforcement Cutting complete AND SD Profile Cutting complete
      const sdWeldingLock = (() => {
        if (f?.sliding_doors_reinforcement_cutting !== 'complete') {
          return { isLocked: true, lockReason: 'SD Reinf. Not Cut' };
        }
        if (f?.sliding_doors_profile_cutting !== 'complete') {
          return { isLocked: true, lockReason: 'SD Profile Not Cut' };
        }
        return { isLocked: false };
      })();
      stages.push({ 
        name: 'SD Welded', 
        status: getStatus(f?.sliding_doors_welding_status), 
        hasNotes: !!(f?.sliding_doors_welding_notes), 
        field: 'sliding_doors_welding_status',
        lock: sdWeldingLock
      });
      
      // SD Assembled - requires SD Welded complete AND SD Hardware available
      const sdHardwareLock = order.sliding_doors_hardware_status === 'available' 
        ? { isLocked: false } 
        : { isLocked: true, lockReason: `SD Hardware ${order.sliding_doors_hardware_status === 'ordered' ? 'Ordered' : 'Not Ordered'}` };
      const sdAssemblyLock = (() => {
        if (f?.sliding_doors_welding_status !== 'complete') {
          return { isLocked: true, lockReason: 'SD Welding Not Complete' };
        }
        if (sdHardwareLock.isLocked) {
          return sdHardwareLock;
        }
        return { isLocked: false };
      })();
      stages.push({ 
        name: 'SD Assembled', 
        status: getStatus(f?.sliding_doors_status), 
        hasNotes: !!(f?.sliding_doors_notes), 
        field: 'sliding_doors_status',
        lock: sdAssemblyLock
      });
      
      // SD Glass Installed - requires SD Assembled complete AND Glass available
      const sdGlassLock = (() => {
        if (f?.sliding_doors_status !== 'complete') {
          return { isLocked: true, lockReason: 'SD Not Assembled' };
        }
        const glassAvail = getLockStatus(['glass'], order.glass_status, 'Glass');
        if (glassAvail.isLocked) return glassAvail;
        return { isLocked: false };
      })();
      stages.push({ 
        name: 'SD Glass Installed', 
        status: f?.sliding_doors_glass_installed ? 'complete' : 'not_started', 
        hasNotes: false, 
        field: 'sliding_doors_glass_installed',
        lock: sdGlassLock
      });
    }
    
    // Frame & Sash Assembled - requires Welding complete AND Hardware available
    stages.push({ 
      name: 'Frame & Sash Assembled', 
      status: getStatus(f?.assembly_status), 
      hasNotes: !!(f?.assembly_notes), 
      field: 'assembly_status',
      lock: getCombinedLock(
        [{ status: f?.welding_status, name: 'Welding' }],
        ['hardware', 'handle'],
        order.hardware_status,
        'Hardware'
      )
    });
    
    // Glass Installed - requires Assembly complete AND Glass available
    stages.push({ 
      name: 'Glass Installed', 
      status: getStatus(f?.glass_status), 
      hasNotes: !!(f?.glass_notes), 
      field: 'glass_status',
      lock: getCombinedLock(
        [{ status: f?.assembly_status, name: 'Frame & Sash Assembly' }],
        ['glass'],
        order.glass_status,
        'Glass'
      )
    });
    
    // Made Screens - depends on screens_status (only if has screens)
    if (order.screen_type) {
      stages.push({ 
        name: 'Made Screens', 
        status: getStatus(f?.screens_cutting), 
        hasNotes: !!(f?.screens_notes), 
        field: 'screens_cutting',
        lock: getLockStatus(['screen'], order.screens_status, 'Screens')
      });
    }
    
    return stages;
  };

  const calculateFulfillmentPercentage = (order: Order) => {
    const f = fulfillments[order.id];
    if (!f) return order.fulfillment_percentage || 0;
    
    let totalSteps = 0;
    let completedSteps = 0;

    const getStatusPoints = (status: string | null | undefined, weight: number) => {
      if (status === 'complete') return weight;
      if (status === 'partial') return weight * 0.5;
      return 0;
    };

    // Reinforcement cutting (weight: 10%)
    totalSteps += 10;
    completedSteps += getStatusPoints(f.reinforcement_cutting, 10);

    // Profile cutting (weight: 10%)
    totalSteps += 10;
    completedSteps += getStatusPoints(f.profile_cutting, 10);

    // Welding (weight: 10%)
    totalSteps += 10;
    completedSteps += getStatusPoints(f.welding_status, 10);

    // Doors assembled (if applicable) (weight: 10%)
    if (order.doors_count && order.doors_count > 0) {
      totalSteps += 10;
      completedSteps += getStatusPoints(f.doors_status, 10);
    }

    // Sliding doors assembled (if applicable) (weight: 10%)
    if (order.has_sliding_doors) {
      totalSteps += 10;
      completedSteps += getStatusPoints(f.sliding_doors_status, 10);
    }

    // Frame/sash assembled (weight: 15%)
    totalSteps += 15;
    completedSteps += getStatusPoints(f.assembly_status, 15);

    // Glass installed (weight: 25%)
    totalSteps += 25;
    completedSteps += getStatusPoints(f.glass_status, 25);

    // Screens (weight: 10%)
    totalSteps += 10;
    completedSteps += getStatusPoints(f.screens_cutting, 10);

    return Math.round(completedSteps / totalSteps * 100);
  };

  const handleStageStatusChange = async (orderId: string, field: string, newStatus: string) => {
    try {
      // Boolean fields in order_fulfillment table that expect true/false, not status strings
      const booleanFields = [
        'sliding_doors_glass_installed',
        'doors_glass_installed',
        'glass_installed',
        'frames_welded',
        'doors_assembled',
        'doors_glass_available',
        'sliding_doors_assembled',
        'sliding_doors_glass_available',
        'frame_sash_assembled',
        'glass_delivered',
        'screens_made',
        'screens_delivered',
        'windows_delivered',
        'doors_delivered',
        'sliding_doors_delivered',
        'screens_delivered_final',
        'handles_delivered',
        'glass_delivered_final',
        'nailing_fins_delivered',
        'brackets_delivered',
        'shipping_handles_boxed',
        'shipping_hinges_covers',
        'shipping_weeping_covers',
        'shipping_spec_labels',
        'shipping_nailing_fins',
        'shipping_brackets',
      ];

      // Convert string status to boolean for boolean columns
      let processedValue: string | boolean = newStatus;
      if (booleanFields.includes(field)) {
        processedValue = newStatus === 'complete' || newStatus === 'partial';
      }

      const { error } = await supabase
        .from("order_fulfillment")
        .update({ [field]: processedValue })
        .eq("order_id", orderId);
      
      if (error) {
        // Check if error is due to order being on hold
        if (error.message?.includes('order is on hold')) {
          toast({
            title: "Order is on hold",
            description: "This order was put on hold. Manufacturing stages cannot be updated. Refreshing...",
            variant: "destructive",
          });
          fetchOrders();
          return;
        }
        throw error;
      }
      
      // When Glass Installed is set to complete, update ALL constructions to glass_installation = complete
      if (field === 'glass_status' && newStatus === 'complete') {
        // Get all constructions for this order
        const { data: constructions } = await supabase
          .from("order_constructions")
          .select("id")
          .eq("order_id", orderId);
        
        if (constructions && constructions.length > 0) {
          const constructionIds = constructions.map(c => c.id);
          
          // Upsert glass_installation = complete for all constructions
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
      
      // Update local state with the correct value type
      setFulfillments(prev => ({
        ...prev,
        [orderId]: {
          ...prev[orderId],
          [field]: processedValue
        }
      }));
      
      toast({
        title: "Status updated",
        description: `Stage updated to ${newStatus.replace('_', ' ')}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };
  const getDaysUntilDelivery = (deliveryDate: string) => {
    const delivery = new Date(deliveryDate);
    const now = new Date();
    return Math.ceil((delivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };
  const getTimePercentage = (orderDate: string, deliveryDate: string) => {
    const order = new Date(orderDate);
    const delivery = new Date(deliveryDate);
    const now = new Date();
    const total = delivery.getTime() - order.getTime();
    const elapsed = now.getTime() - order.getTime();
    const remaining = Math.max(0, Math.min(100, 100 - elapsed / total * 100));
    return remaining;
  };

  const componentFieldMap: Record<string, string> = {
    'Reinforcement': 'reinforcement_status',
    'Windows Profile': 'windows_profile_status',
    'Glass': 'glass_status',
    'Screens': 'screens_status',
    'Plisse Screens': 'plisse_screens_status',
    'Nail Fins': 'nail_fins_status',
    'Hardware': 'hardware_status',
  };

  type ComponentInfo = { 
    name: string; 
    field: string; 
    isFileExtracted: boolean;
    componentType?: string;
    componentName?: string | null;
  };

  const getNotOrderedComponents = (order: Order): ComponentInfo[] => {
    // Check if order has file-extracted components
    const fileComponents = constructionComponents[order.id];
    
    if (fileComponents && fileComponents.length > 0) {
      // Aggregate file-extracted components by type+name and filter by status
      const aggregated = new Map<string, { name: string; quantity: number; componentType: string; componentName: string | null }>();
      fileComponents.filter(c => c.status === 'not_ordered').forEach(c => {
        const key = `${c.component_type}-${c.component_name || ''}`;
        const displayName = c.component_name 
          ? `${c.component_type} (${c.component_name})`
          : c.component_type;
        if (aggregated.has(key)) {
          aggregated.get(key)!.quantity += c.quantity;
        } else {
          aggregated.set(key, { name: displayName, quantity: c.quantity, componentType: c.component_type, componentName: c.component_name });
        }
      });
      
      // Always add Reinforcement from legacy if not_ordered (not file-extracted)
      const components: ComponentInfo[] = [];
      if (order.reinforcement_status === 'not_ordered') {
        components.push({ name: 'Reinforcement', field: 'reinforcement_status', isFileExtracted: false });
      }
      
      // Add file-extracted components
      aggregated.forEach((value) => {
        components.push({ 
          name: value.name, 
          field: '', 
          isFileExtracted: true,
          componentType: value.componentType,
          componentName: value.componentName
        });
      });
      
      return components;
    }
    
    // Fall back to legacy order-level fields
    const components: ComponentInfo[] = [];
    if (order.reinforcement_status === 'not_ordered') components.push({ name: 'Reinforcement', field: 'reinforcement_status', isFileExtracted: false });
    if (order.windows_profile_status === 'not_ordered') components.push({ name: 'Windows Profile', field: 'windows_profile_status', isFileExtracted: false });
    if (order.glass_status === 'not_ordered') components.push({ name: 'Glass', field: 'glass_status', isFileExtracted: false });
    if (order.hardware_status === 'not_ordered') components.push({ name: 'Hardware', field: 'hardware_status', isFileExtracted: false });
    if (order.screen_type && order.screens_status === 'not_ordered') components.push({ name: 'Screens', field: 'screens_status', isFileExtracted: false });
    if (order.has_plisse_screens && order.plisse_screens_status === 'not_ordered') components.push({ name: 'Plisse Screens', field: 'plisse_screens_status', isFileExtracted: false });
    if (order.has_nailing_flanges && order.nail_fins_status === 'not_ordered') components.push({ name: 'Nail Fins', field: 'nail_fins_status', isFileExtracted: false });
    return components;
  };

  const getOrderedComponents = (order: Order): ComponentInfo[] => {
    // Check if order has file-extracted components
    const fileComponents = constructionComponents[order.id];
    
    if (fileComponents && fileComponents.length > 0) {
      // Aggregate file-extracted components by type+name and filter by status
      const aggregated = new Map<string, { name: string; quantity: number; componentType: string; componentName: string | null }>();
      fileComponents.filter(c => c.status === 'ordered').forEach(c => {
        const key = `${c.component_type}-${c.component_name || ''}`;
        const displayName = c.component_name 
          ? `${c.component_type} (${c.component_name})`
          : c.component_type;
        if (aggregated.has(key)) {
          aggregated.get(key)!.quantity += c.quantity;
        } else {
          aggregated.set(key, { name: displayName, quantity: c.quantity, componentType: c.component_type, componentName: c.component_name });
        }
      });
      
      // Always add Reinforcement from legacy if ordered (not file-extracted)
      const components: ComponentInfo[] = [];
      if (order.reinforcement_status === 'ordered') {
        components.push({ name: 'Reinforcement', field: 'reinforcement_status', isFileExtracted: false });
      }
      
      // Add file-extracted components
      aggregated.forEach((value) => {
        components.push({ 
          name: value.name, 
          field: '', 
          isFileExtracted: true,
          componentType: value.componentType,
          componentName: value.componentName
        });
      });
      
      return components;
    }
    
    // Fall back to legacy order-level fields
    const components: ComponentInfo[] = [];
    if (order.reinforcement_status === 'ordered') components.push({ name: 'Reinforcement', field: 'reinforcement_status', isFileExtracted: false });
    if (order.windows_profile_status === 'ordered') components.push({ name: 'Windows Profile', field: 'windows_profile_status', isFileExtracted: false });
    if (order.glass_status === 'ordered') components.push({ name: 'Glass', field: 'glass_status', isFileExtracted: false });
    if (order.hardware_status === 'ordered') components.push({ name: 'Hardware', field: 'hardware_status', isFileExtracted: false });
    if (order.screen_type && order.screens_status === 'ordered') components.push({ name: 'Screens', field: 'screens_status', isFileExtracted: false });
    if (order.has_plisse_screens && order.plisse_screens_status === 'ordered') components.push({ name: 'Plisse Screens', field: 'plisse_screens_status', isFileExtracted: false });
    if (order.has_nailing_flanges && order.nail_fins_status === 'ordered') components.push({ name: 'Nail Fins', field: 'nail_fins_status', isFileExtracted: false });
    return components;
  };

  const getAvailableComponents = (order: Order): ComponentInfo[] => {
    // Check if order has file-extracted components
    const fileComponents = constructionComponents[order.id];
    
    if (fileComponents && fileComponents.length > 0) {
      // Aggregate file-extracted components by type+name and filter by status
      const aggregated = new Map<string, { name: string; quantity: number; componentType: string; componentName: string | null }>();
      fileComponents.filter(c => c.status === 'available').forEach(c => {
        const key = `${c.component_type}-${c.component_name || ''}`;
        const displayName = c.component_name 
          ? `${c.component_type} (${c.component_name})`
          : c.component_type;
        if (aggregated.has(key)) {
          aggregated.get(key)!.quantity += c.quantity;
        } else {
          aggregated.set(key, { name: displayName, quantity: c.quantity, componentType: c.component_type, componentName: c.component_name });
        }
      });
      
      // Always add Reinforcement from legacy if available (not file-extracted)
      const components: ComponentInfo[] = [];
      if (order.reinforcement_status === 'available') {
        components.push({ name: 'Reinforcement', field: 'reinforcement_status', isFileExtracted: false });
      }
      
      // Add file-extracted components
      aggregated.forEach((value) => {
        components.push({ 
          name: value.name, 
          field: '', 
          isFileExtracted: true,
          componentType: value.componentType,
          componentName: value.componentName
        });
      });
      
      return components;
    }
    
    return [];
  };

  const handleProductionStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      const updateData: { production_status: string; hold_started_at: string | null } = {
        production_status: newStatus,
        hold_started_at: newStatus === 'hold' ? new Date().toISOString() : null,
      };
      
      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);
      
      if (error) throw error;
      
      // Update local state
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, ...updateData } : o
      ));
      
      await createAuditLog({
        action: 'order_updated',
        description: `Changed production status from "${order?.production_status || 'hold'}" to "${newStatus}" on order #${order?.order_number}`,
        entityType: 'order',
        entityId: orderId,
      });
      
      toast({
        title: "Status updated",
        description: newStatus === 'production_ready' ? "Order is now ready for production" : "Order placed on hold",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handlePriorityToggle = async (orderId: string, isPriority: boolean) => {
    try {
      const order = orders.find(o => o.id === orderId);
      
      const { error } = await supabase
        .from("orders")
        .update({ is_priority: isPriority })
        .eq("id", orderId);
      
      if (error) throw error;
      
      // Update local state
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, is_priority: isPriority } : o
      ));
      
      await createAuditLog({
        action: 'order_updated',
        description: `${isPriority ? 'Set' : 'Removed'} priority on order #${order?.order_number}`,
        entityType: 'order',
        entityId: orderId,
      });
      
      toast({
        title: isPriority ? "Priority set" : "Priority removed",
        description: isPriority ? "Order will appear at the top of the list" : "Order priority removed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update priority",
        variant: "destructive",
      });
    }
  };

  const getDaysOnHold = (holdStartedAt: string | null): number => {
    if (!holdStartedAt) return 0;
    const holdDate = new Date(holdStartedAt);
    const now = new Date();
    return Math.floor((now.getTime() - holdDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Order status helpers
  const getCurrentOrderStatus = (order: Order): string => {
    if (order.delivery_complete) return 'finished';
    if (order.production_status === 'hold') return 'on_hold';
    return 'active';
  };

  const getCurrentStatusLabel = (order: Order): string => {
    const status = getCurrentOrderStatus(order);
    switch (status) {
      case 'finished': return 'Finished';
      case 'on_hold': return 'On Hold';
      default: return 'Active';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'finished': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'on_hold': return <Pause className="h-4 w-4 text-amber-500" />;
      default: return <PlayCircle className="h-4 w-4 text-success" />;
    }
  };

  const handleOrderStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const updates: Record<string, any> = {};
      
      switch (newStatus) {
        case 'active':
          updates.delivery_complete = false;
          updates.production_status = 'production_ready';
          updates.hold_started_at = null;
          break;
        case 'on_hold':
          updates.delivery_complete = false;
          updates.production_status = 'hold';
          updates.hold_started_at = new Date().toISOString();
          break;
        case 'finished':
          updates.delivery_complete = true;
          updates.production_status = 'production_ready';
          updates.hold_started_at = null;
          break;
      }
      
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);
        
      if (error) throw error;
      
      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, ...updates }
          : order
      ));
      
      const statusLabels: Record<string, string> = {
        'active': 'Active',
        'on_hold': 'On Hold',
        'finished': 'Finished'
      };
      
      toast({
        title: "Status updated",
        description: `Order status changed to ${statusLabels[newStatus]}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const handleComponentStatusChange = async (orderId: string, field: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ [field]: newStatus })
        .eq("id", orderId);
      
      if (error) throw error;
      
      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, [field]: newStatus }
          : order
      ));
      
      toast({
        title: "Status updated",
        description: `Component updated to ${newStatus.replace('_', ' ')}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleFileComponentStatusChange = async (
    orderId: string, 
    componentType: string, 
    componentName: string | null, 
    newStatus: string
  ) => {
    try {
      // Get all construction IDs for this order
      const { data: constructions } = await supabase
        .from("order_constructions")
        .select("id")
        .eq("order_id", orderId);
      
      if (!constructions || constructions.length === 0) {
        toast({
          title: "Error",
          description: "No constructions found for this order",
          variant: "destructive",
        });
        return;
      }
      
      const constructionIds = constructions.map(c => c.id);
      
      // Update all matching components
      let updateQuery = supabase
        .from("construction_components")
        .update({ status: newStatus })
        .in("construction_id", constructionIds)
        .eq("component_type", componentType);
      
      if (componentName) {
        updateQuery = updateQuery.eq("component_name", componentName);
      } else {
        updateQuery = updateQuery.is("component_name", null);
      }
      
      const { error } = await updateQuery;
      if (error) throw error;
      
      // Refresh construction components to update UI
      await fetchConstructionComponents();
      
      toast({
        title: "Status updated",
        description: `${componentType} updated to ${newStatus.replace('_', ' ')}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const DELIVERY_ITEMS = [
    { key: 'windows_delivered', label: 'Windows' },
    { key: 'doors_delivered', label: 'Doors' },
    { key: 'sliding_doors_delivered', label: 'Sliding Doors' },
    { key: 'glass_delivered_final', label: 'Glass' },
    { key: 'screens_delivered_final', label: 'Screens' },
    { key: 'handles_delivered', label: 'Handles' },
    { key: 'nailing_fins_delivered', label: 'Nailing Fins' },
    { key: 'brackets_delivered', label: 'Brackets' },
  ] as const;

  const getDeliveryProgress = (order: Order) => {
    const f = fulfillments[order.id];
    if (!f) return { delivered: 0, total: 8, pending: [] as string[] };
    
    const applicableItems = DELIVERY_ITEMS.filter(item => {
      if (item.key === 'sliding_doors_delivered' && !order.has_sliding_doors) return false;
      if (item.key === 'screens_delivered_final' && !order.screen_type) return false;
      return true;
    });

    const pending: string[] = [];
    let delivered = 0;
    
    applicableItems.forEach(item => {
      if ((f as any)[item.key] === true) {
        delivered++;
      } else {
        pending.push(item.label);
      }
    });

    return { delivered, total: applicableItems.length, pending };
  };

  const SHIPPING_PREP_ITEMS = [
    { key: 'shipping_handles_boxed', label: 'Handles' },
    { key: 'shipping_hinges_covers', label: 'Hinges' },
    { key: 'shipping_weeping_covers', label: 'Weeping' },
    { key: 'shipping_spec_labels', label: 'Labels' },
    { key: 'shipping_nailing_fins', label: 'Fins' },
    { key: 'shipping_brackets', label: 'Brackets' },
  ] as const;

  const getShippingPrepProgress = (order: Order) => {
    const f = fulfillments[order.id];
    if (!f) return { prepared: 0, total: 6, pending: SHIPPING_PREP_ITEMS.map(i => i.label) };
    
    const pending: string[] = [];
    let prepared = 0;
    SHIPPING_PREP_ITEMS.forEach(item => {
      if ((f as any)[item.key] === true) {
        prepared++;
      } else {
        pending.push(item.label);
      }
    });

    return { prepared, total: SHIPPING_PREP_ITEMS.length, pending };
  };

  // Helper to get remaining constructions not yet assigned to any delivery batch
  // Also tracks item categories (screens, blinds, glass, hardware) that were excluded from batches
  // Now supports partial quantities - calculates remaining based on shipped quantities across all batches
  const getRemainingToShip = (orderId: string) => {
    const constructions = orderConstructions[orderId] || [];
    const batchItems = batchConstructionItems[orderId] || [];
    
    // Calculate total shipped quantity per construction (sum across all batches)
    const shippedQuantities: Record<string, number> = {};
    batchItems.forEach(bi => {
      shippedQuantities[bi.construction_id] = (shippedQuantities[bi.construction_id] || 0) + (bi.quantity || 1);
    });
    
    // Track remaining quantities and partially shipped items
    const partiallyShipped: { constructionNumber: string; remaining: number; type: string }[] = [];
    let windowsCount = 0;
    let doorsCount = 0;
    let slidingDoorsCount = 0;
    const unassignedNumbers: string[] = [];
    
    constructions.forEach(c => {
      const shipped = shippedQuantities[c.construction_id] || 0;
      const remaining = c.quantity - shipped;
      
      if (remaining > 0) {
        // Add to remaining counts
        if (c.construction_type === 'window') {
          windowsCount += remaining;
        } else if (c.construction_type === 'door') {
          doorsCount += remaining;
        } else if (c.construction_type === 'sliding_door') {
          slidingDoorsCount += remaining;
        }
        
        // Track if fully unassigned or partially shipped
        if (shipped === 0) {
          unassignedNumbers.push(c.construction_number);
        } else {
          // Partially shipped - show how many remain
          partiallyShipped.push({ 
            constructionNumber: c.construction_number, 
            remaining, 
            type: c.construction_type 
          });
        }
      }
    });
    
    // Find item categories excluded from assigned batches
    // Group by construction to avoid duplicates when same construction is in multiple batches
    const excludedItemsMap: Record<string, Set<string>> = {};
    
    constructions.forEach(c => {
      // Get all batch items for this construction
      const constructionBatchItems = batchItems.filter(bi => bi.construction_id === c.construction_id);
      
      if (constructionBatchItems.length > 0) {
        // Check if ANY batch item excluded each category
        // (If any batch excluded it, it's still missing for that batch)
        const excludedSet = new Set<string>();
        
        constructionBatchItems.forEach(batchItem => {
          // Check if screens were excluded but construction has screens
          if (!batchItem.include_screens && c.screen_type) {
            excludedSet.add('Screens');
          }
          // Check if blinds were excluded but construction has blinds
          if (!batchItem.include_blinds && c.has_blinds) {
            excludedSet.add('Blinds');
          }
          // Glass is always relevant - if excluded, it's missing
          if (!batchItem.include_glass) {
            excludedSet.add('Glass');
          }
          // Hardware is always relevant - if excluded, it's missing
          if (!batchItem.include_hardware) {
            excludedSet.add('Hardware');
          }
        });
        
        if (excludedSet.size > 0) {
          excludedItemsMap[c.construction_number] = excludedSet;
        }
      }
    });
    
    const excludedItems = Object.entries(excludedItemsMap).map(([constructionNumber, items]) => ({
      constructionNumber,
      items: Array.from(items)
    }));
    
    const hasRemaining = windowsCount > 0 || doorsCount > 0 || slidingDoorsCount > 0 || excludedItems.length > 0;
    
    return {
      windowsCount,
      doorsCount,
      slidingDoorsCount,
      unassignedNumbers,
      partiallyShipped,
      excludedItems,
      hasRemaining,
      totalRemaining: windowsCount + doorsCount + slidingDoorsCount
    };
  };

  // Helper function to check if order needs a specific component to be ordered
  const orderNeedsComponent = (order: Order, componentType: string): boolean => {
    const fileComponents = constructionComponents[order.id];
    
    // Check file-extracted components first
    if (fileComponents && fileComponents.length > 0) {
      const hasNotOrdered = fileComponents.some(c => 
        c.component_type.toLowerCase() === componentType.toLowerCase() && 
        c.status === 'not_ordered'
      );
      if (hasNotOrdered) return true;
    }
    
    // Fall back to legacy order-level fields
    switch(componentType.toLowerCase()) {
      case 'reinforcement': return order.reinforcement_status === 'not_ordered';
      case 'glass': return order.glass_status === 'not_ordered';
      case 'profile': return order.windows_profile_status === 'not_ordered';
      case 'screens': return !!order.screen_type && order.screens_status === 'not_ordered';
      case 'hardware': return order.hardware_status === 'not_ordered';
      case 'nail_fins': return !!order.has_nailing_flanges && order.nail_fins_status === 'not_ordered';
      case 'plisse': return !!order.has_plisse_screens && order.plisse_screens_status === 'not_ordered';
      case 'blinds': return fileComponents?.some(c => c.component_type.toLowerCase() === 'blinds' && c.status === 'not_ordered') || false;
      default: return false;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) || order.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeller = sellerFilter === "all" || order.user_id === sellerFilter;
    
    if (!matchesSeller) return false;
    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "on_hold") return matchesSearch && order.production_status === 'hold';
    if (statusFilter === "production_ready") return matchesSearch && order.production_status === 'production_ready';
    if (statusFilter === "complete") return matchesSearch && order.fulfillment_percentage >= 90;
    
    // Component "Needs Ordering" filters
    if (statusFilter === "needs_reinforcement") return matchesSearch && orderNeedsComponent(order, 'reinforcement');
    if (statusFilter === "needs_glass") return matchesSearch && orderNeedsComponent(order, 'glass');
    if (statusFilter === "needs_profile") return matchesSearch && orderNeedsComponent(order, 'profile');
    if (statusFilter === "needs_screens") return matchesSearch && orderNeedsComponent(order, 'screens');
    if (statusFilter === "needs_hardware") return matchesSearch && orderNeedsComponent(order, 'hardware');
    if (statusFilter === "needs_nail_fins") return matchesSearch && orderNeedsComponent(order, 'nail_fins');
    if (statusFilter === "needs_plisse") return matchesSearch && orderNeedsComponent(order, 'plisse');
    if (statusFilter === "needs_blinds") return matchesSearch && orderNeedsComponent(order, 'blinds');
    
    return matchesSearch;
  });
  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading orders...</div>
      </div>;
  }
  return <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Manage manufacturing orders</p>
        </div>
        <Link to="/orders/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Order
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by order number or customer..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel className="text-xs text-muted-foreground">Status</SelectLabel>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="production_ready">Production Ready</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel className="text-xs text-muted-foreground">Needs Ordering</SelectLabel>
                  <SelectItem value="needs_reinforcement">Reinforcement</SelectItem>
                  <SelectItem value="needs_glass">Glass</SelectItem>
                  <SelectItem value="needs_profile">Profile</SelectItem>
                  <SelectItem value="needs_screens">Screens</SelectItem>
                  <SelectItem value="needs_hardware">Hardware</SelectItem>
                  <SelectItem value="needs_nail_fins">Nail Fins</SelectItem>
                  <SelectItem value="needs_plisse">Plisse Screens</SelectItem>
                  <SelectItem value="needs_blinds">Blinds</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            {(isAdmin || isManager || isWorker) && Object.keys(sellers).length > 0 && (
              <Select value={sellerFilter} onValueChange={setSellerFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by seller" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sellers</SelectItem>
                  {Object.entries(sellers).map(([id, seller]) => (
                    <SelectItem key={id} value={id}>
                      {seller.full_name || seller.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Clock className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time_left_asc">Time Left (Urgent First)</SelectItem>
                <SelectItem value="time_left_desc">Time Left (Most Time)</SelectItem>
                <SelectItem value="order_date_desc">Order Date (Newest)</SelectItem>
                <SelectItem value="order_date_asc">Order Date (Oldest)</SelectItem>
                <SelectItem value="fulfillment_asc">Fulfillment (Low to High)</SelectItem>
                <SelectItem value="fulfillment_desc">Fulfillment (High to Low)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="active" className="gap-2">
                <Wrench className="h-4 w-4" />
                Active Orders
                <Badge variant="secondary" className="ml-1">
                  {filteredOrders.filter(o => !o.delivery_complete).length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="finished" className="gap-2">
                <Archive className="h-4 w-4" />
                Finished Orders
                <Badge variant="secondary" className="ml-1">
                  {filteredOrders.filter(o => o.delivery_complete).length}
                </Badge>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="active">
          {(() => {
            // Sort orders helper
            const sortOrders = (ordersToSort: Order[]) => [...ordersToSort].sort((a, b) => {
              // Priority orders always come first
              if (a.is_priority && !b.is_priority) return -1;
              if (!a.is_priority && b.is_priority) return 1;
              
              // Then apply the selected sort
              switch (sortBy) {
                case 'time_left_asc':
                  return getDaysUntilDelivery(a.delivery_date) - getDaysUntilDelivery(b.delivery_date);
                case 'time_left_desc':
                  return getDaysUntilDelivery(b.delivery_date) - getDaysUntilDelivery(a.delivery_date);
                case 'order_date_asc':
                  return new Date(a.order_date).getTime() - new Date(b.order_date).getTime();
                case 'order_date_desc':
                  return new Date(b.order_date).getTime() - new Date(a.order_date).getTime();
                case 'fulfillment_asc':
                  return (a.fulfillment_percentage || 0) - (b.fulfillment_percentage || 0);
                case 'fulfillment_desc':
                  return (b.fulfillment_percentage || 0) - (a.fulfillment_percentage || 0);
                default:
                  return 0;
              }
            });
            
            // Split orders by delivery status
            const activeOrders = sortOrders(filteredOrders.filter(o => !o.delivery_complete));
            const finishedOrders = sortOrders(filteredOrders.filter(o => o.delivery_complete));
            
            // Render orders list helper
            const renderOrdersList = (ordersList: Order[], emptyMessage: string) => {
              if (ordersList.length === 0) {
                return (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>{emptyMessage}</p>
                    {orders.length === 0 && <Link to="/orders/new">
                        <Button variant="link" className="mt-2">Create your first order</Button>
                      </Link>}
                  </div>
                );
              }
              
              return (
                <div className="space-y-3">
                  {ordersList.map(order => {
            const daysUntil = getDaysUntilDelivery(order.delivery_date);
            const timeLeft = getTimePercentage(order.order_date, order.delivery_date);
            const notOrderedComponents = getNotOrderedComponents(order);
            const orderedComponents = getOrderedComponents(order);
            const availableComponents = getAvailableComponents(order);
            const manufacturingStages = getManufacturingStages(order);
            const customOrderingSteps = getCustomOrderingSteps(order.id);
            const customManufacturingSteps = getCustomManufacturingSteps(order.id);
            const remainingToShip = getRemainingToShip(order.id);
            const orderBatches = getOrderDeliveryBatches(order.id);
            const shippedBatches = orderBatches.filter(b => b.status === 'shipped').length;
            const preparingBatches = orderBatches.filter(b => b.status === 'preparing').length;
            const showRemainingToShip = ordersWithConstructions.has(order.id);
            const hasFileExtractedData = ordersWithConstructions.has(order.id);
            return <div key={order.id} id={`order-${order.id}`} className={`relative block p-4 rounded-lg border bg-card transition-colors ${(isAdmin || isManager) ? 'hover:bg-muted/50 cursor-pointer' : ''}`} onClick={() => (isAdmin || isManager) && navigate(`/orders/${order.id}`)}>
                    {/* Priority triangle indicator */}
                    {order.is_priority && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-l-[28px] border-l-transparent border-t-[28px] border-t-yellow-500 rounded-tr-lg" />
                    )}
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          {/* Priority toggle button */}
                          {(isAdmin || isManager) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePriorityToggle(order.id, !order.is_priority);
                              }}
                              className="shrink-0 hover:scale-110 transition-transform"
                              title={order.is_priority ? "Remove priority" : "Set as priority"}
                            >
                              <Star className={`h-5 w-5 ${order.is_priority ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`} />
                            </button>
                          )}
                          <span className="font-mono text-sm font-semibold bg-muted px-2 py-1 rounded">
                            #{order.order_number}
                          </span>
                          <span className="font-medium truncate">
                            {order.customer_name}
                          </span>
                          {/* Production Status Badge */}
                          {(isAdmin || isManager) ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProductionStatusChange(
                                  order.id,
                                  order.production_status === 'hold' ? 'production_ready' : 'hold'
                                );
                              }}
                              className="shrink-0"
                            >
                              {order.production_status === 'hold' ? (
                              <Badge variant="outline" className="gap-1 text-xs border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer transition-colors">
                                  <Pause className="h-3 w-3" />
                                  On Hold ({getDaysOnHold(order.hold_started_at)}d)
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1 text-xs border-success/50 text-success hover:bg-success/10 cursor-pointer transition-colors">
                                  <PlayCircle className="h-3 w-3" />
                                  Production Ready
                                </Badge>
                              )}
                            </button>
                          ) : (
                            order.production_status === 'hold' ? (
                            <Badge variant="outline" className="gap-1 text-xs border-amber-500/50 text-amber-600 dark:text-amber-400 shrink-0">
                                <Pause className="h-3 w-3" />
                                On Hold ({getDaysOnHold(order.hold_started_at)}d)
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-xs border-success/50 text-success shrink-0">
                                <PlayCircle className="h-3 w-3" />
                                Production Ready
                              </Badge>
                            )
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span className={fulfillments[order.id]?.glass_status === 'complete' ? 'text-success font-medium' : 'text-destructive font-medium'}>
                            {order.windows_count} Windows
                          </span>
                          <span>•</span>
                          <span className={fulfillments[order.id]?.doors_glass_installed ? 'text-success font-medium' : 'text-destructive font-medium'}>
                            {order.doors_count} Doors
                          </span>
                          {order.sliding_doors_count > 0 && <>
                              <span>•</span>
                              <span className={fulfillments[order.id]?.sliding_doors_glass_installed ? 'text-success font-medium' : 'text-destructive font-medium'}>
                                {order.sliding_doors_count} Sliding
                              </span>
                            </>}
                          {/* Show assigned seller for admin/manager/worker */}
                          {(isAdmin || isManager || isWorker) && order.user_id && sellers[order.user_id] && (
                            <>
                              <span>•</span>
                              <span className="text-primary font-medium">
                                {sellers[order.user_id].full_name || sellers[order.user_id].email}
                              </span>
                            </>
                          )}
                        </div>
                        {/* Ordering stages - show for non-workers, editable only for admin/manager (legacy only) */}
                        {!isWorker && notOrderedComponents.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                            <span className="text-xs text-destructive font-medium mr-1">Needs ordering:</span>
                            {notOrderedComponents.map((component) => {
                              const orderingTrackingInfo = formatTrackingInfo(order.ordering_updated_at, order.ordering_updated_by_email);
                              
                              // File-extracted components - editable with popover + cart option
                              if (component.isFileExtracted) {
                                const componentType = component.componentType || 'unknown';
                                const componentDisplayName = component.componentName ?? null;
                                const inCart = isInCart(order.id, componentType, componentDisplayName);
                                
                                const handleAddToCartClick = async () => {
                                  if (inCart) return;
                                  await addToCart({
                                    orderId: order.id,
                                    orderNumber: order.order_number,
                                    customerName: order.customer_name,
                                    componentType,
                                    componentName: componentDisplayName,
                                    quantity: 1,
                                    isFileExtracted: true,
                                  });
                                };
                                
                                // Badge styling based on cart status
                                const badgeContent = inCart ? (
                                  <Badge className="text-xs py-0 px-1.5 cursor-pointer hover:opacity-80 transition-opacity bg-yellow-400 text-black border-yellow-500 hover:bg-yellow-300 flex items-center gap-1">
                                    <ShoppingCart className="h-3 w-3" />
                                    {component.name}
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-xs py-0 px-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                                    {component.name}
                                  </Badge>
                                );
                                
                                return (canUpdateOrdering && !isSeller) ? (
                                  <Popover key={component.name}>
                                    <PopoverTrigger asChild>
                                      <button onClick={(e) => e.stopPropagation()} type="button">
                                        {badgeContent}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-36 p-0" align="start">
                                      <StatusPopoverButtons
                                        currentValue="not_ordered"
                                        options={orderingPopoverOptions}
                                        onChange={(value) => handleFileComponentStatusChange(order.id, component.componentType!, component.componentName ?? null, value)}
                                        onAddToCart={handleAddToCartClick}
                                        isInCart={inCart}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                ) : (
                                  <Popover key={component.name}>
                                    <PopoverTrigger asChild>
                                      <button onClick={(e) => e.stopPropagation()} type="button">
                                        {badgeContent}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-36 p-0" align="start">
                                      <StatusPopoverButtons
                                        currentValue="not_ordered"
                                        options={orderingPopoverOptions}
                                        onChange={() => {}}
                                        onAddToCart={handleAddToCartClick}
                                        isInCart={inCart}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                );
                              }
                              
                              const componentType = component.field?.replace('_status', '') || 'unknown';
                              const inCart = isInCart(order.id, componentType, null);
                              
                              const handleAddToCartClick = async () => {
                                if (inCart) return;
                                await addToCart({
                                  orderId: order.id,
                                  orderNumber: order.order_number,
                                  customerName: order.customer_name,
                                  componentType,
                                  componentName: null,
                                  quantity: 1,
                                  isFileExtracted: false,
                                });
                              };
                              
                              // Badge styling based on cart status for legacy components
                              const legacyBadgeContent = inCart ? (
                                <Badge className="text-xs py-0 px-1.5 cursor-pointer hover:opacity-80 transition-opacity bg-yellow-400 text-black border-yellow-500 hover:bg-yellow-300 flex items-center gap-1">
                                  <ShoppingCart className="h-3 w-3" />
                                  {component.name}
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs py-0 px-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                                  {component.name}
                                </Badge>
                              );
                              
                              return (canUpdateOrdering && !isSeller && component.field) ? (
                                <Popover key={component.name}>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <PopoverTrigger asChild>
                                        <TooltipTrigger asChild>
                                          <button onClick={(e) => e.stopPropagation()} type="button">
                                            {legacyBadgeContent}
                                          </button>
                                        </TooltipTrigger>
                                      </PopoverTrigger>
                                      {orderingTrackingInfo && (
                                        <TooltipContent className="whitespace-pre-line">
                                          <p>{orderingTrackingInfo}</p>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TooltipProvider>
                                  <PopoverContent className="w-36 p-0" align="start">
                                    <StatusPopoverButtons
                                      currentValue="not_ordered"
                                      options={orderingPopoverOptions}
                                      onChange={(value) => handleComponentStatusChange(order.id, component.field, value)}
                                      onAddToCart={handleAddToCartClick}
                                      isInCart={inCart}
                                    />
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <Popover key={component.name}>
                                  <PopoverTrigger asChild>
                                    <button onClick={(e) => e.stopPropagation()} type="button">
                                      {legacyBadgeContent}
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-36 p-0" align="start">
                                    <StatusPopoverButtons
                                      currentValue="not_ordered"
                                      options={orderingPopoverOptions}
                                      onChange={() => {}}
                                      onAddToCart={handleAddToCartClick}
                                      isInCart={inCart}
                                    />
                                  </PopoverContent>
                                </Popover>
                              );
                            })}
                          </div>
                        )}
                        {!isWorker && orderedComponents.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium mr-1">Ordered:</span>
                            {orderedComponents.map((component) => {
                              const orderingTrackingInfo = formatTrackingInfo(order.ordering_updated_at, order.ordering_updated_by_email);
                              
                              // File-extracted components - editable with popover
                              if (component.isFileExtracted) {
                                return (canUpdateOrdering && !isSeller) ? (
                                  <Popover key={component.name}>
                                    <PopoverTrigger asChild>
                                      <button onClick={(e) => e.stopPropagation()} type="button">
                                        <Badge variant="outline" className="text-xs py-0 px-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400 cursor-pointer hover:opacity-80 transition-opacity">
                                          {component.name}
                                        </Badge>
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-36 p-0" align="start">
                                      <StatusPopoverButtons
                                        currentValue="ordered"
                                        options={orderingPopoverOptions}
                                        onChange={(value) => handleFileComponentStatusChange(order.id, component.componentType!, component.componentName ?? null, value)}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                ) : (
                                  <Badge key={component.name} variant="outline" className="text-xs py-0 px-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400">
                                    {component.name}
                                  </Badge>
                                );
                              }
                              
                              return (canUpdateOrdering && !isSeller && component.field) ? (
                                <Popover key={component.name}>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <PopoverTrigger asChild>
                                        <TooltipTrigger asChild>
                                          <button onClick={(e) => e.stopPropagation()} type="button">
                                            <Badge variant="outline" className="text-xs py-0 px-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400 cursor-pointer hover:opacity-80 transition-opacity">
                                              {component.name}
                                            </Badge>
                                          </button>
                                        </TooltipTrigger>
                                      </PopoverTrigger>
                                      {orderingTrackingInfo && (
                                        <TooltipContent className="whitespace-pre-line">
                                          <p>{orderingTrackingInfo}</p>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TooltipProvider>
                                  <PopoverContent className="w-36 p-0" align="start">
                                    <StatusPopoverButtons
                                      currentValue="ordered"
                                      options={orderingPopoverOptions}
                                      onChange={(value) => handleComponentStatusChange(order.id, component.field, value)}
                                    />
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <TooltipProvider key={component.name}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="outline" className="text-xs py-0 px-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400">
                                        {component.name}
                                      </Badge>
                                    </TooltipTrigger>
                                    {orderingTrackingInfo && (
                                      <TooltipContent className="whitespace-pre-line">
                                        <p>{orderingTrackingInfo}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })}
                          </div>
                        )}
                        {/* Available components - per-order toggle */}
                        {expandedAvailableComponents.has(order.id) && !isWorker && availableComponents.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                            <span className="text-xs text-success font-medium mr-1">Available:</span>
                            {availableComponents.map((component) => {
                              // File-extracted components - editable with popover
                              if (component.isFileExtracted) {
                                return (canUpdateOrdering && !isSeller) ? (
                                  <Popover key={component.name}>
                                    <PopoverTrigger asChild>
                                      <button onClick={(e) => e.stopPropagation()} type="button">
                                        <Badge variant="outline" className="text-xs py-0 px-1.5 border-success/50 text-success cursor-pointer hover:opacity-80 transition-opacity">
                                          {component.name}
                                        </Badge>
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-36 p-0" align="start">
                                      <StatusPopoverButtons
                                        currentValue="available"
                                        options={orderingPopoverOptions}
                                        onChange={(value) => handleFileComponentStatusChange(order.id, component.componentType!, component.componentName ?? null, value)}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                ) : (
                                  <Badge key={component.name} variant="outline" className="text-xs py-0 px-1.5 border-success/50 text-success">
                                    {component.name}
                                  </Badge>
                                );
                              }
                              // Legacy components
                              return (
                                <Badge key={component.name} variant="outline" className="text-xs py-0 px-1.5 border-success/50 text-success">
                                  {component.name}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                        {/* Manufacturing Pipeline - Compact Arrow View */}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground font-medium">Mfg:</span>
                          {order.production_status === 'hold' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-xs py-0 px-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400 gap-1">
                                    <Pause className="h-3 w-3" />
                                    Locked
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Manufacturing is locked while order is on hold</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <div onClick={(e) => e.stopPropagation()}>
                            <ManufacturingPipelineSection
                              order={{
                                reinforcement_status: order.reinforcement_status,
                                windows_profile_status: order.windows_profile_status,
                                glass_status: order.glass_status,
                                hardware_status: order.hardware_status,
                                screens_status: order.screens_status,
                                sliding_doors_profile_status: order.sliding_doors_profile_status,
                                sliding_doors_hardware_status: order.sliding_doors_hardware_status,
                                windows_count: order.windows_count,
                                doors_count: order.doors_count,
                                has_sliding_doors: order.has_sliding_doors ?? false,
                                production_status: order.production_status,
                              }}
                              fulfillment={fulfillments[order.id] || {}}
                              aggregatedComponents={(constructionComponents[order.id] || []).map(c => ({
                                component_type: c.component_type,
                                component_name: c.component_name,
                                status: c.status,
                              }))}
                              constructions={(orderConstructions[order.id] || []).map(c => ({
                                construction_type: c.construction_type,
                                screen_type: c.screen_type,
                              }))}
                              canUpdateManufacturing={canUpdateManufacturing}
                              updateFulfillment={(field, value) => handleStageStatusChange(order.id, field, value)}
                              size="default"
                              showLegend={false}
                              showTrackLetter={true}
                            />
                          </div>
                          {/* Custom Manufacturing Steps */}
                          {customManufacturingSteps.map((step) => {
                            const trackingInfo = formatTrackingInfo(step.updated_at, step.updated_by_email);
                            
                            const badgeContent = (
                              <span 
                                className={`inline-flex items-center gap-1 rounded-full text-white text-xs font-medium py-0.5 px-2.5 border-2 border-dashed border-white/30 ${
                                  step.status === 'complete' ? 'bg-emerald-500' : 
                                  step.status === 'partial' ? 'bg-amber-500' : 'bg-red-500'
                                } ${order.production_status === 'hold' ? 'opacity-50' : ''} ${canUpdateManufacturing && order.production_status !== 'hold' ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                              >
                                {step.name}
                                {step.notes && (
                                  <AlertCircle className="h-3 w-3" />
                                )}
                              </span>
                            );
                            
                            return canUpdateManufacturing && order.production_status !== 'hold' ? (
                              <Popover key={step.id}>
                                <TooltipProvider>
                                  <Tooltip>
                                    <PopoverTrigger asChild>
                                      <TooltipTrigger asChild>
                                        <button 
                                          onClick={(e) => e.stopPropagation()}
                                          type="button"
                                        >
                                          {badgeContent}
                                        </button>
                                      </TooltipTrigger>
                                    </PopoverTrigger>
                                    {trackingInfo && (
                                      <TooltipContent className="whitespace-pre-line">
                                        <p>{trackingInfo}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                                <PopoverContent className="w-36 p-0" align="start">
                                  <StatusPopoverButtons
                                    currentValue={step.status}
                                    options={manufacturingPopoverOptions}
                                    onChange={(value) => handleCustomStepStatusChange(step.id, value)}
                                  />
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <TooltipProvider key={step.id}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    {badgeContent}
                                  </TooltipTrigger>
                                  {trackingInfo && (
                                    <TooltipContent className="whitespace-pre-line">
                                      <p>{trackingInfo}</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}
                        </div>
                        {/* Custom Ordering Steps - visible for non-workers, editable for admin/manager */}
                        {!isWorker && customOrderingSteps.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground font-medium mr-1">Custom:</span>
                            {customOrderingSteps.filter(s => s.status === 'not_ordered').map((step) => (
                              (canUpdateOrdering && !isSeller) ? (
                                <Popover key={step.id}>
                                  <PopoverTrigger asChild>
                                    <button onClick={(e) => e.stopPropagation()} type="button">
                                      <Badge variant="destructive" className="text-xs py-0 px-1.5 cursor-pointer hover:opacity-80 transition-opacity border-dashed">
                                        {step.name}
                                      </Badge>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-36 p-0" align="start">
                                    <StatusPopoverButtons
                                      currentValue="not_ordered"
                                      options={orderingPopoverOptions}
                                      onChange={(value) => handleCustomStepStatusChange(step.id, value)}
                                    />
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <Badge key={step.id} variant="destructive" className="text-xs py-0 px-1.5 border-dashed">
                                  {step.name}
                                </Badge>
                              )
                            ))}
                            {customOrderingSteps.filter(s => s.status === 'ordered').map((step) => (
                              (canUpdateOrdering && !isSeller) ? (
                                <Popover key={step.id}>
                                  <PopoverTrigger asChild>
                                    <button onClick={(e) => e.stopPropagation()} type="button">
                                      <Badge variant="outline" className="text-xs py-0 px-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400 cursor-pointer hover:opacity-80 transition-opacity border-dashed">
                                        {step.name}
                                      </Badge>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-36 p-0" align="start">
                                    <StatusPopoverButtons
                                      currentValue="ordered"
                                      options={orderingPopoverOptions}
                                      onChange={(value) => handleCustomStepStatusChange(step.id, value)}
                                    />
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <Badge key={step.id} variant="outline" className="text-xs py-0 px-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400 border-dashed">
                                  {step.name}
                                </Badge>
                              )
                            ))}
                            {customOrderingSteps.filter(s => s.status === 'available').map((step) => (
                              (canUpdateOrdering && !isSeller) ? (
                                <Popover key={step.id}>
                                  <PopoverTrigger asChild>
                                    <button onClick={(e) => e.stopPropagation()} type="button">
                                      <Badge variant="outline" className="text-xs py-0 px-1.5 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 cursor-pointer hover:opacity-80 transition-opacity border-dashed">
                                        {step.name}
                                      </Badge>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-36 p-0" align="start">
                                    <StatusPopoverButtons
                                      currentValue="available"
                                      options={orderingPopoverOptions}
                                      onChange={(value) => handleCustomStepStatusChange(step.id, value)}
                                    />
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <Badge key={step.id} variant="outline" className="text-xs py-0 px-1.5 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 border-dashed">
                                  {step.name}
                                </Badge>
                              )
                            ))}
                          </div>
                        )}
                        {/* Remaining to Ship - constructions not yet in any delivery batch AND excluded items */}
                        {showRemainingToShip && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {remainingToShip.hasRemaining ? (
                              <>
                                <BoxIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                <span className="text-xs text-muted-foreground">Remaining to ship:</span>
                                {/* Unassigned constructions by type */}
                                {remainingToShip.windowsCount > 0 && (
                                  <Badge variant="outline" className="text-xs py-0 px-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400">
                                    {remainingToShip.windowsCount} Window{remainingToShip.windowsCount > 1 ? 's' : ''} ({remainingToShip.unassignedNumbers.filter((_, i) => {
                                      const c = (orderConstructions[order.id] || [])[i];
                                      return c?.construction_type === 'window';
                                    }).join(', ') || remainingToShip.unassignedNumbers.join(', ')})
                                  </Badge>
                                )}
                                {remainingToShip.doorsCount > 0 && (
                                  <Badge variant="outline" className="text-xs py-0 px-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400">
                                    {remainingToShip.doorsCount} Door{remainingToShip.doorsCount > 1 ? 's' : ''}
                                  </Badge>
                                )}
                                {remainingToShip.slidingDoorsCount > 0 && (
                                  <Badge variant="outline" className="text-xs py-0 px-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400">
                                    {remainingToShip.slidingDoorsCount} Sliding Door{remainingToShip.slidingDoorsCount > 1 ? 's' : ''}
                                  </Badge>
                                )}
                                {/* Excluded items from assigned batches */}
                                {remainingToShip.excludedItems.map(({ constructionNumber, items }) => (
                                  items.map(item => (
                                    <Badge 
                                      key={`${constructionNumber}-${item}`} 
                                      variant="outline" 
                                      className="text-xs py-0 px-1.5 border-orange-500/50 text-orange-600 dark:text-orange-400"
                                    >
                                      {item} for #{constructionNumber}
                                    </Badge>
                                  ))
                                ))}
                              </>
                            ) : orderBatches.length > 0 ? (
                              <>
                                <BoxIcon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <Badge className="bg-emerald-500 hover:bg-emerald-500/90 text-xs py-0 px-1.5">
                                  ✓ All Shipped
                                </Badge>
                              </>
                            ) : null}
                          </div>
                        )}
                        {/* Delivery Batches Status */}
                        {orderBatches.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <Truck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground font-medium mr-1">Batches:</span>
                            {shippedBatches > 0 && (
                              <Badge className="bg-emerald-500 hover:bg-emerald-500/90 text-white text-xs py-0 px-1.5">
                                {shippedBatches} shipped
                              </Badge>
                            )}
                            {preparingBatches > 0 && (
                              <Badge variant="outline" className="text-xs py-0 px-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400">
                                {preparingBatches} preparing
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Per-order toggle buttons */}
                        <div className="flex items-center gap-1">
                          {!isWorker && availableComponents.length > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => toggleAvailableComponents(order.id, e)}
                                  >
                                    <CheckCircle className={`h-4 w-4 ${expandedAvailableComponents.has(order.id) ? 'text-success' : 'text-muted-foreground'}`} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Toggle Available Components</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {ordersWithConstructions.has(order.id) && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => toggleOrderMap(order.id, e)}
                                  >
                                    <Grid3X3 className={`h-4 w-4 ${!collapsedOrderMaps.has(order.id) ? 'text-primary' : 'text-muted-foreground'}`} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Toggle Order Map</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        
                        <ProgressCircle
                          value={calculateFulfillmentPercentage(order)}
                          size="sm"
                          colorVariant="gradient"
                          label="Fulfillment"
                        />
                        <div className="flex flex-col items-center">
                          <ProgressCircle
                            value={Math.max(0, timeLeft)}
                            size="sm"
                            colorVariant="gradient"
                            customValue={daysUntil < 0 ? `${Math.abs(daysUntil)}d` : `${daysUntil}d`}
                            label={daysUntil < 0 ? "Overdue" : "Time Left"}
                          />
                          <span className="text-xs text-muted-foreground mt-1">
                            {format(new Date(order.delivery_date), "MMM d, yyyy")}
                          </span>
                        </div>
                        {!isWorker && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleEditClick(e, order)}
                            className="shrink-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteClick(e, order)}
                            className="shrink-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Inline Order Map - per-order toggle */}
                    {!collapsedOrderMaps.has(order.id) && ordersWithConstructions.has(order.id) && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <OrderMapInline
                          orderId={order.id}
                          orderNumber={order.order_number}
                          isProductionReady={order.production_status === 'production_ready'}
                        />
                      </div>
                    )}

                    {/* Order Status Dropdown */}
                    {(isAdmin || isManager) && (
                      <div className="mt-3 pt-3 border-t border-border" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 gap-1.5">
                              <span className="text-xs text-muted-foreground">Status:</span>
                              <Badge variant="outline" className="text-xs gap-1">
                                {getStatusIcon(getCurrentOrderStatus(order))}
                                {getCurrentStatusLabel(order)}
                              </Badge>
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="bg-popover">
                            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleOrderStatusChange(order.id, 'active')}
                              className={getCurrentOrderStatus(order) === 'active' ? 'bg-accent' : ''}
                            >
                              <PlayCircle className="h-4 w-4 mr-2 text-success" />
                              Active
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleOrderStatusChange(order.id, 'on_hold')}
                              className={getCurrentOrderStatus(order) === 'on_hold' ? 'bg-accent' : ''}
                            >
                              <Pause className="h-4 w-4 mr-2 text-amber-500" />
                              On Hold
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleOrderStatusChange(order.id, 'finished')}
                              className={getCurrentOrderStatus(order) === 'finished' ? 'bg-accent' : ''}
                            >
                              <CheckCircle className="h-4 w-4 mr-2 text-blue-500" />
                              Finished / Shipped
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>;
                  })}
                </div>
              );
            };
            
            return (
              <>
                {renderOrdersList(activeOrders, "No active orders found.")}
              </>
            );
          })()}
            </TabsContent>
            <TabsContent value="finished">
              {(() => {
                // Sort orders helper
                const sortOrders = (ordersToSort: Order[]) => [...ordersToSort].sort((a, b) => {
                  switch (sortBy) {
                    case 'time_left_asc':
                      return getDaysUntilDelivery(a.delivery_date) - getDaysUntilDelivery(b.delivery_date);
                    case 'time_left_desc':
                      return getDaysUntilDelivery(b.delivery_date) - getDaysUntilDelivery(a.delivery_date);
                    case 'order_date_asc':
                      return new Date(a.order_date).getTime() - new Date(b.order_date).getTime();
                    case 'order_date_desc':
                      return new Date(b.order_date).getTime() - new Date(a.order_date).getTime();
                    case 'fulfillment_asc':
                      return (a.fulfillment_percentage || 0) - (b.fulfillment_percentage || 0);
                    case 'fulfillment_desc':
                      return (b.fulfillment_percentage || 0) - (a.fulfillment_percentage || 0);
                    default:
                      return 0;
                  }
                });
                
                const finishedOrders = sortOrders(filteredOrders.filter(o => o.delivery_complete));
                
                if (finishedOrders.length === 0) {
                  return (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>No finished orders found.</p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-3">
                    {finishedOrders.map(order => {
                      const daysUntil = getDaysUntilDelivery(order.delivery_date);
                      const orderBatches = getOrderDeliveryBatches(order.id);
                      const shippedBatches = orderBatches.filter(b => b.status === 'shipped').length;
                      const deliveredBatches = orderBatches.filter(b => b.status === 'delivered').length;
                      
                      return (
                        <div 
                          key={order.id} 
                          id={`order-${order.id}`} 
                          className={`relative block p-4 rounded-lg border bg-card transition-colors ${(isAdmin || isManager) ? 'hover:bg-muted/50 cursor-pointer' : ''}`} 
                          onClick={() => (isAdmin || isManager) && navigate(`/orders/${order.id}`)}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="font-mono text-sm font-semibold bg-muted px-2 py-1 rounded">
                                #{order.order_number}
                              </span>
                              <span className="font-medium truncate">
                                {order.customer_name}
                              </span>
                              <Badge variant="outline" className="gap-1 text-xs border-success/50 text-success shrink-0">
                                <CheckCircle className="h-3 w-3" />
                                Delivered
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Delivered {format(new Date(order.delivery_date), 'MMM d, yyyy')}</span>
                              {shippedBatches > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {shippedBatches} batch{shippedBatches > 1 ? 'es' : ''} shipped
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              {(isAdmin || isManager) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => handleEditClick(e, order)}
                                  className="shrink-0"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {/* Order Status Dropdown */}
                              {(isAdmin || isManager) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 gap-1.5">
                                      <Badge variant="outline" className="text-xs gap-1">
                                        {getStatusIcon(getCurrentOrderStatus(order))}
                                        {getCurrentStatusLabel(order)}
                                      </Badge>
                                      <ChevronDown className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-popover">
                                    <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleOrderStatusChange(order.id, 'active')}
                                      className={getCurrentOrderStatus(order) === 'active' ? 'bg-accent' : ''}
                                    >
                                      <PlayCircle className="h-4 w-4 mr-2 text-success" />
                                      Active
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleOrderStatusChange(order.id, 'on_hold')}
                                      className={getCurrentOrderStatus(order) === 'on_hold' ? 'bg-accent' : ''}
                                    >
                                      <Pause className="h-4 w-4 mr-2 text-amber-500" />
                                      On Hold
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleOrderStatusChange(order.id, 'finished')}
                                      className={getCurrentOrderStatus(order) === 'finished' ? 'bg-accent' : ''}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2 text-blue-500" />
                                      Finished / Shipped
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <OrderEditDialog
        order={selectedOrder}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={fetchOrders}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order #{orderToDelete?.order_number}? This action cannot be undone and will also remove all fulfillment data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>;
}