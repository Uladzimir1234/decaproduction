import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import { Truck, Plus, CalendarIcon, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DeliveryBatchCard } from "./DeliveryBatchCard";

interface OrderInfo {
  id: string;
  order_number: string;
  windows_count: number;
  doors_count: number;
  sliding_doors_count: number;
  has_sliding_doors: boolean;
  screen_type: string | null;
}

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

interface DeliveryBatchSectionProps {
  order: OrderInfo;
  manufacturingProgress: number;
}

const SHIPPING_ITEM_TYPES = [
  { key: 'handles', label: 'Handles in Box', defaultQty: 0 },
  { key: 'hinges_covers', label: 'Hinges Covers', defaultQty: 0 },
  { key: 'weeping_covers', label: 'Weeping Holes Covers', defaultQty: 0 },
  { key: 'spec_labels', label: 'Spec Labels', defaultQty: 0 },
  { key: 'nailing_fins', label: 'Nailing Fins Packed', defaultQty: 0 },
  { key: 'brackets', label: 'Brackets Packed', defaultQty: 0 },
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

export function DeliveryBatchSection({ order, manufacturingProgress }: DeliveryBatchSectionProps) {
  const { toast } = useToast();
  const { canUpdateManufacturing, isSeller, isAdmin } = useRole();
  const [batches, setBatches] = useState<DeliveryBatch[]>([]);
  const [batchShippingItems, setBatchShippingItems] = useState<Record<string, BatchShippingItem[]>>({});
  const [batchDeliveryItems, setBatchDeliveryItems] = useState<Record<string, BatchDeliveryItem[]>>({});
  const [batchCustomShipping, setBatchCustomShipping] = useState<Record<string, BatchCustomShippingItem[]>>({});
  const [batchCustomDelivery, setBatchCustomDelivery] = useState<Record<string, BatchCustomDeliveryItem[]>>({});
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [newBatchDate, setNewBatchDate] = useState<Date | undefined>(new Date());
  const [selectedShippingItems, setSelectedShippingItems] = useState<Record<string, { selected: boolean; qty: number }>>({});
  const [selectedDeliveryItems, setSelectedDeliveryItems] = useState<Record<string, { selected: boolean; qty: number }>>({});
  const [saving, setSaving] = useState(false);
  
  // Custom items for new batch
  const [newCustomShippingItems, setNewCustomShippingItems] = useState<{ name: string; qty: number }[]>([]);
  const [newCustomDeliveryItems, setNewCustomDeliveryItems] = useState<{ name: string; qty: number }[]>([]);
  const [customShippingName, setCustomShippingName] = useState("");
  const [customShippingQty, setCustomShippingQty] = useState(1);
  const [customDeliveryName, setCustomDeliveryName] = useState("");
  const [customDeliveryQty, setCustomDeliveryQty] = useState(1);

  const canEdit = canUpdateManufacturing && !isSeller;

  const fetchBatches = useCallback(async () => {
    const { data, error } = await supabase
      .from("delivery_batches")
      .select("*")
      .eq("order_id", order.id)
      .order("delivery_date", { ascending: true });

    if (!error && data) {
      setBatches(data);
      // Fetch items for each batch
      for (const batch of data) {
        fetchBatchItems(batch.id);
      }
    }
  }, [order.id]);

  const fetchBatchItems = async (batchId: string) => {
    const [shippingRes, deliveryRes, customShipRes, customDelRes] = await Promise.all([
      supabase.from("batch_shipping_items").select("*").eq("batch_id", batchId),
      supabase.from("batch_delivery_items").select("*").eq("batch_id", batchId),
      supabase.from("batch_custom_shipping_items").select("*").eq("batch_id", batchId),
      supabase.from("batch_custom_delivery_items").select("*").eq("batch_id", batchId),
    ]);

    setBatchShippingItems(prev => ({ ...prev, [batchId]: shippingRes.data || [] }));
    setBatchDeliveryItems(prev => ({ ...prev, [batchId]: deliveryRes.data || [] }));
    setBatchCustomShipping(prev => ({ ...prev, [batchId]: customShipRes.data || [] }));
    setBatchCustomDelivery(prev => ({ ...prev, [batchId]: customDelRes.data || [] }));
  };

  useEffect(() => {
    fetchBatches();

    // Subscribe to real-time updates on delivery_batches for this order
    const batchesChannel = supabase
      .channel(`deliverybatches-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_batches',
          filter: `order_id=eq.${order.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newBatch = payload.new as DeliveryBatch;
            setBatches(prev => [...prev, newBatch]);
            fetchBatchItems(newBatch.id);
          } else if (payload.eventType === 'UPDATE') {
            setBatches(prev => prev.map(batch => 
              batch.id === payload.new.id ? { ...batch, ...payload.new } : batch
            ));
          } else if (payload.eventType === 'DELETE') {
            setBatches(prev => prev.filter(batch => batch.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(batchesChannel);
    };
  }, [fetchBatches, order.id]);

  const initNewBatch = () => {
    setEditingBatchId(null);
    const shippingInit: Record<string, { selected: boolean; qty: number }> = {};
    SHIPPING_ITEM_TYPES.forEach(item => {
      shippingInit[item.key] = { selected: true, qty: 0 };
    });
    setSelectedShippingItems(shippingInit);

    const deliveryInit: Record<string, { selected: boolean; qty: number }> = {};
    DELIVERY_ITEM_TYPES.forEach(item => {
      deliveryInit[item.key] = { selected: false, qty: 0 };
    });
    setSelectedDeliveryItems(deliveryInit);
    setNewBatchDate(new Date());
    setNewCustomShippingItems([]);
    setNewCustomDeliveryItems([]);
    setCustomShippingName("");
    setCustomShippingQty(1);
    setCustomDeliveryName("");
    setCustomDeliveryQty(1);
  };

  const initEditBatch = (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;
    
    setEditingBatchId(batchId);
    setNewBatchDate(new Date(batch.delivery_date));
    
    // Initialize shipping items from existing batch data
    const shippingItems = batchShippingItems[batchId] || [];
    const shippingInit: Record<string, { selected: boolean; qty: number }> = {};
    SHIPPING_ITEM_TYPES.forEach(item => {
      const existing = shippingItems.find(si => si.item_type === item.key);
      shippingInit[item.key] = { selected: !!existing, qty: existing?.quantity || 0 };
    });
    setSelectedShippingItems(shippingInit);
    
    // Initialize delivery items from existing batch data
    const deliveryItems = batchDeliveryItems[batchId] || [];
    const deliveryInit: Record<string, { selected: boolean; qty: number }> = {};
    DELIVERY_ITEM_TYPES.forEach(item => {
      const existing = deliveryItems.find(di => di.item_type === item.key);
      deliveryInit[item.key] = { selected: !!existing && existing.quantity > 0, qty: existing?.quantity || 0 };
    });
    setSelectedDeliveryItems(deliveryInit);
    
    // Initialize custom items
    const customShipping = batchCustomShipping[batchId] || [];
    setNewCustomShippingItems(customShipping.map(cs => ({ name: cs.name, qty: cs.quantity })));
    
    const customDelivery = batchCustomDelivery[batchId] || [];
    setNewCustomDeliveryItems(customDelivery.map(cd => ({ name: cd.name, qty: cd.quantity })));
    
    setCustomShippingName("");
    setCustomShippingQty(1);
    setCustomDeliveryName("");
    setCustomDeliveryQty(1);
    
    setDialogOpen(true);
  };

  const addCustomShippingToList = () => {
    if (!customShippingName.trim()) return;
    setNewCustomShippingItems([...newCustomShippingItems, { name: customShippingName.trim(), qty: customShippingQty }]);
    setCustomShippingName("");
    setCustomShippingQty(1);
  };

  const removeCustomShippingFromList = (index: number) => {
    setNewCustomShippingItems(newCustomShippingItems.filter((_, i) => i !== index));
  };

  const addCustomDeliveryToList = () => {
    if (!customDeliveryName.trim()) return;
    setNewCustomDeliveryItems([...newCustomDeliveryItems, { name: customDeliveryName.trim(), qty: customDeliveryQty }]);
    setCustomDeliveryName("");
    setCustomDeliveryQty(1);
  };

  const removeCustomDeliveryFromList = (index: number) => {
    setNewCustomDeliveryItems(newCustomDeliveryItems.filter((_, i) => i !== index));
  };

  const saveBatch = async () => {
    if (!newBatchDate) {
      toast({ title: "Error", description: "Please select a delivery date", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      let batchId: string;
      
      if (editingBatchId) {
        // Update existing batch
        const { error: batchError } = await supabase
          .from("delivery_batches")
          .update({
            delivery_date: format(newBatchDate, "yyyy-MM-dd"),
          })
          .eq("id", editingBatchId);
        if (batchError) throw batchError;
        batchId = editingBatchId;
        
        // Delete existing items and re-insert
        await supabase.from("batch_shipping_items").delete().eq("batch_id", batchId);
        await supabase.from("batch_delivery_items").delete().eq("batch_id", batchId);
        await supabase.from("batch_custom_shipping_items").delete().eq("batch_id", batchId);
        await supabase.from("batch_custom_delivery_items").delete().eq("batch_id", batchId);
      } else {
        // Create the batch
        const { data: batchData, error: batchError } = await supabase
          .from("delivery_batches")
          .insert({
            order_id: order.id,
            delivery_date: format(newBatchDate, "yyyy-MM-dd"),
            status: 'preparing',
            created_by: userData.user?.id
          })
          .select()
          .single();

        if (batchError) throw batchError;
        batchId = batchData.id;
      }

      // Insert shipping items
      const shippingToInsert = Object.entries(selectedShippingItems)
        .filter(([_, val]) => val.selected)
        .map(([key, val]) => ({
          batch_id: batchId,
          item_type: key,
          quantity: val.qty,
          is_complete: false
        }));

      if (shippingToInsert.length > 0) {
        const { error: shippingError } = await supabase
          .from("batch_shipping_items")
          .insert(shippingToInsert);
        if (shippingError) throw shippingError;
      }

      // Insert delivery items
      const deliveryToInsert = Object.entries(selectedDeliveryItems)
        .filter(([_, val]) => val.selected && val.qty > 0)
        .map(([key, val]) => ({
          batch_id: batchId,
          item_type: key,
          quantity: val.qty,
          is_delivered: false
        }));

      if (deliveryToInsert.length > 0) {
        const { error: deliveryError } = await supabase
          .from("batch_delivery_items")
          .insert(deliveryToInsert);
        if (deliveryError) throw deliveryError;
      }

      // Insert custom shipping items
      if (newCustomShippingItems.length > 0) {
        const customShipToInsert = newCustomShippingItems.map(item => ({
          batch_id: batchId,
          name: item.name,
          quantity: item.qty,
          is_complete: false
        }));
        const { error: customShipError } = await supabase
          .from("batch_custom_shipping_items")
          .insert(customShipToInsert);
        if (customShipError) throw customShipError;
      }

      // Insert custom delivery items
      if (newCustomDeliveryItems.length > 0) {
        const customDelToInsert = newCustomDeliveryItems.map(item => ({
          batch_id: batchId,
          name: item.name,
          quantity: item.qty,
          is_delivered: false
        }));
        const { error: customDelError } = await supabase
          .from("batch_custom_delivery_items")
          .insert(customDelToInsert);
        if (customDelError) throw customDelError;
      }

      toast({ 
        title: editingBatchId ? "Batch updated" : "Batch created", 
        description: editingBatchId ? "Delivery batch updated successfully" : "New delivery batch created successfully" 
      });
      setDialogOpen(false);
      setEditingBatchId(null);
      fetchBatches();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleShippingItem = (key: string, selected: boolean) => {
    setSelectedShippingItems(prev => ({
      ...prev,
      [key]: { ...prev[key], selected }
    }));
  };

  const updateShippingQty = (key: string, qty: number) => {
    setSelectedShippingItems(prev => ({
      ...prev,
      [key]: { ...prev[key], qty: Math.max(0, qty) }
    }));
  };

  const toggleDeliveryItem = (key: string, selected: boolean) => {
    setSelectedDeliveryItems(prev => ({
      ...prev,
      [key]: { ...prev[key], selected, qty: selected ? (prev[key]?.qty || 1) : 0 }
    }));
  };

  const updateDeliveryQty = (key: string, qty: number) => {
    setSelectedDeliveryItems(prev => ({
      ...prev,
      [key]: { ...prev[key], qty: Math.max(0, qty), selected: qty > 0 }
    }));
  };

  // Calculate totals across all batches
  const totalBatches = batches.length;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Delivery Batches</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {totalBatches} {totalBatches === 1 ? 'Batch' : 'Batches'}
            </Badge>
            {canEdit && (
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (open && !editingBatchId) initNewBatch();
                if (!open) setEditingBatchId(null);
              }}>
                <DialogTrigger asChild>
                  <Button variant="default" size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    New Delivery
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingBatchId ? "Edit Delivery Batch" : "Create Delivery Batch"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    {/* Date Picker */}
                    <div className="space-y-2">
                      <Label>Delivery Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !newBatchDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newBatchDate ? format(newBatchDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={newBatchDate}
                            onSelect={setNewBatchDate}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Shipping Preparation Items */}
                    <div className="space-y-2">
                      <Label>Shipping Preparation Items</Label>
                      <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                        {SHIPPING_ITEM_TYPES.map(item => {
                          const val = selectedShippingItems[item.key] || { selected: true, qty: 0 };
                          return (
                            <div key={item.key} className="flex items-center gap-3">
                              <Checkbox
                                checked={val.selected}
                                onCheckedChange={(c) => toggleShippingItem(item.key, c as boolean)}
                              />
                              <span className="flex-1 text-sm">{item.label}</span>
                              <Input
                                type="number"
                                min={0}
                                value={val.qty}
                                onChange={(e) => updateShippingQty(item.key, parseInt(e.target.value) || 0)}
                                className="w-16 h-7 text-xs text-center"
                                placeholder="Qty"
                              />
                            </div>
                          );
                        })}
                        {/* Custom shipping items added */}
                        {newCustomShippingItems.map((item, index) => (
                          <div key={`custom-ship-${index}`} className="flex items-center gap-3 border-t border-dashed pt-2">
                            <Badge variant="secondary" className="text-xs">Custom</Badge>
                            <span className="flex-1 text-sm">{item.name}</span>
                            <Badge variant="outline" className="text-xs">×{item.qty}</Badge>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCustomShippingFromList(index)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      {/* Add custom shipping item */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Custom item name"
                          value={customShippingName}
                          onChange={(e) => setCustomShippingName(e.target.value)}
                          className="flex-1 h-8 text-sm"
                        />
                        <Input
                          type="number"
                          min={1}
                          value={customShippingQty}
                          onChange={(e) => setCustomShippingQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 h-8 text-xs text-center"
                        />
                        <Button variant="outline" size="sm" onClick={addCustomShippingToList} disabled={!customShippingName.trim()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Delivery Items */}
                    <div className="space-y-2">
                      <Label>Delivery Items</Label>
                      <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                        {DELIVERY_ITEM_TYPES.map(item => {
                          const val = selectedDeliveryItems[item.key] || { selected: false, qty: 0 };
                          return (
                            <div key={item.key} className="flex items-center gap-3">
                              <Checkbox
                                checked={val.selected}
                                onCheckedChange={(c) => toggleDeliveryItem(item.key, c as boolean)}
                              />
                              <span className="flex-1 text-sm">{item.label}</span>
                              <Input
                                type="number"
                                min={0}
                                value={val.qty}
                                onChange={(e) => updateDeliveryQty(item.key, parseInt(e.target.value) || 0)}
                                className="w-16 h-7 text-xs text-center"
                                placeholder="Qty"
                              />
                            </div>
                          );
                        })}
                        {/* Custom delivery items added */}
                        {newCustomDeliveryItems.map((item, index) => (
                          <div key={`custom-del-${index}`} className="flex items-center gap-3 border-t border-dashed pt-2">
                            <Badge variant="secondary" className="text-xs">Custom</Badge>
                            <span className="flex-1 text-sm">{item.name}</span>
                            <Badge variant="outline" className="text-xs">×{item.qty}</Badge>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCustomDeliveryFromList(index)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      {/* Add custom delivery item */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Custom item name"
                          value={customDeliveryName}
                          onChange={(e) => setCustomDeliveryName(e.target.value)}
                          className="flex-1 h-8 text-sm"
                        />
                        <Input
                          type="number"
                          min={1}
                          value={customDeliveryQty}
                          onChange={(e) => setCustomDeliveryQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 h-8 text-xs text-center"
                        />
                        <Button variant="outline" size="sm" onClick={addCustomDeliveryToList} disabled={!customDeliveryName.trim()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <Button onClick={saveBatch} disabled={saving} className="w-full">
                      {saving ? (editingBatchId ? "Updating..." : "Creating...") : (editingBatchId ? "Update Delivery Batch" : "Create Delivery Batch")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        <CardDescription>
          Manage multiple deliveries with separate shipping preparation and tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {batches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No delivery batches yet</p>
            <p className="text-xs">Click "New Delivery" to create the first batch</p>
          </div>
        ) : (
          batches.map((batch, index) => (
            <DeliveryBatchCard
              key={batch.id}
              batch={batch}
              batchNumber={index + 1}
              shippingItems={batchShippingItems[batch.id] || []}
              deliveryItems={batchDeliveryItems[batch.id] || []}
              customShippingItems={batchCustomShipping[batch.id] || []}
              customDeliveryItems={batchCustomDelivery[batch.id] || []}
              canEdit={canEdit}
              isAdmin={isAdmin}
              onRefresh={fetchBatches}
              onEdit={() => initEditBatch(batch.id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}