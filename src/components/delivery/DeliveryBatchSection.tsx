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
import { ConstructionChipSelector, type ConstructionData } from "./ConstructionChipSelector";
import { ConstructionComponentPanel, getDefaultComponents, type ComponentSelection, type ConstructionComponentSelection } from "./ConstructionComponentPanel";

interface OrderInfo {
  id: string;
  order_number: string;
  windows_count: number;
  doors_count: number;
  sliding_doors_count: number;
  has_sliding_doors: boolean;
  screen_type: string | null;
  has_nailing_flanges?: boolean | null;
  has_plisse_screens?: boolean | null;
  visible_hinges_count?: number | null;
  hidden_hinges_count?: number | null;
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
  quantity: number;
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


export function DeliveryBatchSection({ order, manufacturingProgress }: DeliveryBatchSectionProps) {
  const { toast } = useToast();
  const { canUpdateManufacturing, isSeller, isAdmin } = useRole();
  const [batches, setBatches] = useState<DeliveryBatch[]>([]);
  const [batchShippingItems, setBatchShippingItems] = useState<Record<string, BatchShippingItem[]>>({});
  const [batchCustomShipping, setBatchCustomShipping] = useState<Record<string, BatchCustomShippingItem[]>>({});
  const [batchConstructionItems, setBatchConstructionItems] = useState<Record<string, BatchConstructionItem[]>>({});
  const [allConstructions, setAllConstructions] = useState<ConstructionData[]>([]);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [newBatchDate, setNewBatchDate] = useState<Date | undefined>(new Date());
  const [deliveryPerson, setDeliveryPerson] = useState<string>("");
  
  
  // New visual selection state
  const [selectedConstructionIds, setSelectedConstructionIds] = useState<Set<string>>(new Set());
  const [componentSelections, setComponentSelections] = useState<Record<string, ConstructionComponentSelection>>({});
  
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
      .select("id, construction_number, construction_type, quantity, screen_type, has_blinds, handle_type, glass_type")
      .eq("order_id", order.id)
      .order("position_index", { ascending: true });
    if (data) setAllConstructions(data as ConstructionData[]);
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
  }, [fetchBatches, order.id, fetchAllConstructions]);

  // Calculate shipped quantities per construction
  const getShippedQuantities = useCallback(() => {
    const quantities: Record<string, number> = {};
    const existingBatchIds = new Set(batches.map(b => b.id));
    
    Object.entries(batchConstructionItems).forEach(([batchId, items]) => {
      if (existingBatchIds.has(batchId)) {
        items.forEach(item => {
          quantities[item.construction_id] = (quantities[item.construction_id] || 0) + (item.quantity || 1);
        });
      }
    });
    return quantities;
  }, [batchConstructionItems, batches]);

  const shippedQuantities = getShippedQuantities();

  const initNewBatch = () => {
    setEditingBatchId(null);
    setNewBatchDate(new Date());
    setDeliveryPerson("");
    setNewCustomShippingItems([]);
    setCustomShippingName("");
    setCustomShippingQty(1);
    setSelectedConstructionIds(new Set());
    setComponentSelections({});
  };

  const initEditBatch = async (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;
    
    setEditingBatchId(batchId);
    setNewBatchDate(new Date(batch.delivery_date));
    setDeliveryPerson(batch.delivery_person || "");
    
    const customShipping = batchCustomShipping[batchId] || [];
    setNewCustomShippingItems(customShipping.map(cs => ({ name: cs.name, qty: cs.quantity })));
    
    // Initialize construction selections from existing batch
    const existingConstructions = batchConstructionItems[batchId] || [];
    const newSelectedIds = new Set<string>();
    const newComponentSelections: Record<string, ConstructionComponentSelection> = {};
    
    existingConstructions.forEach(item => {
      newSelectedIds.add(item.construction_id);
      const construction = allConstructions.find(c => c.id === item.construction_id);
      if (construction) {
        // Use existing data or defaults
        newComponentSelections[item.construction_id] = {
          constructionId: item.construction_id,
          quantity: item.quantity || 1,
          components: getDefaultComponents(construction, order, item.quantity || 1),
        };
      }
    });
    
    setSelectedConstructionIds(newSelectedIds);
    setComponentSelections(newComponentSelections);
    
    setCustomShippingName("");
    setCustomShippingQty(1);
    
    setDialogOpen(true);
  };

  const handleConstructionToggle = (constructionId: string) => {
    setSelectedConstructionIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(constructionId)) {
        newSet.delete(constructionId);
        // Remove component selection too
        setComponentSelections(prevSel => {
          const updated = { ...prevSel };
          delete updated[constructionId];
          return updated;
        });
      } else {
        newSet.add(constructionId);
        // Initialize component selection
        const construction = allConstructions.find(c => c.id === constructionId);
        if (construction) {
          const shipped = shippedQuantities[constructionId] || 0;
          const remaining = construction.quantity - shipped;
          setComponentSelections(prevSel => ({
            ...prevSel,
            [constructionId]: {
              constructionId,
              quantity: remaining,
              components: getDefaultComponents(construction, order, remaining),
            }
          }));
        }
      }
      return newSet;
    });
  };

  const handleQuantityChange = (constructionId: string, qty: number) => {
    setComponentSelections(prev => ({
      ...prev,
      [constructionId]: {
        ...prev[constructionId],
        quantity: qty,
      }
    }));
  };

  const handleComponentToggle = (constructionId: string, component: keyof ComponentSelection, value: boolean) => {
    setComponentSelections(prev => ({
      ...prev,
      [constructionId]: {
        ...prev[constructionId],
        components: {
          ...prev[constructionId].components,
          [component]: { ...prev[constructionId].components[component], include: value }
        }
      }
    }));
  };

  const handleComponentQtyChange = (constructionId: string, component: keyof ComponentSelection, qty: number) => {
    setComponentSelections(prev => ({
      ...prev,
      [constructionId]: {
        ...prev[constructionId],
        components: {
          ...prev[constructionId].components,
          [component]: { ...prev[constructionId].components[component], qty }
        }
      }
    }));
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

    if (selectedConstructionIds.size === 0) {
      toast({ title: "Error", description: "Please select at least one construction to deliver", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      let batchId: string;
      
      if (editingBatchId) {
        const { error: batchError } = await supabase
          .from("delivery_batches")
          .update({
            delivery_date: format(newBatchDate!, "yyyy-MM-dd"),
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
        const { data: batchData, error: batchError } = await supabase
          .from("delivery_batches")
          .insert({
            order_id: order.id,
            delivery_date: format(newBatchDate!, "yyyy-MM-dd"),
            delivery_person: deliveryPerson.trim(),
            status: 'preparing',
            created_by: userData.user?.id
          })
          .select()
          .single();

        if (batchError) throw batchError;
        batchId = batchData.id;
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

      // Insert construction items with component data
      const constructionToInsert = Array.from(selectedConstructionIds).map(id => {
        const sel = componentSelections[id];
        return {
          batch_id: batchId,
          construction_id: id,
          quantity: sel?.quantity || 1,
          include_glass: true,
          include_screens: sel?.components.screens.include || false,
          include_blinds: sel?.components.blinds.include || false,
          include_hardware: sel?.components.handles.include || false,
          is_delivered: false,
          delivery_notes: null,
        };
      });

      if (constructionToInsert.length > 0) {
        const { data: insertedItems, error: constructionError } = await supabase
          .from("batch_construction_items")
          .insert(constructionToInsert)
          .select();
        if (constructionError) throw constructionError;

        // Insert component details into batch_construction_components
        if (insertedItems) {
          const componentsToInsert: { batch_construction_item_id: string; component_type: string; quantity: number }[] = [];
          
          insertedItems.forEach(item => {
            const sel = componentSelections[item.construction_id];
            if (sel) {
              Object.entries(sel.components).forEach(([key, val]) => {
                if (val.include && val.qty > 0) {
                  componentsToInsert.push({
                    batch_construction_item_id: item.id,
                    component_type: key,
                    quantity: val.qty
                  });
                }
              });
            }
          });

          if (componentsToInsert.length > 0) {
            const { error: compError } = await supabase
              .from("batch_construction_components")
              .insert(componentsToInsert);
            if (compError) throw compError;
          }
        }
      }

      toast({ 
        title: editingBatchId ? "Batch updated" : "Batch created", 
        description: `${selectedConstructionIds.size} construction(s) added to delivery batch` 
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


  const totalBatches = batches.length;

  // Calculate remaining constructions
  const getRemainingItems = () => {
    const remaining: { 
      windows: { count: number; items: { number: string; remaining: number }[] };
      doors: { count: number; items: { number: string; remaining: number }[] };
      slidingDoors: { count: number; items: { number: string; remaining: number }[] };
    } = {
      windows: { count: 0, items: [] },
      doors: { count: 0, items: [] },
      slidingDoors: { count: 0, items: [] },
    };

    allConstructions.forEach(c => {
      const shipped = shippedQuantities[c.id] || 0;
      const remainingQty = c.quantity - shipped;
      
      if (remainingQty > 0) {
        const item = { number: c.construction_number, remaining: remainingQty };
        
        if (c.construction_type === 'window') {
          remaining.windows.count += remainingQty;
          remaining.windows.items.push(item);
        } else if (c.construction_type === 'door') {
          remaining.doors.count += remainingQty;
          remaining.doors.items.push(item);
        } else if (c.construction_type === 'sliding_door') {
          remaining.slidingDoors.count += remainingQty;
          remaining.slidingDoors.items.push(item);
        }
      }
    });

    return remaining;
  };

  const remainingItems = getRemainingItems();
  const hasRemaining = remainingItems.windows.count > 0 || remainingItems.doors.count > 0 || remainingItems.slidingDoors.count > 0;

  // Get selected constructions for the panel display
  const selectedConstructions = allConstructions.filter(c => selectedConstructionIds.has(c.id));

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
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingBatchId ? "Edit Delivery Batch" : "Create Delivery Batch"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    {/* Delivery Person Name */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Person in Charge</Label>
                        <Input 
                          value={deliveryPerson} 
                          onChange={(e) => setDeliveryPerson(e.target.value)} 
                          placeholder="Enter name"
                        />
                      </div>

                      {/* Date */}
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
                    </div>

                    <Separator />

                    {/* Visual Construction Selection */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        <Label className="text-base font-medium">Select Constructions</Label>
                        {selectedConstructionIds.size > 0 && (
                          <Badge variant="secondary" className="ml-auto">
                            {selectedConstructionIds.size} selected
                          </Badge>
                        )}
                      </div>
                      
                      <ConstructionChipSelector
                        constructions={allConstructions}
                        selectedIds={selectedConstructionIds}
                        shippedQuantities={editingBatchId ? {} : shippedQuantities}
                        onToggle={handleConstructionToggle}
                      />
                    </div>

                    {/* Component Panels for Selected Constructions */}
                    {selectedConstructions.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-sm text-muted-foreground">
                          Configure components for each selected construction:
                        </Label>
                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                          {selectedConstructions.map(construction => {
                            const shipped = shippedQuantities[construction.id] || 0;
                            const maxQty = construction.quantity - shipped;
                            const selection = componentSelections[construction.id];
                            
                            if (!selection) return null;
                            
                            return (
                              <ConstructionComponentPanel
                                key={construction.id}
                                construction={construction}
                                orderData={order}
                                selection={selection}
                                maxQuantity={maxQty}
                                onQuantityChange={(qty) => handleQuantityChange(construction.id, qty)}
                                onComponentToggle={(comp, val) => handleComponentToggle(construction.id, comp, val)}
                                onComponentQtyChange={(comp, qty) => handleComponentQtyChange(construction.id, comp, qty)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Custom Delivery Items */}
                    <div className="space-y-2">
                      <Label>Custom Delivery Items</Label>
                      <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                        {newCustomShippingItems.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-2">No custom items added</p>
                        ) : (
                          newCustomShippingItems.map((item, index) => (
                            <div key={`custom-ship-${index}`} className="flex items-center gap-3">
                              <Badge variant="secondary" className="text-xs">Custom</Badge>
                              <span className="flex-1 text-sm">{item.name}</span>
                              <Badge variant="outline" className="text-xs">×{item.qty}</Badge>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCustomShippingFromList(index)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
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
          Click construction chips to select items for delivery
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Remaining to Ship Summary */}
        {hasRemaining && batches.length > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Remaining to Ship:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {remainingItems.windows.count > 0 && (
                  <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
                    {remainingItems.windows.count} Window{remainingItems.windows.count > 1 ? 's' : ''}
                  </Badge>
                )}
                {remainingItems.doors.count > 0 && (
                  <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
                    {remainingItems.doors.count} Door{remainingItems.doors.count > 1 ? 's' : ''}
                  </Badge>
                )}
                {remainingItems.slidingDoors.count > 0 && (
                  <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
                    {remainingItems.slidingDoors.count} Sliding Door{remainingItems.slidingDoors.count > 1 ? 's' : ''}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground ml-1">
                  ({[...remainingItems.windows.items, ...remainingItems.doors.items, ...remainingItems.slidingDoors.items]
                    .map(item => item.remaining === 1 ? `#${item.number}` : `#${item.number} (${item.remaining})`)
                    .join(', ')})
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
