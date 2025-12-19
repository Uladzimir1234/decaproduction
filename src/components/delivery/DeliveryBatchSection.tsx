import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import { Truck, Plus, CalendarIcon, Trash2, Package, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DeliveryBatchCard } from "./DeliveryBatchCard";
import { ConstructionDeliveryList, ConstructionSelection } from "./ConstructionDeliveryList";

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
  delivery_person: string | null;
}

interface BatchShippingItem {
  id: string;
  batch_id: string;
  item_type: string;
  quantity: number;
  is_complete: boolean;
}

interface BatchCustomShippingItem {
  id: string;
  batch_id: string;
  name: string;
  quantity: number;
  is_complete: boolean;
}

interface BatchConstructionItem {
  id: string;
  batch_id: string;
  construction_id: string;
  include_glass: boolean;
  include_screens: boolean;
  include_blinds: boolean;
  include_hardware: boolean;
  is_delivered: boolean;
  delivery_notes: string | null;
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

interface Construction {
  id: string;
  construction_number: string;
  construction_type: string;
  quantity: number;
}

export function DeliveryBatchSection({ order, manufacturingProgress }: DeliveryBatchSectionProps) {
  const { toast } = useToast();
  const { canUpdateManufacturing, isSeller, isAdmin } = useRole();
  const [batches, setBatches] = useState<DeliveryBatch[]>([]);
  const [batchShippingItems, setBatchShippingItems] = useState<Record<string, BatchShippingItem[]>>({});
  const [batchCustomShipping, setBatchCustomShipping] = useState<Record<string, BatchCustomShippingItem[]>>({});
  const [batchConstructionItems, setBatchConstructionItems] = useState<Record<string, BatchConstructionItem[]>>({});
  const [allConstructions, setAllConstructions] = useState<Construction[]>([]);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [newBatchDate, setNewBatchDate] = useState<Date | undefined>(new Date());
  const [deliveryPerson, setDeliveryPerson] = useState<string>("");
  const [selectedShippingItems, setSelectedShippingItems] = useState<Record<string, { selected: boolean; qty: number }>>({});
  const [constructionSelections, setConstructionSelections] = useState<ConstructionSelection[]>([]);
  const [saving, setSaving] = useState(false);
  
  // Custom shipping items for new batch
  const [newCustomShippingItems, setNewCustomShippingItems] = useState<{ name: string; qty: number }[]>([]);
  const [customShippingName, setCustomShippingName] = useState("");
  const [customShippingQty, setCustomShippingQty] = useState(1);

  const canEdit = canUpdateManufacturing && !isSeller;

  const fetchBatches = useCallback(async () => {
    const { data, error } = await supabase
      .from("delivery_batches")
      .select("*")
      .eq("order_id", order.id)
      .order("delivery_date", { ascending: true });

    if (!error && data) {
      setBatches(data);
      for (const batch of data) {
        fetchBatchItems(batch.id);
      }
    }
  }, [order.id]);

  const fetchAllConstructions = useCallback(async () => {
    const { data } = await supabase
      .from("order_constructions")
      .select("id, construction_number, construction_type, quantity")
      .eq("order_id", order.id)
      .order("position_index", { ascending: true });
    if (data) setAllConstructions(data);
  }, [order.id]);

  const fetchBatchItems = async (batchId: string) => {
    const [shippingRes, customShipRes, constructionRes] = await Promise.all([
      supabase.from("batch_shipping_items").select("*").eq("batch_id", batchId),
      supabase.from("batch_custom_shipping_items").select("*").eq("batch_id", batchId),
      supabase.from("batch_construction_items").select("*").eq("batch_id", batchId),
    ]);

    setBatchShippingItems(prev => ({ ...prev, [batchId]: shippingRes.data || [] }));
    setBatchCustomShipping(prev => ({ ...prev, [batchId]: customShipRes.data || [] }));
    setBatchConstructionItems(prev => ({ ...prev, [batchId]: constructionRes.data || [] }));
  };

  // Get all construction IDs already in batches (for marking in UI)
  // Only includes items from batches that currently exist (not deleted ones)
  const getExistingBatchConstructionIds = useCallback(() => {
    const ids: string[] = [];
    const existingBatchIds = new Set(batches.map(b => b.id));
    
    Object.entries(batchConstructionItems).forEach(([batchId, items]) => {
      // Only include items from batches that still exist
      if (existingBatchIds.has(batchId)) {
        items.forEach(item => ids.push(item.construction_id));
      }
    });
    return ids;
  }, [batchConstructionItems, batches]);

  useEffect(() => {
    fetchBatches();
    fetchAllConstructions();

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
            const deletedId = payload.old.id;
            setBatches(prev => prev.filter(batch => batch.id !== deletedId));
            // Clear all items for the deleted batch so constructions become available again
            setBatchConstructionItems(prev => {
              const updated = { ...prev };
              delete updated[deletedId];
              return updated;
            });
            setBatchShippingItems(prev => {
              const updated = { ...prev };
              delete updated[deletedId];
              return updated;
            });
            setBatchCustomShipping(prev => {
              const updated = { ...prev };
              delete updated[deletedId];
              return updated;
            });
          }
        }
      )
      .subscribe();

    // Subscribe to order_constructions changes too
    const constructionsChannel = supabase
      .channel(`constructions-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_constructions',
          filter: `order_id=eq.${order.id}`
        },
        () => fetchAllConstructions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(batchesChannel);
      supabase.removeChannel(constructionsChannel);
    };
  }, [fetchBatches, order.id]);

  const initNewBatch = () => {
    setEditingBatchId(null);
    const shippingInit: Record<string, { selected: boolean; qty: number }> = {};
    SHIPPING_ITEM_TYPES.forEach(item => {
      shippingInit[item.key] = { selected: true, qty: 0 };
    });
    setSelectedShippingItems(shippingInit);
    setNewBatchDate(new Date()); // Auto-set to today
    setDeliveryPerson("");
    setNewCustomShippingItems([]);
    setCustomShippingName("");
    setCustomShippingQty(1);
    setConstructionSelections([]); // Will be populated by ConstructionDeliveryList
  };

  const initEditBatch = async (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;
    
    setEditingBatchId(batchId);
    setNewBatchDate(new Date(batch.delivery_date));
    setDeliveryPerson(batch.delivery_person || "");
    
    // Initialize shipping items from existing batch data
    const shippingItems = batchShippingItems[batchId] || [];
    const shippingInit: Record<string, { selected: boolean; qty: number }> = {};
    SHIPPING_ITEM_TYPES.forEach(item => {
      const existing = shippingItems.find(si => si.item_type === item.key);
      shippingInit[item.key] = { selected: !!existing, qty: existing?.quantity || 0 };
    });
    setSelectedShippingItems(shippingInit);
    
    // Initialize custom shipping items
    const customShipping = batchCustomShipping[batchId] || [];
    setNewCustomShippingItems(customShipping.map(cs => ({ name: cs.name, qty: cs.quantity })));
    
    // Initialize construction selections from existing batch data
    const existingConstructions = batchConstructionItems[batchId] || [];
    const constructionSelectionsInit: ConstructionSelection[] = existingConstructions.map(item => ({
      constructionId: item.construction_id,
      selected: true,
      includeGlass: item.include_glass,
      includeScreens: item.include_screens,
      includeBlinds: item.include_blinds,
      includeHardware: item.include_hardware,
      notes: item.delivery_notes || "",
    }));
    setConstructionSelections(constructionSelectionsInit);
    
    setCustomShippingName("");
    setCustomShippingQty(1);
    
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

  const saveBatch = async () => {
    if (!deliveryPerson.trim()) {
      toast({ title: "Error", description: "Please enter the name of the person in charge", variant: "destructive" });
      return;
    }

    const selectedConstructions = constructionSelections.filter(s => s.selected);
    if (selectedConstructions.length === 0) {
      toast({ title: "Error", description: "Please select at least one construction to deliver", variant: "destructive" });
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
            delivery_person: deliveryPerson.trim(),
          })
          .eq("id", editingBatchId);
        if (batchError) throw batchError;
        batchId = editingBatchId;
        
        // Delete existing items and re-insert
        await supabase.from("batch_shipping_items").delete().eq("batch_id", batchId);
        await supabase.from("batch_custom_shipping_items").delete().eq("batch_id", batchId);
        await supabase.from("batch_construction_items").delete().eq("batch_id", batchId);
      } else {
        // Create the batch
        const { data: batchData, error: batchError } = await supabase
          .from("delivery_batches")
          .insert({
            order_id: order.id,
            delivery_date: format(newBatchDate, "yyyy-MM-dd"),
            delivery_person: deliveryPerson.trim(),
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

      // Insert construction items
      const constructionToInsert = selectedConstructions.map(sel => ({
        batch_id: batchId,
        construction_id: sel.constructionId,
        include_glass: sel.includeGlass,
        include_screens: sel.includeScreens,
        include_blinds: sel.includeBlinds,
        include_hardware: sel.includeHardware,
        is_delivered: false,
        delivery_notes: sel.notes || null,
      }));

      if (constructionToInsert.length > 0) {
        const { error: constructionError } = await supabase
          .from("batch_construction_items")
          .insert(constructionToInsert);
        if (constructionError) throw constructionError;
      }

      toast({ 
        title: editingBatchId ? "Batch updated" : "Batch created", 
        description: `${selectedConstructions.length} construction(s) added to delivery batch` 
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

  const totalBatches = batches.length;

  // Calculate remaining constructions not yet assigned to any batch
  const assignedConstructionIds = new Set(
    Object.entries(batchConstructionItems)
      .filter(([batchId]) => batches.some(b => b.id === batchId)) // Only count existing batches
      .flatMap(([, items]) => items.map(item => item.construction_id))
  );

  const remainingConstructions = allConstructions.filter(
    c => !assignedConstructionIds.has(c.id)
  );

  const remainingWindowsCount = remainingConstructions
    .filter(c => c.construction_type === 'window')
    .reduce((sum, c) => sum + c.quantity, 0);

  const remainingDoorsCount = remainingConstructions
    .filter(c => c.construction_type === 'door')
    .reduce((sum, c) => sum + c.quantity, 0);

  const remainingSlidingDoorsCount = remainingConstructions
    .filter(c => c.construction_type === 'sliding_door')
    .reduce((sum, c) => sum + c.quantity, 0);

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
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingBatchId ? "Edit Delivery Batch" : "Create Delivery Batch"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    {/* Delivery Person Name */}
                    <div className="space-y-2">
                      <Label>Person in Charge of Delivery</Label>
                      <Input 
                        value={deliveryPerson} 
                        onChange={(e) => setDeliveryPerson(e.target.value)} 
                        placeholder="Enter name of person checking delivery"
                      />
                    </div>

                    {/* Date - Auto-set but editable */}
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

                    <Separator />

                    {/* Construction Items Selection */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        <Label className="text-base font-medium">Select Items for Delivery</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        All items are pre-selected. Deselect items that are not ready for this delivery.
                      </p>
                      <div className="border rounded-lg p-3 max-h-[300px] overflow-y-auto">
                        <ConstructionDeliveryList
                          orderId={order.id}
                          selections={constructionSelections}
                          onSelectionsChange={setConstructionSelections}
                          existingBatchConstructionIds={editingBatchId ? [] : getExistingBatchConstructionIds()}
                        />
                      </div>
                    </div>

                    <Separator />

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
          Pre-populated from order constructions - select/deselect items for each delivery
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Remaining to Ship Summary */}
        {remainingConstructions.length > 0 && batches.length > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Remaining to Ship:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {remainingWindowsCount > 0 && (
                  <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
                    {remainingWindowsCount} Window{remainingWindowsCount > 1 ? 's' : ''}
                  </Badge>
                )}
                {remainingDoorsCount > 0 && (
                  <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
                    {remainingDoorsCount} Door{remainingDoorsCount > 1 ? 's' : ''}
                  </Badge>
                )}
                {remainingSlidingDoorsCount > 0 && (
                  <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
                    {remainingSlidingDoorsCount} Sliding Door{remainingSlidingDoorsCount > 1 ? 's' : ''}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground ml-1">
                  ({remainingConstructions.map(c => `#${c.construction_number}`).join(', ')})
                </span>
              </div>
            </CardContent>
          </Card>
        )}
        
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
              customShippingItems={batchCustomShipping[batch.id] || []}
              constructionItems={batchConstructionItems[batch.id] || []}
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
