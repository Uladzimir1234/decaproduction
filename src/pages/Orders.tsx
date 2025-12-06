import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Pencil, Trash2, AlertCircle, Clock, Wrench } from "lucide-react";
import { ProgressCircle } from "@/components/ui/progress-circle";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderEditDialog } from "@/components/OrderEditDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createAuditLog } from "@/lib/auditLog";
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
}

interface CustomStep {
  id: string;
  order_id: string;
  step_type: 'ordering' | 'manufacturing';
  name: string;
  status: string;
  order_date: string | null;
  notes: string | null;
}

interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  order_date: string;
  delivery_date: string;
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
}
export default function Orders() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fulfillments, setFulfillments] = useState<Record<string, OrderFulfillment>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [customSteps, setCustomSteps] = useState<CustomStep[]>([]);

  useEffect(() => {
    fetchOrders();
    fetchFulfillments();
    fetchCustomSteps();
  }, []);

  const fetchCustomSteps = async () => {
    try {
      const { data, error } = await supabase.from("custom_steps").select("*");
      if (error) throw error;
      setCustomSteps((data || []) as CustomStep[]);
    } catch (error) {
      console.error("Error fetching custom steps:", error);
    }
  };

  const handleCustomStepStatusChange = async (stepId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("custom_steps")
        .update({ status: newStatus })
        .eq("id", stepId);
      
      if (error) throw error;
      
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
    const f = fulfillments[order.id];
    
    type StageStatus = 'complete' | 'partial' | 'not_started';
    const stages: { name: string; status: StageStatus; hasNotes: boolean; field: string }[] = [];
    
    const getStatus = (value: string | null | undefined): StageStatus => {
      if (value === 'complete') return 'complete';
      if (value === 'partial') return 'partial';
      return 'not_started';
    };
    
    // Always show these stages
    stages.push({ name: 'Reinforcement', status: getStatus(f?.reinforcement_cutting), hasNotes: false, field: 'reinforcement_cutting' });
    stages.push({ name: 'Profile Cut', status: getStatus(f?.profile_cutting), hasNotes: false, field: 'profile_cutting' });
    stages.push({ name: 'Welding', status: getStatus(f?.welding_status), hasNotes: !!(f?.welding_notes), field: 'welding_status' });
    
    // Conditional stages based on order
    if (order.doors_count && order.doors_count > 0) {
      stages.push({ name: 'Doors', status: getStatus(f?.doors_status), hasNotes: !!(f?.doors_notes), field: 'doors_status' });
    }
    if (order.has_sliding_doors) {
      stages.push({ name: 'Sliding Doors', status: getStatus(f?.sliding_doors_status), hasNotes: !!(f?.sliding_doors_notes), field: 'sliding_doors_status' });
    }
    
    stages.push({ name: 'Assembly', status: getStatus(f?.assembly_status), hasNotes: !!(f?.assembly_notes), field: 'assembly_status' });
    stages.push({ name: 'Glass', status: getStatus(f?.glass_status), hasNotes: !!(f?.glass_notes), field: 'glass_status' });
    stages.push({ name: 'Screens', status: getStatus(f?.screens_cutting), hasNotes: !!(f?.screens_notes), field: 'screens_cutting' });
    
    return stages;
  };

  const handleStageStatusChange = async (orderId: string, field: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("order_fulfillment")
        .update({ [field]: newStatus })
        .eq("order_id", orderId);
      
      if (error) throw error;
      
      // Update local state
      setFulfillments(prev => ({
        ...prev,
        [orderId]: {
          ...prev[orderId],
          [field]: newStatus
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

  const getNotOrderedComponents = (order: Order) => {
    const components: { name: string; field: string }[] = [];
    if (order.reinforcement_status === 'not_ordered') components.push({ name: 'Reinforcement', field: 'reinforcement_status' });
    if (order.windows_profile_status === 'not_ordered') components.push({ name: 'Windows Profile', field: 'windows_profile_status' });
    if (order.glass_status === 'not_ordered') components.push({ name: 'Glass', field: 'glass_status' });
    if (order.screens_status === 'not_ordered') components.push({ name: 'Screens', field: 'screens_status' });
    if (order.plisse_screens_status === 'not_ordered') components.push({ name: 'Plisse Screens', field: 'plisse_screens_status' });
    if (order.nail_fins_status === 'not_ordered') components.push({ name: 'Nail Fins', field: 'nail_fins_status' });
    if (order.hardware_status === 'not_ordered') components.push({ name: 'Hardware', field: 'hardware_status' });
    return components;
  };

  const getOrderedComponents = (order: Order) => {
    const components: { name: string; field: string }[] = [];
    if (order.reinforcement_status === 'ordered') components.push({ name: 'Reinforcement', field: 'reinforcement_status' });
    if (order.windows_profile_status === 'ordered') components.push({ name: 'Windows Profile', field: 'windows_profile_status' });
    if (order.glass_status === 'ordered') components.push({ name: 'Glass', field: 'glass_status' });
    if (order.screens_status === 'ordered') components.push({ name: 'Screens', field: 'screens_status' });
    if (order.plisse_screens_status === 'ordered') components.push({ name: 'Plisse Screens', field: 'plisse_screens_status' });
    if (order.nail_fins_status === 'ordered') components.push({ name: 'Nail Fins', field: 'nail_fins_status' });
    if (order.hardware_status === 'ordered') components.push({ name: 'Hardware', field: 'hardware_status' });
    return components;
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
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) || order.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "complete") return matchesSearch && order.fulfillment_percentage >= 90;
    if (statusFilter === "in_progress") return matchesSearch && order.fulfillment_percentage >= 20 && order.fulfillment_percentage < 90;
    if (statusFilter === "not_started") return matchesSearch && order.fulfillment_percentage < 20;
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
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? <div className="text-center py-12 text-muted-foreground">
              <p>No orders found.</p>
              {orders.length === 0 && <Link to="/orders/new">
                  <Button variant="link" className="mt-2">Create your first order</Button>
                </Link>}
            </div> : <div className="space-y-3">
              {filteredOrders.map(order => {
            const daysUntil = getDaysUntilDelivery(order.delivery_date);
            const timeLeft = getTimePercentage(order.order_date, order.delivery_date);
            const notOrderedComponents = getNotOrderedComponents(order);
            const orderedComponents = getOrderedComponents(order);
            const manufacturingStages = getManufacturingStages(order);
            const customOrderingSteps = getCustomOrderingSteps(order.id);
            const customManufacturingSteps = getCustomManufacturingSteps(order.id);
            return <div key={order.id} className="block p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <Link to={`/orders/${order.id}`} className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-sm font-semibold bg-muted px-2 py-1 rounded">
                            #{order.order_number}
                          </span>
                          <span className="font-medium truncate">
                            {order.customer_name}
                          </span>
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
                        </div>
                        {notOrderedComponents.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                            <span className="text-xs text-destructive font-medium mr-1">Needs ordering:</span>
                            {notOrderedComponents.map((component) => (
                              <Popover key={component.name}>
                                <PopoverTrigger asChild>
                                  <button onClick={(e) => e.preventDefault()}>
                                    <Badge variant="destructive" className="text-xs py-0 px-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                                      {component.name}
                                    </Badge>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-40 p-1" align="start">
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleComponentStatusChange(order.id, component.field, 'not_ordered');
                                      }}
                                      className="text-left px-3 py-1.5 text-sm rounded bg-red-100 text-red-700"
                                    >
                                      Not Ordered
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleComponentStatusChange(order.id, component.field, 'ordered');
                                      }}
                                      className="text-left px-3 py-1.5 text-sm rounded hover:bg-muted"
                                    >
                                      Ordered
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleComponentStatusChange(order.id, component.field, 'available');
                                      }}
                                      className="text-left px-3 py-1.5 text-sm rounded hover:bg-muted"
                                    >
                                      Available
                                    </button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ))}
                          </div>
                        )}
                        {orderedComponents.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium mr-1">Ordered:</span>
                            {orderedComponents.map((component) => (
                              <Popover key={component.name}>
                                <PopoverTrigger asChild>
                                  <button onClick={(e) => e.preventDefault()}>
                                    <Badge variant="outline" className="text-xs py-0 px-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400 cursor-pointer hover:opacity-80 transition-opacity">
                                      {component.name}
                                    </Badge>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-40 p-1" align="start">
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleComponentStatusChange(order.id, component.field, 'not_ordered');
                                      }}
                                      className="text-left px-3 py-1.5 text-sm rounded hover:bg-muted"
                                    >
                                      Not Ordered
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleComponentStatusChange(order.id, component.field, 'ordered');
                                      }}
                                      className="text-left px-3 py-1.5 text-sm rounded bg-amber-100 text-amber-700"
                                    >
                                      Ordered
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleComponentStatusChange(order.id, component.field, 'available');
                                      }}
                                      className="text-left px-3 py-1.5 text-sm rounded hover:bg-muted"
                                    >
                                      Available
                                    </button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground font-medium mr-1">Manufacturing:</span>
                          {manufacturingStages.map((stage) => (
                            <Popover key={stage.name}>
                              <PopoverTrigger asChild>
                                <button 
                                  onClick={(e) => e.preventDefault()}
                                  className={`inline-flex items-center gap-1 rounded-full text-white text-xs font-medium py-0.5 px-2.5 cursor-pointer hover:opacity-80 transition-opacity ${
                                    stage.status === 'complete' ? 'bg-emerald-500' : 
                                    stage.status === 'partial' ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                >
                                  {stage.name}
                                  {stage.hasNotes && (
                                    <AlertCircle className="h-3 w-3" />
                                  )}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-40 p-1" align="start">
                                <div className="flex flex-col gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleStageStatusChange(order.id, stage.field, 'not_started');
                                    }}
                                    className={`text-left px-3 py-1.5 text-sm rounded hover:bg-muted ${stage.status === 'not_started' ? 'bg-red-100 text-red-700' : ''}`}
                                  >
                                    Not Started
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleStageStatusChange(order.id, stage.field, 'partial');
                                    }}
                                    className={`text-left px-3 py-1.5 text-sm rounded hover:bg-muted ${stage.status === 'partial' ? 'bg-amber-100 text-amber-700' : ''}`}
                                  >
                                    Partial
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleStageStatusChange(order.id, stage.field, 'complete');
                                    }}
                                    className={`text-left px-3 py-1.5 text-sm rounded hover:bg-muted ${stage.status === 'complete' ? 'bg-emerald-100 text-emerald-700' : ''}`}
                                  >
                                    Complete
                                  </button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ))}
                          {/* Custom Manufacturing Steps */}
                          {customManufacturingSteps.map((step) => (
                            <Popover key={step.id}>
                              <PopoverTrigger asChild>
                                <button 
                                  onClick={(e) => e.preventDefault()}
                                  className={`inline-flex items-center gap-1 rounded-full text-white text-xs font-medium py-0.5 px-2.5 cursor-pointer hover:opacity-80 transition-opacity border-2 border-dashed border-white/30 ${
                                    step.status === 'complete' ? 'bg-emerald-500' : 
                                    step.status === 'partial' ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                >
                                  {step.name}
                                  {step.notes && (
                                    <AlertCircle className="h-3 w-3" />
                                  )}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-40 p-1" align="start">
                                <div className="flex flex-col gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleCustomStepStatusChange(step.id, 'not_started');
                                    }}
                                    className={`text-left px-3 py-1.5 text-sm rounded hover:bg-muted ${step.status === 'not_started' ? 'bg-red-100 text-red-700' : ''}`}
                                  >
                                    Not Started
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleCustomStepStatusChange(step.id, 'partial');
                                    }}
                                    className={`text-left px-3 py-1.5 text-sm rounded hover:bg-muted ${step.status === 'partial' ? 'bg-amber-100 text-amber-700' : ''}`}
                                  >
                                    Partial
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleCustomStepStatusChange(step.id, 'complete');
                                    }}
                                    className={`text-left px-3 py-1.5 text-sm rounded hover:bg-muted ${step.status === 'complete' ? 'bg-emerald-100 text-emerald-700' : ''}`}
                                  >
                                    Complete
                                  </button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ))}
                        </div>
                        {/* Custom Ordering Steps */}
                        {customOrderingSteps.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground font-medium mr-1">Custom:</span>
                            {customOrderingSteps.filter(s => s.status === 'not_ordered').map((step) => (
                              <Popover key={step.id}>
                                <PopoverTrigger asChild>
                                  <button onClick={(e) => e.preventDefault()}>
                                    <Badge variant="destructive" className="text-xs py-0 px-1.5 cursor-pointer hover:opacity-80 transition-opacity border-dashed">
                                      {step.name}
                                    </Badge>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-40 p-1" align="start">
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleCustomStepStatusChange(step.id, 'not_ordered');
                                      }}
                                      className="text-left px-3 py-1.5 text-sm rounded bg-red-100 text-red-700"
                                    >
                                      Not Ordered
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleCustomStepStatusChange(step.id, 'ordered');
                                      }}
                                      className="text-left px-3 py-1.5 text-sm rounded hover:bg-muted"
                                    >
                                      Ordered
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleCustomStepStatusChange(step.id, 'available');
                                      }}
                                      className="text-left px-3 py-1.5 text-sm rounded hover:bg-muted"
                                    >
                                      Available
                                    </button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ))}
                            {customOrderingSteps.filter(s => s.status === 'ordered').map((step) => (
                              <Popover key={step.id}>
                                <PopoverTrigger asChild>
                                  <button onClick={(e) => e.preventDefault()}>
                                    <Badge variant="outline" className="text-xs py-0 px-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400 cursor-pointer hover:opacity-80 transition-opacity border-dashed">
                                      {step.name}
                                    </Badge>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-40 p-1" align="start">
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleCustomStepStatusChange(step.id, 'not_ordered');
                                      }}
                                      className="text-left px-3 py-1.5 text-sm rounded hover:bg-muted"
                                    >
                                      Not Ordered
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleCustomStepStatusChange(step.id, 'ordered');
                                      }}
                                      className="text-left px-3 py-1.5 text-sm rounded bg-amber-100 text-amber-700"
                                    >
                                      Ordered
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleCustomStepStatusChange(step.id, 'available');
                                      }}
                                      className="text-left px-3 py-1.5 text-sm rounded hover:bg-muted"
                                    >
                                      Available
                                    </button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ))}
                            {customOrderingSteps.filter(s => s.status === 'available').map((step) => (
                              <Popover key={step.id}>
                                <PopoverTrigger asChild>
                                  <button onClick={(e) => e.preventDefault()}>
                                    <Badge variant="outline" className="text-xs py-0 px-1.5 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 cursor-pointer hover:opacity-80 transition-opacity border-dashed">
                                      {step.name}
                                    </Badge>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-40 p-1" align="start">
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleCustomStepStatusChange(step.id, 'not_ordered');
                                      }}
                                      className="text-left px-3 py-1.5 text-sm rounded hover:bg-muted"
                                    >
                                      Not Ordered
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleCustomStepStatusChange(step.id, 'ordered');
                                      }}
                                      className="text-left px-3 py-1.5 text-sm rounded hover:bg-muted"
                                    >
                                      Ordered
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleCustomStepStatusChange(step.id, 'available');
                                      }}
                                      className="text-left px-3 py-1.5 text-sm rounded bg-emerald-100 text-emerald-700"
                                    >
                                      Available
                                    </button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ))}
                          </div>
                        )}
                      </Link>

                      <div className="flex items-center gap-3">
                        <ProgressCircle
                          value={order.fulfillment_percentage}
                          size="sm"
                          colorVariant="gradient"
                          label="Fulfillment"
                        />
                        <ProgressCircle
                          value={Math.max(0, timeLeft)}
                          size="sm"
                          colorVariant="gradient"
                          customValue={daysUntil < 0 ? `${Math.abs(daysUntil)}d` : `${daysUntil}d`}
                          label={daysUntil < 0 ? "Overdue" : "Time Left"}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleEditClick(e, order)}
                          className="shrink-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDeleteClick(e, order)}
                          className="shrink-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>;
          })}
            </div>}
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