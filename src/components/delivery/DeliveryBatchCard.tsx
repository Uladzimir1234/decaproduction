import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Truck, Package, BoxIcon, Plus, Trash2, ChevronDown, ChevronUp, CalendarIcon, Pencil, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface DeliveryBatch {
  id: string;
  order_id: string;
  delivery_date: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface BatchShippingItem {
  id: string;
  batch_id: string;
  item_type: string;
  quantity: number;
  is_complete: boolean;
}

interface BatchDeliveryItem {
  id: string;
  batch_id: string;
  item_type: string;
  quantity: number;
  is_delivered: boolean;
}

interface BatchCustomShippingItem {
  id: string;
  batch_id: string;
  name: string;
  quantity: number;
  is_complete: boolean;
}

interface BatchCustomDeliveryItem {
  id: string;
  batch_id: string;
  name: string;
  quantity: number;
  is_delivered: boolean;
}

interface DeliveryBatchCardProps {
  batch: DeliveryBatch;
  shippingItems: BatchShippingItem[];
  deliveryItems: BatchDeliveryItem[];
  customShippingItems: BatchCustomShippingItem[];
  customDeliveryItems: BatchCustomDeliveryItem[];
  canEdit: boolean;
  isAdmin: boolean;
  onRefresh: () => void;
  onEdit: () => void;
  batchNumber: number;
}

const SHIPPING_ITEM_TYPES = [
  { key: 'handles', label: 'Handles in Box' },
  { key: 'hinges_covers', label: 'Hinges Covers' },
  { key: 'weeping_covers', label: 'Weeping Holes Covers' },
  { key: 'spec_labels', label: 'Spec Labels' },
  { key: 'nailing_fins', label: 'Nailing Fins Packed' },
  { key: 'brackets', label: 'Brackets Packed' },
];

const DELIVERY_ITEM_TYPES = [
  { key: 'windows', label: 'Windows' },
  { key: 'doors', label: 'Doors' },
  { key: 'sliding_doors', label: 'Sliding Doors' },
  { key: 'glass', label: 'Glass' },
  { key: 'screens', label: 'Screens' },
  { key: 'handles', label: 'Handles' },
  { key: 'nailing_fins', label: 'Nailing Fins' },
  { key: 'brackets', label: 'Installation Brackets' },
];

export function DeliveryBatchCard({
  batch,
  shippingItems,
  deliveryItems,
  customShippingItems,
  customDeliveryItems,
  canEdit,
  isAdmin,
  onRefresh,
  onEdit,
  batchNumber
}: DeliveryBatchCardProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [customShippingDialogOpen, setCustomShippingDialogOpen] = useState(false);
  const [customDeliveryDialogOpen, setCustomDeliveryDialogOpen] = useState(false);
  const [newCustomName, setNewCustomName] = useState("");
  const [newCustomQty, setNewCustomQty] = useState(1);
  const [saving, setSaving] = useState(false);
  const [markingShipped, setMarkingShipped] = useState(false);

  // Local state for quantities to prevent layout shift during edits
  const [localShippingQty, setLocalShippingQty] = useState<Record<string, number>>({});
  const [localDeliveryQty, setLocalDeliveryQty] = useState<Record<string, number>>({});

  // Calculate progress
  const totalShipping = shippingItems.length + customShippingItems.length;
  const completedShipping = shippingItems.filter(i => i.is_complete).length + 
    customShippingItems.filter(i => i.is_complete).length;
  
  const totalDelivery = deliveryItems.length + customDeliveryItems.length;
  const completedDelivery = deliveryItems.filter(i => i.is_delivered).length + 
    customDeliveryItems.filter(i => i.is_delivered).length;

  const isShipped = batch.status === 'shipped';

  const updateShippingItem = async (itemId: string, isComplete: boolean) => {
    try {
      const { error } = await supabase
        .from("batch_shipping_items")
        .update({ is_complete: isComplete })
        .eq("id", itemId);
      if (error) throw error;
      onRefresh();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateShippingQty = async (itemId: string, quantity: number) => {
    setLocalShippingQty(prev => ({ ...prev, [itemId]: quantity }));
    try {
      const { error } = await supabase
        .from("batch_shipping_items")
        .update({ quantity })
        .eq("id", itemId);
      if (error) throw error;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateDeliveryItem = async (itemId: string, isDelivered: boolean) => {
    try {
      const { error } = await supabase
        .from("batch_delivery_items")
        .update({ is_delivered: isDelivered })
        .eq("id", itemId);
      if (error) throw error;
      onRefresh();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateDeliveryQty = async (itemId: string, quantity: number) => {
    setLocalDeliveryQty(prev => ({ ...prev, [itemId]: quantity }));
    try {
      const { error } = await supabase
        .from("batch_delivery_items")
        .update({ quantity })
        .eq("id", itemId);
      if (error) throw error;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleCustomShipping = async (itemId: string, isComplete: boolean) => {
    try {
      const { error } = await supabase
        .from("batch_custom_shipping_items")
        .update({ is_complete: isComplete })
        .eq("id", itemId);
      if (error) throw error;
      onRefresh();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleCustomDelivery = async (itemId: string, isDelivered: boolean) => {
    try {
      const { error } = await supabase
        .from("batch_custom_delivery_items")
        .update({ is_delivered: isDelivered })
        .eq("id", itemId);
      if (error) throw error;
      onRefresh();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const addCustomShippingItem = async () => {
    if (!newCustomName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("batch_custom_shipping_items")
        .insert({ batch_id: batch.id, name: newCustomName.trim(), quantity: newCustomQty });
      if (error) throw error;
      setNewCustomName("");
      setNewCustomQty(1);
      setCustomShippingDialogOpen(false);
      onRefresh();
      toast({ title: "Item added", description: "Custom shipping item added" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addCustomDeliveryItem = async () => {
    if (!newCustomName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("batch_custom_delivery_items")
        .insert({ batch_id: batch.id, name: newCustomName.trim(), quantity: newCustomQty });
      if (error) throw error;
      setNewCustomName("");
      setNewCustomQty(1);
      setCustomDeliveryDialogOpen(false);
      onRefresh();
      toast({ title: "Item added", description: "Custom delivery item added" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomShipping = async (itemId: string) => {
    try {
      const { error } = await supabase.from("batch_custom_shipping_items").delete().eq("id", itemId);
      if (error) throw error;
      onRefresh();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deleteCustomDelivery = async (itemId: string) => {
    try {
      const { error } = await supabase.from("batch_custom_delivery_items").delete().eq("id", itemId);
      if (error) throw error;
      onRefresh();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deleteBatch = async () => {
    try {
      const { error } = await supabase.from("delivery_batches").delete().eq("id", batch.id);
      if (error) throw error;
      onRefresh();
      toast({ title: "Batch deleted", description: "Delivery batch removed" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const markAsShipped = async () => {
    setMarkingShipped(true);
    try {
      const { error } = await supabase
        .from("delivery_batches")
        .update({ status: 'shipped' })
        .eq("id", batch.id);
      if (error) throw error;
      onRefresh();
      toast({ title: "Batch shipped", description: "Delivery batch marked as shipped" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setMarkingShipped(false);
    }
  };

  const getItemLabel = (itemType: string, types: { key: string; label: string }[]) => {
    return types.find(t => t.key === itemType)?.label || itemType;
  };

  return (
    <Card className={`border-primary/20 ${isShipped ? 'bg-emerald-500/5 border-emerald-500/30' : ''}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80">
              {isShipped ? (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              ) : (
                <CalendarIcon className="h-4 w-4 text-primary" />
              )}
              <CardTitle className={`text-base ${isShipped ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                Delivery #{batchNumber} - {format(new Date(batch.delivery_date), "MMM dd, yyyy")}
              </CardTitle>
              {isShipped && (
                <Badge className="bg-emerald-500 hover:bg-emerald-500/90 text-white text-xs">Shipped</Badge>
              )}
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-blue-500/50 text-blue-600 dark:text-blue-400">
                <BoxIcon className="h-3 w-3 mr-1" />
                {completedShipping}/{totalShipping}
              </Badge>
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400">
                <Truck className="h-3 w-3 mr-1" />
                {completedDelivery}/{totalDelivery}
              </Badge>
              {canEdit && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={onEdit}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {isAdmin && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={deleteBatch}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Shipping Preparation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BoxIcon className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Shipping Preparation</span>
                </div>
                {canEdit && (
                  <Dialog open={customShippingDialogOpen} onOpenChange={setCustomShippingDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 gap-1">
                        <Plus className="h-3 w-3" />
                        Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Custom Shipping Item</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Item Name</Label>
                          <Input value={newCustomName} onChange={(e) => setNewCustomName(e.target.value)} placeholder="Item name" />
                        </div>
                        <div className="space-y-2">
                          <Label>Quantity</Label>
                          <Input type="number" min={1} value={newCustomQty} onChange={(e) => setNewCustomQty(Math.max(1, parseInt(e.target.value) || 1))} />
                        </div>
                        <Button onClick={addCustomShippingItem} disabled={saving || !newCustomName.trim()} className="w-full">
                          {saving ? "Adding..." : "Add Item"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 auto-rows-fr">
                {shippingItems.map((item, index) => (
                  <div key={item.id} style={{ order: index }} className={`flex items-center gap-2 p-2 rounded-lg border text-sm h-10 ${item.is_complete ? 'bg-blue-500/10 border-blue-500/30' : 'bg-card border-border'}`}>
                    <Checkbox checked={item.is_complete} onCheckedChange={(c) => updateShippingItem(item.id, c as boolean)} disabled={!canEdit} className="shrink-0" />
                    <span className={`flex-1 min-w-0 truncate ${item.is_complete ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                      {getItemLabel(item.item_type, SHIPPING_ITEM_TYPES)}
                    </span>
                    {canEdit ? (
                      <Input type="number" min={0} value={localShippingQty[item.id] ?? item.quantity} onChange={(e) => updateShippingQty(item.id, parseInt(e.target.value) || 0)} className="w-16 h-6 text-xs text-center p-1 shrink-0" />
                    ) : item.quantity > 0 && (
                      <Badge variant="secondary" className="text-xs shrink-0">×{item.quantity}</Badge>
                    )}
                  </div>
                ))}
                {customShippingItems.map((item, index) => (
                  <div key={item.id} style={{ order: shippingItems.length + index }} className={`flex items-center gap-2 p-2 rounded-lg border border-dashed text-sm h-10 ${item.is_complete ? 'bg-blue-500/10 border-blue-500/30' : 'bg-card border-border'}`}>
                    <Checkbox checked={item.is_complete} onCheckedChange={(c) => toggleCustomShipping(item.id, c as boolean)} disabled={!canEdit} className="shrink-0" />
                    <span className={`flex-1 min-w-0 truncate ${item.is_complete ? 'text-blue-600 dark:text-blue-400' : ''}`}>{item.name}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">×{item.quantity}</Badge>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => deleteCustomShipping(item.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Delivery Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">Delivery Items</span>
                </div>
                {canEdit && (
                  <Dialog open={customDeliveryDialogOpen} onOpenChange={setCustomDeliveryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 gap-1">
                        <Plus className="h-3 w-3" />
                        Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Custom Delivery Item</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Item Name</Label>
                          <Input value={newCustomName} onChange={(e) => setNewCustomName(e.target.value)} placeholder="Item name" />
                        </div>
                        <div className="space-y-2">
                          <Label>Quantity</Label>
                          <Input type="number" min={1} value={newCustomQty} onChange={(e) => setNewCustomQty(Math.max(1, parseInt(e.target.value) || 1))} />
                        </div>
                        <Button onClick={addCustomDeliveryItem} disabled={saving || !newCustomName.trim()} className="w-full">
                          {saving ? "Adding..." : "Add Item"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 auto-rows-fr">
                {deliveryItems.map((item, index) => (
                  <div key={item.id} style={{ order: index }} className={`flex items-center gap-2 p-2 rounded-lg border text-sm h-10 ${item.is_delivered ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-card border-border'}`}>
                    <Checkbox checked={item.is_delivered} onCheckedChange={(c) => updateDeliveryItem(item.id, c as boolean)} disabled={!canEdit} className="shrink-0" />
                    <span className={`flex-1 min-w-0 truncate ${item.is_delivered ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                      {getItemLabel(item.item_type, DELIVERY_ITEM_TYPES)}
                    </span>
                    {canEdit ? (
                      <Input type="number" min={0} value={localDeliveryQty[item.id] ?? item.quantity} onChange={(e) => updateDeliveryQty(item.id, parseInt(e.target.value) || 0)} className="w-16 h-6 text-xs text-center p-1 shrink-0" />
                    ) : item.quantity > 0 && (
                      <Badge variant="secondary" className="text-xs shrink-0">×{item.quantity}</Badge>
                    )}
                  </div>
                ))}
                {customDeliveryItems.map((item, index) => (
                  <div key={item.id} style={{ order: deliveryItems.length + index }} className={`flex items-center gap-2 p-2 rounded-lg border border-dashed text-sm h-10 ${item.is_delivered ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-card border-border'}`}>
                    <Checkbox checked={item.is_delivered} onCheckedChange={(c) => toggleCustomDelivery(item.id, c as boolean)} disabled={!canEdit} className="shrink-0" />
                    <span className={`flex-1 min-w-0 truncate ${item.is_delivered ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{item.name}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">×{item.quantity}</Badge>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => deleteCustomDelivery(item.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Mark as Shipped Button */}
            {canEdit && !isShipped && (
              <div className="pt-4 border-t border-border">
                <Button 
                  onClick={markAsShipped} 
                  disabled={markingShipped}
                  className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <Truck className="h-4 w-4" />
                  {markingShipped ? "Marking as Shipped..." : "Mark as Shipped"}
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}