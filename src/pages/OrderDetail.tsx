import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ProgressCircle } from "@/components/ui/progress-circle";
import { StatusBadge } from "@/components/ui/status-badge";
import { ImageUpload } from "@/components/ui/image-upload";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, Package, Wrench, Lock, CheckCircle2, Clock, AlertCircle, ShoppingCart, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  glass_ordered: boolean;
  // Component availability status
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
export default function OrderDetail() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [fulfillment, setFulfillment] = useState<OrderFulfillment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customSteps, setCustomSteps] = useState<CustomStep[]>([]);
  const [newOrderingStepName, setNewOrderingStepName] = useState("");
  const [newManufacturingStepName, setNewManufacturingStepName] = useState("");
  const [orderingDialogOpen, setOrderingDialogOpen] = useState(false);
  const [manufacturingDialogOpen, setManufacturingDialogOpen] = useState(false);
  useEffect(() => {
    if (id) {
      fetchOrder();
      fetchCustomSteps();
    }
  }, [id]);
  const fetchCustomSteps = async () => {
    if (!id) return;
    const {
      data,
      error
    } = await supabase.from("custom_steps").select("*").eq("order_id", id).order("created_at");
    if (!error && data) {
      setCustomSteps(data as CustomStep[]);
    }
  };
  const addCustomStep = async (stepType: 'ordering' | 'manufacturing', name: string) => {
    if (!id || !name.trim()) return;
    const defaultStatus = stepType === 'ordering' ? 'not_ordered' : 'not_started';
    const {
      data,
      error
    } = await supabase.from("custom_steps").insert({
      order_id: id,
      step_type: stepType,
      name: name.trim(),
      status: defaultStatus
    }).select().single();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to add custom step",
        variant: "destructive"
      });
      return;
    }
    setCustomSteps([...customSteps, data as CustomStep]);
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
    const {
      error
    } = await supabase.from("custom_steps").update(updates).eq("id", stepId);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update custom step",
        variant: "destructive"
      });
      return;
    }
    setCustomSteps(customSteps.map(s => s.id === stepId ? {
      ...s,
      ...updates
    } : s));
    toast({
      title: "Saved",
      description: "Custom step updated"
    });
  };
  const deleteCustomStep = async (stepId: string) => {
    const {
      error
    } = await supabase.from("custom_steps").delete().eq("id", stepId);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete custom step",
        variant: "destructive"
      });
      return;
    }
    setCustomSteps(customSteps.filter(s => s.id !== stepId));
    toast({
      title: "Deleted",
      description: "Custom step removed"
    });
  };
  const fetchOrder = async () => {
    try {
      const {
        data: orderData,
        error: orderError
      } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      if (orderError) throw orderError;
      if (!orderData) {
        navigate("/orders");
        return;
      }
      setOrder(orderData);

      // Fetch or create fulfillment record
      let {
        data: fulfillmentData,
        error: fulfillmentError
      } = await supabase.from("order_fulfillment").select("*").eq("order_id", id).maybeSingle();
      if (fulfillmentError && fulfillmentError.code !== "PGRST116") throw fulfillmentError;
      if (!fulfillmentData) {
        // Create fulfillment record
        const {
          data: newFulfillment,
          error: createError
        } = await supabase.from("order_fulfillment").insert({
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
        }).select().single();
        if (createError) throw createError;
        fulfillmentData = newFulfillment;
      }
      setFulfillment(fulfillmentData);
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
  const calculateFulfillmentPercentage = (data: Partial<OrderFulfillment>) => {
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
    if (order?.doors_count && order.doors_count > 0) {
      totalSteps += 10;
      completedSteps += getStatusPoints(data.doors_status, 10);
    }

    // Sliding doors assembled (if applicable) (weight: 10%)
    if (order?.has_sliding_doors) {
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
  const updateFulfillment = async (key: keyof OrderFulfillment, value: any) => {
    if (!fulfillment || !order) return;
    const updatedFulfillment = {
      ...fulfillment,
      [key]: value
    };
    setFulfillment(updatedFulfillment);

    // Auto-save on change
    setSaving(true);
    try {
      const newPercentage = calculateFulfillmentPercentage(updatedFulfillment);
      const {
        error: fulfillmentError
      } = await supabase.from("order_fulfillment").update(updatedFulfillment).eq("id", fulfillment.id);
      if (fulfillmentError) throw fulfillmentError;
      const {
        error: orderError
      } = await supabase.from("orders").update({
        fulfillment_percentage: newPercentage
      }).eq("id", order.id);
      if (orderError) throw orderError;
      setOrder({
        ...order,
        fulfillment_percentage: newPercentage
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
    } finally {
      setSaving(false);
    }
  };
  const updateOrderComponent = async (updates: Partial<Order>) => {
    if (!order) return;
    const updatedOrder = {
      ...order,
      ...updates
    };
    setOrder(updatedOrder);
    setSaving(true);
    try {
      const {
        error
      } = await supabase.from("orders").update(updates).eq("id", order.id);
      if (error) throw error;
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
    return <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading order...</div>
      </div>;
  }
  if (!order || !fulfillment) {
    return null;
  }
  const daysUntil = getDaysUntilDelivery();
  const timeLeft = getTimePercentage();
  return <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Button variant="ghost" onClick={() => navigate("/orders")} className="gap-2 mb-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Button>
          <h1 className="text-2xl font-bold">Order #{order.order_number}</h1>
          <p className="text-muted-foreground">{order.customer_name}</p>
        </div>
        {saving && <span className="text-sm text-muted-foreground">Saving...</span>}
      </div>

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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <TooltipProvider>
              {[{
              name: 'Reinforcement',
              status: order.reinforcement_status
            }, {
              name: 'Windows Profile',
              status: order.windows_profile_status
            }, {
              name: 'Glass',
              status: order.glass_status
            }, {
              name: 'Screens',
              status: order.screens_status
            }, {
              name: 'Plisse Screens',
              status: order.plisse_screens_status
            }, {
              name: 'Nail Fins',
              status: order.nail_fins_status
            }, {
              name: 'Hardware',
              status: order.hardware_status
            }].map(component => {
              const status = component.status || 'not_ordered';
              const isAvailable = status === 'available';
              const isOrdered = status === 'ordered';
              const isNotOrdered = status === 'not_ordered';
              return <Tooltip key={component.name}>
                    <TooltipTrigger asChild>
                      <div className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${isAvailable ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : isOrdered ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
                        {isAvailable ? <CheckCircle2 className="h-5 w-5 mb-1" /> : isOrdered ? <Clock className="h-5 w-5 mb-1" /> : <AlertCircle className="h-5 w-5 mb-1" />}
                        <span className="text-xs font-medium text-center leading-tight">
                          {component.name}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{component.name}: {isAvailable ? 'Available' : isOrdered ? 'Ordered' : 'Not Ordered'}</p>
                    </TooltipContent>
                  </Tooltip>;
            })}
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
              <CardDescription className="my-[4px] py-[8px]">Update component availability and order dates</CardDescription>
            </div>
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
                    <Input placeholder="e.g., Special Hardware, Custom Seals..." value={newOrderingStepName} onChange={e => setNewOrderingStepName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomStep('ordering', newOrderingStepName)} />
                  </div>
                  <Button onClick={() => addCustomStep('ordering', newOrderingStepName)} disabled={!newOrderingStepName.trim()} className="w-full">
                    Add Step
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {/* Reinforcement */}
            <AccordionItem value="order-reinforcement">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  {order.reinforcement_status === 'available' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : order.reinforcement_status === 'ordered' ? <Clock className="h-4 w-4 text-amber-500" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                  <span>Reinforcement</span>
                  <Badge variant="outline" className="ml-2 capitalize">
                    {(order.reinforcement_status || 'not_ordered').replace('_', ' ')}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={order.reinforcement_status || 'not_ordered'} onValueChange={value => updateOrderComponent({
                      reinforcement_status: value,
                      reinforcement_order_date: value === 'ordered' ? order.reinforcement_order_date || new Date().toISOString().split('T')[0] : null
                    })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_ordered">Not Ordered</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {order.reinforcement_status === 'ordered' && <div className="space-y-2">
                      <Label>Order Date</Label>
                      <Input type="date" value={order.reinforcement_order_date || ''} onChange={e => updateOrderComponent({
                      reinforcement_order_date: e.target.value
                    })} />
                    </div>}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Windows Profile */}
            <AccordionItem value="order-windows-profile">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  {order.windows_profile_status === 'available' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : order.windows_profile_status === 'ordered' ? <Clock className="h-4 w-4 text-amber-500" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                  <span>Windows Profile</span>
                  <Badge variant="outline" className="ml-2 capitalize">
                    {(order.windows_profile_status || 'not_ordered').replace('_', ' ')}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={order.windows_profile_status || 'not_ordered'} onValueChange={value => updateOrderComponent({
                      windows_profile_status: value,
                      windows_profile_order_date: value === 'ordered' ? order.windows_profile_order_date || new Date().toISOString().split('T')[0] : null
                    })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_ordered">Not Ordered</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {order.windows_profile_status === 'ordered' && <div className="space-y-2">
                      <Label>Order Date</Label>
                      <Input type="date" value={order.windows_profile_order_date || ''} onChange={e => updateOrderComponent({
                      windows_profile_order_date: e.target.value
                    })} />
                    </div>}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Glass */}
            <AccordionItem value="order-glass">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  {order.glass_status === 'available' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : order.glass_status === 'ordered' ? <Clock className="h-4 w-4 text-amber-500" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                  <span>Glass</span>
                  <Badge variant="outline" className="ml-2 capitalize">
                    {(order.glass_status || 'not_ordered').replace('_', ' ')}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={order.glass_status || 'not_ordered'} onValueChange={value => updateOrderComponent({
                      glass_status: value,
                      glass_order_date: value === 'ordered' ? order.glass_order_date || new Date().toISOString().split('T')[0] : null
                    })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_ordered">Not Ordered</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {order.glass_status === 'ordered' && <div className="space-y-2">
                      <Label>Order Date</Label>
                      <Input type="date" value={order.glass_order_date || ''} onChange={e => updateOrderComponent({
                      glass_order_date: e.target.value
                    })} />
                    </div>}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Screens */}
            <AccordionItem value="order-screens">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  {order.screens_status === 'available' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : order.screens_status === 'ordered' ? <Clock className="h-4 w-4 text-amber-500" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                  <span>Screens</span>
                  <Badge variant="outline" className="ml-2 capitalize">
                    {(order.screens_status || 'not_ordered').replace('_', ' ')}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={order.screens_status || 'not_ordered'} onValueChange={value => updateOrderComponent({
                      screens_status: value,
                      screens_order_date: value === 'ordered' ? order.screens_order_date || new Date().toISOString().split('T')[0] : null
                    })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_ordered">Not Ordered</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {order.screens_status === 'ordered' && <div className="space-y-2">
                      <Label>Order Date</Label>
                      <Input type="date" value={order.screens_order_date || ''} onChange={e => updateOrderComponent({
                      screens_order_date: e.target.value
                    })} />
                    </div>}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Plisse Screens */}
            <AccordionItem value="order-plisse-screens">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  {order.plisse_screens_status === 'available' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : order.plisse_screens_status === 'ordered' ? <Clock className="h-4 w-4 text-amber-500" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                  <span>Plisse Screens</span>
                  <Badge variant="outline" className="ml-2 capitalize">
                    {(order.plisse_screens_status || 'not_ordered').replace('_', ' ')}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={order.plisse_screens_status || 'not_ordered'} onValueChange={value => updateOrderComponent({
                      plisse_screens_status: value,
                      plisse_screens_order_date: value === 'ordered' ? order.plisse_screens_order_date || new Date().toISOString().split('T')[0] : null
                    })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_ordered">Not Ordered</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {order.plisse_screens_status === 'ordered' && <div className="space-y-2">
                      <Label>Order Date</Label>
                      <Input type="date" value={order.plisse_screens_order_date || ''} onChange={e => updateOrderComponent({
                      plisse_screens_order_date: e.target.value
                    })} />
                    </div>}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Nail Fins */}
            <AccordionItem value="order-nail-fins">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  {order.nail_fins_status === 'available' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : order.nail_fins_status === 'ordered' ? <Clock className="h-4 w-4 text-amber-500" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                  <span>Nail Fins</span>
                  <Badge variant="outline" className="ml-2 capitalize">
                    {(order.nail_fins_status || 'not_ordered').replace('_', ' ')}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={order.nail_fins_status || 'not_ordered'} onValueChange={value => updateOrderComponent({
                      nail_fins_status: value,
                      nail_fins_order_date: value === 'ordered' ? order.nail_fins_order_date || new Date().toISOString().split('T')[0] : null
                    })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_ordered">Not Ordered</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {order.nail_fins_status === 'ordered' && <div className="space-y-2">
                      <Label>Order Date</Label>
                      <Input type="date" value={order.nail_fins_order_date || ''} onChange={e => updateOrderComponent({
                      nail_fins_order_date: e.target.value
                    })} />
                    </div>}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Hardware */}
            <AccordionItem value="order-hardware">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  {order.hardware_status === 'available' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : order.hardware_status === 'ordered' ? <Clock className="h-4 w-4 text-amber-500" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                  <span>Hardware</span>
                  <Badge variant="outline" className="ml-2 capitalize">
                    {(order.hardware_status || 'not_ordered').replace('_', ' ')}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={order.hardware_status || 'not_ordered'} onValueChange={value => updateOrderComponent({
                      hardware_status: value,
                      hardware_order_date: value === 'ordered' ? order.hardware_order_date || new Date().toISOString().split('T')[0] : null
                    })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_ordered">Not Ordered</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {order.hardware_status === 'ordered' && <div className="space-y-2">
                      <Label>Order Date</Label>
                      <Input type="date" value={order.hardware_order_date || ''} onChange={e => updateOrderComponent({
                      hardware_order_date: e.target.value
                    })} />
                    </div>}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Custom Ordering Steps */}
            {customSteps.filter(s => s.step_type === 'ordering').map(step => <AccordionItem key={step.id} value={`custom-ordering-${step.id}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    {step.status === 'available' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : step.status === 'ordered' ? <Clock className="h-4 w-4 text-amber-500" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                    <span>{step.name}</span>
                    <Badge variant="outline" className="ml-2 capitalize">
                      {step.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={step.status} onValueChange={value => updateCustomStep(step.id, {
                      status: value,
                      order_date: value === 'ordered' ? step.order_date || new Date().toISOString().split('T')[0] : null
                    })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_ordered">Not Ordered</SelectItem>
                          <SelectItem value="ordered">Ordered</SelectItem>
                          <SelectItem value="available">Available</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {step.status === 'ordered' && <div className="space-y-2">
                        <Label>Order Date</Label>
                        <Input type="date" value={step.order_date || ''} onChange={e => updateCustomStep(step.id, {
                      order_date: e.target.value
                    })} />
                      </div>}
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea placeholder="Add notes..." value={step.notes || ""} onChange={e => updateCustomStep(step.id, {
                    notes: e.target.value
                  })} />
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => deleteCustomStep(step.id)} className="gap-1">
                    <Trash2 className="h-4 w-4" />
                    Delete Step
                  </Button>
                </AccordionContent>
              </AccordionItem>)}
          </Accordion>
        </CardContent>
      </Card>

        {/* Fulfillment Stages */}
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
                    <Input placeholder="e.g., Quality Check, Packaging..." value={newManufacturingStepName} onChange={e => setNewManufacturingStepName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomStep('manufacturing', newManufacturingStepName)} />
                  </div>
                  <Button onClick={() => addCustomStep('manufacturing', newManufacturingStepName)} disabled={!newManufacturingStepName.trim()} className="w-full">
                    Add Step
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {/* Reinforcement Cutting */}
            <AccordionItem value="reinforcement">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <StatusBadge status={fulfillment.reinforcement_cutting as "not_started" | "partial" | "complete" || "not_started"} />
                  <span>Reinforcement Cutting</span>
                  {order.reinforcement_status !== 'available' && <Badge variant="outline" className="ml-2 text-muted-foreground gap-1">
                      <Lock className="h-3 w-3" />
                      {order.reinforcement_status === 'not_ordered' ? 'Not Ordered' : 'Ordered'}
                    </Badge>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                {order.reinforcement_status !== 'available' ? <p className="text-sm text-muted-foreground">Reinforcement must be available before this stage can be updated.</p> : <Select value={fulfillment.reinforcement_cutting} onValueChange={(value: StageStatus) => updateFulfillment("reinforcement_cutting", value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="partial">Partially Done</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                    </SelectContent>
                  </Select>}
              </AccordionContent>
            </AccordionItem>

            {/* Profile Cutting */}
            <AccordionItem value="profile">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <StatusBadge status={fulfillment.profile_cutting as "not_started" | "partial" | "complete" || "not_started"} />
                  <span>Profile Cutting</span>
                  {order.windows_profile_status !== 'available' && <Badge variant="outline" className="ml-2 text-muted-foreground gap-1">
                      <Lock className="h-3 w-3" />
                      {order.windows_profile_status === 'not_ordered' ? 'Not Ordered' : 'Ordered'}
                    </Badge>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                {order.windows_profile_status !== 'available' ? <p className="text-sm text-muted-foreground">Windows Profile must be available before this stage can be updated.</p> : <Select value={fulfillment.profile_cutting} onValueChange={(value: StageStatus) => updateFulfillment("profile_cutting", value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="partial">Partially Done</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                    </SelectContent>
                  </Select>}
              </AccordionContent>
            </AccordionItem>

            {/* Frames Welded */}
            <AccordionItem value="welding">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <StatusBadge status={fulfillment.welding_status === 'complete' ? 'complete' : fulfillment.welding_status === 'partial' ? 'partial' : 'not_started'} />
                  <span>Frames/Sashes Welded</span>
                  {order.windows_profile_status !== 'available' && <Badge variant="outline" className="ml-2 text-muted-foreground gap-1">
                      <Lock className="h-3 w-3" />
                      Profile {order.windows_profile_status === 'not_ordered' ? 'Not Ordered' : 'Ordered'}
                    </Badge>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                {order.windows_profile_status !== 'available' ? <p className="text-sm text-muted-foreground">Windows Profile must be available before this stage can be updated.</p> : <>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={fulfillment.welding_status || "not_started"} onValueChange={value => updateFulfillment("welding_status", value)}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="partial">Partially Done</SelectItem>
                          <SelectItem value="complete">Complete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {fulfillment.welding_status === 'partial' && <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea placeholder="Add notes about welding progress..." value={fulfillment.welding_notes || ""} onChange={e => updateFulfillment("welding_notes", e.target.value)} />
                      </div>}
                  </>}
              </AccordionContent>
            </AccordionItem>

            {/* Doors Assembled - only if order has doors */}
            {order.doors_count > 0 && <AccordionItem value="doors">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={fulfillment.doors_status === 'complete' ? 'complete' : fulfillment.doors_status === 'partial' ? 'partial' : 'not_started'} />
                    <span>Doors Assembled</span>
                    {order.hardware_status !== 'available' && <Badge variant="outline" className="ml-2 text-muted-foreground gap-1">
                        <Lock className="h-3 w-3" />
                        Hardware {order.hardware_status === 'not_ordered' ? 'Not Ordered' : 'Ordered'}
                      </Badge>}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  {order.hardware_status !== 'available' ? <p className="text-sm text-muted-foreground">Hardware must be available before this stage can be updated.</p> : <>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={fulfillment.doors_status || "not_started"} onValueChange={value => updateFulfillment("doors_status", value)}>
                          <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_started">Not Started</SelectItem>
                            <SelectItem value="partial">Partially Done</SelectItem>
                            <SelectItem value="complete">Complete</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {fulfillment.doors_status === 'partial' && <div className="space-y-2">
                          <Label>Notes</Label>
                          <Textarea placeholder="Add notes about door assembly..." value={fulfillment.doors_notes || ""} onChange={e => updateFulfillment("doors_notes", e.target.value)} />
                        </div>}
                      <div className="space-y-2">
                        <Label>Photo</Label>
                        <ImageUpload value={fulfillment.doors_image_url} onChange={url => updateFulfillment("doors_image_url", url)} folder={`doors/${order.id}`} disabled={saving} />
                      </div>
                    </>}
                </AccordionContent>
              </AccordionItem>}

            {/* Sliding Doors Assembled - only if order has sliding doors */}
            {order.has_sliding_doors && <AccordionItem value="sliding">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={fulfillment.sliding_doors_status === 'complete' ? 'complete' : fulfillment.sliding_doors_status === 'partial' ? 'partial' : 'not_started'} />
                    <span>Sliding Doors Assembled</span>
                    {order.hardware_status !== 'available' && <Badge variant="outline" className="ml-2 text-muted-foreground gap-1">
                        <Lock className="h-3 w-3" />
                        Hardware {order.hardware_status === 'not_ordered' ? 'Not Ordered' : 'Ordered'}
                      </Badge>}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  {order.hardware_status !== 'available' ? <p className="text-sm text-muted-foreground">Hardware must be available before this stage can be updated.</p> : <>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={fulfillment.sliding_doors_status || "not_started"} onValueChange={value => updateFulfillment("sliding_doors_status", value)}>
                          <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_started">Not Started</SelectItem>
                            <SelectItem value="partial">Partially Done</SelectItem>
                            <SelectItem value="complete">Complete</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {fulfillment.sliding_doors_status === 'partial' && <div className="space-y-2">
                          <Label>Notes</Label>
                          <Textarea placeholder="Add notes about sliding door assembly..." value={fulfillment.sliding_doors_notes || ""} onChange={e => updateFulfillment("sliding_doors_notes", e.target.value)} />
                        </div>}
                      <div className="space-y-2">
                        <Label>Photo</Label>
                        <ImageUpload value={fulfillment.sliding_doors_image_url} onChange={url => updateFulfillment("sliding_doors_image_url", url)} folder={`sliding-doors/${order.id}`} disabled={saving} />
                      </div>
                    </>}
                </AccordionContent>
              </AccordionItem>}

            {/* Frame & Sash Assembled */}
            <AccordionItem value="frame-sash">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <StatusBadge status={fulfillment.assembly_status === 'complete' ? 'complete' : fulfillment.assembly_status === 'partial' ? 'partial' : 'not_started'} />
                  <span>Frame & Sash Assembled</span>
                  {order.hardware_status !== 'available' && <Badge variant="outline" className="ml-2 text-muted-foreground gap-1">
                      <Lock className="h-3 w-3" />
                      Hardware {order.hardware_status === 'not_ordered' ? 'Not Ordered' : 'Ordered'}
                    </Badge>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                {order.hardware_status !== 'available' ? <p className="text-sm text-muted-foreground">Hardware must be available before this stage can be updated.</p> : <>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={fulfillment.assembly_status || "not_started"} onValueChange={value => updateFulfillment("assembly_status", value)}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="partial">Partially Done</SelectItem>
                          <SelectItem value="complete">Complete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {fulfillment.assembly_status === 'partial' && <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea placeholder="Add notes about assembly progress..." value={fulfillment.assembly_notes || ""} onChange={e => updateFulfillment("assembly_notes", e.target.value)} />
                      </div>}
                  </>}
              </AccordionContent>
            </AccordionItem>


            {/* Glass Installed */}
            <AccordionItem value="glass-install">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <StatusBadge status={fulfillment.glass_status === 'complete' ? 'complete' : fulfillment.glass_status === 'partial' ? 'partial' : 'not_started'} />
                  <span>Glass Installed</span>
                  {order.glass_status !== 'available' && <Badge variant="outline" className="ml-2 text-muted-foreground gap-1">
                      <Lock className="h-3 w-3" />
                      Glass {order.glass_status === 'not_ordered' ? 'Not Ordered' : 'Ordered'}
                    </Badge>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                {order.glass_status !== 'available' ? <p className="text-sm text-muted-foreground">Glass must be available before this stage can be updated.</p> : <>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={fulfillment.glass_status || "not_started"} onValueChange={value => updateFulfillment("glass_status", value)}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="partial">Partially Done</SelectItem>
                          <SelectItem value="complete">Complete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {fulfillment.glass_status === 'partial' && <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea placeholder="Add notes about glass installation..." value={fulfillment.glass_notes || ""} onChange={e => updateFulfillment("glass_notes", e.target.value)} />
                      </div>}
                  </>}
              </AccordionContent>
            </AccordionItem>

            {/* Made Screens */}
            <AccordionItem value="screens">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <StatusBadge status={fulfillment.screens_cutting === 'complete' ? 'complete' : fulfillment.screens_cutting === 'partial' ? 'partial' : 'not_started'} />
                  <span>Made Screens</span>
                  {order.screens_status !== 'available' && <Badge variant="outline" className="ml-2 text-muted-foreground gap-1">
                      <Lock className="h-3 w-3" />
                      Screens {order.screens_status === 'not_ordered' ? 'Not Ordered' : 'Ordered'}
                    </Badge>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                {order.screens_status !== 'available' ? <p className="text-sm text-muted-foreground">Screens must be available before this stage can be updated.</p> : <>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={fulfillment.screens_cutting || "not_started"} onValueChange={value => updateFulfillment("screens_cutting", value)}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="partial">Partially Done</SelectItem>
                          <SelectItem value="complete">Complete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes (reason if not complete, expected date)</Label>
                      <Textarea placeholder="Add notes about screens..." value={fulfillment.screens_notes || ""} onChange={e => updateFulfillment("screens_notes", e.target.value)} />
                    </div>
                  </>}
              </AccordionContent>
            </AccordionItem>

            {/* Custom Manufacturing Steps */}
            {customSteps.filter(s => s.step_type === 'manufacturing').map(step => <AccordionItem key={step.id} value={`custom-manufacturing-${step.id}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={step.status === 'complete' ? 'complete' : step.status === 'partial' ? 'partial' : 'not_started'} />
                    <span>{step.name}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={step.status} onValueChange={value => updateCustomStep(step.id, {
                    status: value
                  })}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_started">Not Started</SelectItem>
                        <SelectItem value="partial">Partially Done</SelectItem>
                        <SelectItem value="complete">Complete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea placeholder="Add notes..." value={step.notes || ""} onChange={e => updateCustomStep(step.id, {
                    notes: e.target.value
                  })} />
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => deleteCustomStep(step.id)} className="gap-1">
                    <Trash2 className="h-4 w-4" />
                    Delete Step
                  </Button>
                </AccordionContent>
              </AccordionItem>)}
          </Accordion>
        </CardContent>
      </Card>
      </div>
    </div>;
}