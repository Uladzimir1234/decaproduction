import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import { createAuditLog } from "@/lib/auditLog";
import { Truck, Package, AlertTriangle, CheckCircle2, Plus, Calendar, BoxIcon, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface CustomShippingItem {
  id: string;
  order_id: string;
  name: string;
  quantity: number;
  is_complete: boolean;
  created_at: string;
}

interface CustomDeliveryItem {
  id: string;
  order_id: string;
  name: string;
  is_delivered: boolean;
  created_at: string;
}

interface DeliveryLog {
  id: string;
  order_id: string;
  delivery_date: string;
  items_delivered: string;
  notes: string | null;
  created_at: string;
}

interface DeliveryFulfillment {
  windows_delivered: boolean;
  doors_delivered: boolean;
  sliding_doors_delivered: boolean;
  screens_delivered_final: boolean;
  handles_delivered: boolean;
  glass_delivered_final: boolean;
  nailing_fins_delivered: boolean;
  brackets_delivered: boolean;
  delivery_notes: string | null;
  // Shipping preparation fields
  shipping_handles_boxed: boolean;
  shipping_hinges_covers: boolean;
  shipping_weeping_covers: boolean;
  shipping_spec_labels: boolean;
  shipping_nailing_fins: boolean;
  shipping_brackets: boolean;
  // Shipping quantities
  shipping_handles_qty: number;
  shipping_hinges_qty: number;
  shipping_weeping_qty: number;
  shipping_labels_qty: number;
  shipping_fins_qty: number;
  shipping_brackets_qty: number;
}

interface OrderInfo {
  id: string;
  order_number: string;
  windows_count: number;
  doors_count: number;
  sliding_doors_count: number;
  has_sliding_doors: boolean;
  screen_type: string | null;
  delivery_complete: boolean;
}

interface DeliveryTrackingSectionProps {
  order: OrderInfo;
  fulfillment: DeliveryFulfillment | null;
  onUpdate: (key: string, value: any) => void;
  manufacturingProgress: number;
}

const DELIVERY_ITEMS = [
  { key: 'windows_delivered', label: 'Windows', icon: Package },
  { key: 'doors_delivered', label: 'Doors', icon: Package },
  { key: 'sliding_doors_delivered', label: 'Sliding Doors', icon: Package },
  { key: 'glass_delivered_final', label: 'Glass', icon: Package },
  { key: 'screens_delivered_final', label: 'Screens', icon: Package },
  { key: 'handles_delivered', label: 'Handles', icon: Package },
  { key: 'nailing_fins_delivered', label: 'Nailing Fins', icon: Package },
  { key: 'brackets_delivered', label: 'Installation Brackets', icon: Package },
] as const;

const SHIPPING_PREP_ITEMS = [
  { key: 'shipping_handles_boxed', qtyKey: 'shipping_handles_qty', label: 'Handles in Box', description: 'Gather window handles in box' },
  { key: 'shipping_hinges_covers', qtyKey: 'shipping_hinges_qty', label: 'Hinges Covers', description: 'Windows hinges covers' },
  { key: 'shipping_weeping_covers', qtyKey: 'shipping_weeping_qty', label: 'Weeping Holes Covers', description: 'Weeping holes covers' },
  { key: 'shipping_spec_labels', qtyKey: 'shipping_labels_qty', label: 'Spec Labels', description: 'Print & stick glass spec labels' },
  { key: 'shipping_nailing_fins', qtyKey: 'shipping_fins_qty', label: 'Nailing Fins Packed', description: 'Put nailing fins around windows' },
  { key: 'shipping_brackets', qtyKey: 'shipping_brackets_qty', label: 'Brackets Packed', description: 'Metal installation brackets' },
] as const;

export function DeliveryTrackingSection({ 
  order, 
  fulfillment, 
  onUpdate,
  manufacturingProgress 
}: DeliveryTrackingSectionProps) {
  const { toast } = useToast();
  const { canUpdateManufacturing, isWorker, isSeller } = useRole();
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDeliveryDate, setNewDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDeliveryItems, setNewDeliveryItems] = useState("");
  const [newDeliveryNotes, setNewDeliveryNotes] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Custom shipping items state
  const [customShippingItems, setCustomShippingItems] = useState<CustomShippingItem[]>([]);
  const [customItemDialogOpen, setCustomItemDialogOpen] = useState(false);
  const [newCustomItemName, setNewCustomItemName] = useState("");
  const [newCustomItemQty, setNewCustomItemQty] = useState(1);

  // Custom delivery items state
  const [customDeliveryItems, setCustomDeliveryItems] = useState<CustomDeliveryItem[]>([]);
  const [customDeliveryDialogOpen, setCustomDeliveryDialogOpen] = useState(false);
  const [newCustomDeliveryName, setNewCustomDeliveryName] = useState("");

  useEffect(() => {
    fetchDeliveryLogs();
    fetchCustomShippingItems();
    fetchCustomDeliveryItems();
  }, [order.id]);

  const fetchCustomShippingItems = async () => {
    const { data, error } = await supabase
      .from("custom_shipping_items")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setCustomShippingItems(data as CustomShippingItem[]);
    }
  };

  const addCustomShippingItem = async () => {
    if (!newCustomItemName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an item name",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("custom_shipping_items")
        .insert({
          order_id: order.id,
          name: newCustomItemName.trim(),
          quantity: newCustomItemQty,
          is_complete: false
        })
        .select()
        .single();

      if (error) throw error;

      setCustomShippingItems([...customShippingItems, data as CustomShippingItem]);
      setNewCustomItemName("");
      setNewCustomItemQty(1);
      setCustomItemDialogOpen(false);
      
      toast({
        title: "Item added",
        description: "Custom shipping item added successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add item",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleCustomItem = async (itemId: string, isComplete: boolean) => {
    try {
      const { error } = await supabase
        .from("custom_shipping_items")
        .update({ is_complete: isComplete })
        .eq("id", itemId);

      if (error) throw error;

      setCustomShippingItems(prev => 
        prev.map(item => item.id === itemId ? { ...item, is_complete: isComplete } : item)
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive"
      });
    }
  };

  const deleteCustomItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("custom_shipping_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      setCustomShippingItems(prev => prev.filter(item => item.id !== itemId));
      
      toast({
        title: "Item deleted",
        description: "Custom shipping item removed"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive"
      });
    }
  };

  // Custom delivery items functions
  const fetchCustomDeliveryItems = async () => {
    const { data, error } = await supabase
      .from("custom_delivery_items")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setCustomDeliveryItems(data as CustomDeliveryItem[]);
    }
  };

  const addCustomDeliveryItem = async () => {
    if (!newCustomDeliveryName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an item name",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("custom_delivery_items")
        .insert({
          order_id: order.id,
          name: newCustomDeliveryName.trim(),
          is_delivered: false
        })
        .select()
        .single();

      if (error) throw error;

      setCustomDeliveryItems([...customDeliveryItems, data as CustomDeliveryItem]);
      setNewCustomDeliveryName("");
      setCustomDeliveryDialogOpen(false);
      
      toast({
        title: "Item added",
        description: "Custom delivery item added successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add item",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleCustomDeliveryItem = async (itemId: string, isDelivered: boolean) => {
    try {
      const { error } = await supabase
        .from("custom_delivery_items")
        .update({ is_delivered: isDelivered })
        .eq("id", itemId);

      if (error) throw error;

      setCustomDeliveryItems(prev => 
        prev.map(item => item.id === itemId ? { ...item, is_delivered: isDelivered } : item)
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive"
      });
    }
  };

  const deleteCustomDeliveryItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("custom_delivery_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      setCustomDeliveryItems(prev => prev.filter(item => item.id !== itemId));
      
      toast({
        title: "Item deleted",
        description: "Custom delivery item removed"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive"
      });
    }
  };

  const fetchDeliveryLogs = async () => {
    const { data, error } = await supabase
      .from("order_delivery_log")
      .select("*")
      .eq("order_id", order.id)
      .order("delivery_date", { ascending: false });

    if (!error && data) {
      setDeliveryLogs(data as DeliveryLog[]);
    }
  };

  const addDeliveryLog = async () => {
    if (!newDeliveryItems.trim()) {
      toast({
        title: "Error",
        description: "Please specify what was delivered",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("order_delivery_log")
        .insert({
          order_id: order.id,
          delivery_date: newDeliveryDate,
          items_delivered: newDeliveryItems.trim(),
          notes: newDeliveryNotes.trim() || null,
          created_by: userData.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setDeliveryLogs([data as DeliveryLog, ...deliveryLogs]);
      
      await createAuditLog({
        action: 'delivery_logged',
        description: `Logged delivery for order #${order.order_number}: ${newDeliveryItems.trim()}`,
        entityType: 'order',
        entityId: order.id,
      });

      toast({
        title: "Delivery logged",
        description: "Delivery record added successfully"
      });

      setNewDeliveryDate(new Date().toISOString().split('T')[0]);
      setNewDeliveryItems("");
      setNewDeliveryNotes("");
      setDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to log delivery",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeliveryItemChange = async (key: string, checked: boolean) => {
    onUpdate(key, checked);
    
    await createAuditLog({
      action: 'delivery_item_updated',
      description: `Marked ${key.replace(/_/g, ' ')} as ${checked ? 'delivered' : 'not delivered'} for order #${order.order_number}`,
      entityType: 'order_fulfillment',
      entityId: order.id,
    });
  };

  const markOrderComplete = async () => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ delivery_complete: true })
        .eq("id", order.id);

      if (error) throw error;

      await createAuditLog({
        action: 'order_completed',
        description: `Marked order #${order.order_number} as complete`,
        entityType: 'order',
        entityId: order.id,
      });

      toast({
        title: "Order Complete",
        description: "Order has been marked as complete"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete order",
        variant: "destructive"
      });
    }
  };

  // Filter delivery items based on order
  const applicableItems = DELIVERY_ITEMS.filter(item => {
    if (item.key === 'sliding_doors_delivered' && !order.has_sliding_doors) return false;
    if (item.key === 'screens_delivered_final' && !order.screen_type) return false;
    return true;
  });

  // Calculate delivery progress (including custom items)
  const builtInDeliveredCount = applicableItems.filter(item => 
    fulfillment?.[item.key as keyof DeliveryFulfillment] === true
  ).length;
  const customDeliveredCount = customDeliveryItems.filter(item => item.is_delivered).length;
  const deliveredCount = builtInDeliveredCount + customDeliveredCount;
  const totalItems = applicableItems.length + customDeliveryItems.length;
  const allDelivered = deliveredCount === totalItems && totalItems > 0;

  // Get pending items (built-in only for warning display)
  const pendingItems = applicableItems.filter(item => 
    fulfillment?.[item.key as keyof DeliveryFulfillment] !== true
  );
  const pendingCustomItems = customDeliveryItems.filter(item => !item.is_delivered);

  // Calculate shipping prep progress (including custom items)
  const builtInShippingComplete = SHIPPING_PREP_ITEMS.filter(item =>
    fulfillment?.[item.key as keyof DeliveryFulfillment] === true
  ).length;
  const customItemsComplete = customShippingItems.filter(item => item.is_complete).length;
  const shippingPrepCount = builtInShippingComplete + customItemsComplete;
  const totalShippingSteps = SHIPPING_PREP_ITEMS.length + customShippingItems.length;
  const allShippingComplete = shippingPrepCount === totalShippingSteps && totalShippingSteps > 0;

  const isLocked = manufacturingProgress < 90;
  const canEdit = canUpdateManufacturing && !isSeller;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Shipping & Delivery</CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={allShippingComplete ? "default" : "outline"} className={allShippingComplete ? "bg-blue-500" : "border-blue-500/50 text-blue-600 dark:text-blue-400"}>
              <BoxIcon className="h-3 w-3 mr-1" />
              {shippingPrepCount}/{totalShippingSteps} Packed
            </Badge>
            <Badge variant={allDelivered ? "default" : "outline"} className={allDelivered ? "bg-emerald-500" : ""}>
              {deliveredCount}/{totalItems} Delivered
            </Badge>
          </div>
        </div>
        <CardDescription>
          Prepare order for shipping and track deliveries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Shipping Preparation Checklist */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BoxIcon className="h-4 w-4 text-blue-500" />
              <h4 className="text-sm font-medium">Shipping Preparation</h4>
              {allShippingComplete && (
                <Badge variant="secondary" className="text-xs gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Ready to Ship
                </Badge>
              )}
            </div>
            {canEdit && (
              <Dialog open={customItemDialogOpen} onOpenChange={setCustomItemDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Custom Shipping Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Item Name</Label>
                      <Input
                        placeholder="e.g., Safety caps, Extra screws"
                        value={newCustomItemName}
                        onChange={(e) => setNewCustomItemName(e.target.value)}
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity Required</Label>
                      <Input
                        type="number"
                        min={1}
                        value={newCustomItemQty}
                        onChange={(e) => setNewCustomItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                    <Button 
                      onClick={addCustomShippingItem} 
                      disabled={saving || !newCustomItemName.trim()}
                      className="w-full"
                    >
                      {saving ? "Adding..." : "Add Item"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SHIPPING_PREP_ITEMS.map(item => {
              const isChecked = fulfillment?.[item.key as keyof DeliveryFulfillment] === true;
              const quantity = (fulfillment as any)?.[item.qtyKey] || 0;
              return (
                <div 
                  key={item.key}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    isChecked 
                      ? 'bg-blue-500/10 border-blue-500/30' 
                      : 'bg-card border-border'
                  }`}
                >
                  <Checkbox
                    id={item.key}
                    checked={isChecked}
                    onCheckedChange={(checked) => handleDeliveryItemChange(item.key, checked as boolean)}
                    disabled={!canEdit}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <Label 
                        htmlFor={item.key} 
                        className={`text-sm font-medium cursor-pointer ${isChecked ? 'text-blue-600 dark:text-blue-400' : ''}`}
                      >
                        {item.label}
                      </Label>
                      {canEdit ? (
                        <Input
                          type="number"
                          min={0}
                          value={quantity}
                          onChange={(e) => onUpdate(item.qtyKey, parseInt(e.target.value) || 0)}
                          className="w-16 h-6 text-xs text-center p-1"
                          placeholder="Qty"
                        />
                      ) : quantity > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          ×{quantity}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                </div>
              );
            })}
            {/* Custom shipping items */}
            {customShippingItems.map(item => (
              <div 
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-lg border border-dashed transition-colors ${
                  item.is_complete 
                    ? 'bg-blue-500/10 border-blue-500/30' 
                    : 'bg-card border-border'
                }`}
              >
                <Checkbox
                  id={`custom-${item.id}`}
                  checked={item.is_complete}
                  onCheckedChange={(checked) => toggleCustomItem(item.id, checked as boolean)}
                  disabled={!canEdit}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <Label 
                      htmlFor={`custom-${item.id}`}
                      className={`text-sm font-medium cursor-pointer ${item.is_complete ? 'text-blue-600 dark:text-blue-400' : ''}`}
                    >
                      {item.name}
                    </Label>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">
                        ×{item.quantity}
                      </Badge>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteCustomItem(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Custom item</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Delivery Items Checklist */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-500" />
              <h4 className="text-sm font-medium">Delivery Tracking</h4>
              {isLocked && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Manufacturing {"<"}90%
                </Badge>
              )}
            </div>
            {canEdit && !isLocked && (
              <Dialog open={customDeliveryDialogOpen} onOpenChange={setCustomDeliveryDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Custom Delivery Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Item Name</Label>
                      <Input
                        placeholder="e.g., Extra parts, Special hardware"
                        value={newCustomDeliveryName}
                        onChange={(e) => setNewCustomDeliveryName(e.target.value)}
                        maxLength={100}
                      />
                    </div>
                    <Button 
                      onClick={addCustomDeliveryItem} 
                      disabled={saving || !newCustomDeliveryName.trim()}
                      className="w-full"
                    >
                      {saving ? "Adding..." : "Add Item"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {applicableItems.map(item => {
              const isChecked = fulfillment?.[item.key as keyof DeliveryFulfillment] === true;
              return (
                <div 
                  key={item.key}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    isChecked 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-card border-border'
                  } ${isLocked ? 'opacity-60' : ''}`}
                >
                  <Checkbox
                    id={item.key}
                    checked={isChecked}
                    onCheckedChange={(checked) => handleDeliveryItemChange(item.key, checked as boolean)}
                    disabled={isLocked || !canEdit}
                  />
                  <Label 
                    htmlFor={item.key} 
                    className={`text-sm cursor-pointer ${isChecked ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                  >
                    {item.label}
                  </Label>
                </div>
              );
            })}
            {/* Custom delivery items */}
            {customDeliveryItems.map(item => (
              <div 
                key={item.id}
                className={`flex items-center justify-between gap-2 p-3 rounded-lg border border-dashed transition-colors ${
                  item.is_delivered 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : 'bg-card border-border'
                } ${isLocked ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`delivery-custom-${item.id}`}
                    checked={item.is_delivered}
                    onCheckedChange={(checked) => toggleCustomDeliveryItem(item.id, checked as boolean)}
                    disabled={isLocked || !canEdit}
                  />
                  <Label 
                    htmlFor={`delivery-custom-${item.id}`}
                    className={`text-sm cursor-pointer ${item.is_delivered ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                  >
                    {item.name}
                  </Label>
                </div>
                {canEdit && !isLocked && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteCustomDeliveryItem(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pending Delivery Warning */}
        {(pendingItems.length > 0 || pendingCustomItems.length > 0) && !isLocked && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Pending Delivery ({pendingItems.length + pendingCustomItems.length} items)
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {[...pendingItems.map(i => i.label), ...pendingCustomItems.map(i => i.name)].join(', ')} still need to be delivered
              </p>
            </div>
          </div>
        )}

        {/* Delivery Notes */}
        <div className="space-y-2">
          <Label>Delivery Notes</Label>
          <Textarea
            placeholder="Add notes about pending deliveries, special instructions, etc."
            value={fulfillment?.delivery_notes || ''}
            onChange={(e) => onUpdate('delivery_notes', e.target.value)}
            disabled={isLocked || !canEdit}
            className="resize-none"
            rows={2}
          />
        </div>

        <Separator />

        {/* Delivery History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Delivery History
            </h4>
            {canEdit && !isLocked && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    Log Delivery
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Log Delivery</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Delivery Date</Label>
                      <Input
                        type="date"
                        value={newDeliveryDate}
                        onChange={(e) => setNewDeliveryDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Items Delivered</Label>
                      <Input
                        placeholder="e.g., 5 windows, 2 doors, handles"
                        value={newDeliveryItems}
                        onChange={(e) => setNewDeliveryItems(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes (optional)</Label>
                      <Textarea
                        placeholder="Any additional notes about this delivery"
                        value={newDeliveryNotes}
                        onChange={(e) => setNewDeliveryNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <Button 
                      onClick={addDeliveryLog} 
                      disabled={saving || !newDeliveryItems.trim()}
                      className="w-full"
                    >
                      {saving ? "Saving..." : "Log Delivery"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {deliveryLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No deliveries logged yet
            </p>
          ) : (
            <div className="space-y-2">
              {deliveryLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  <Package className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {format(new Date(log.delivery_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{log.items_delivered}</p>
                    {log.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{log.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mark Complete Button */}
        {allDelivered && !order.delivery_complete && canEdit && (
          <Button 
            onClick={markOrderComplete}
            className="w-full gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark Order Complete
          </Button>
        )}

        {order.delivery_complete && (
          <div className="flex items-center justify-center gap-2 py-4 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Order Complete</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}