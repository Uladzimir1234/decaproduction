import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { ExpandedConstructionPanel, createDefaultUnitSelections, getDefaultUnitComponents } from "./ExpandedConstructionPanel";
import { RemainingToShipPanel } from "./RemainingToShipPanel";
import type { UnitSelection, UnitComponentState } from "./UnitCard";

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

interface BatchConstructionComponent {
  id: string;
  batch_construction_item_id: string;
  component_type: string;
  quantity: number;
  is_delivered: boolean;
  unit_index: number;
}

interface ShippedUnitInfo {
  unitIndex: number;
  components: string[];
}

interface DeliveryBatchSectionProps {
  order: OrderInfo;
  manufacturingProgress: number;
}

// Per-construction unit selections
interface ConstructionUnitSelections {
  constructionId: string;
  units: UnitSelection[];
}

export function DeliveryBatchSection({ order, manufacturingProgress }: DeliveryBatchSectionProps) {
  const { toast } = useToast();
  const { canUpdateManufacturing, isSeller, isAdmin } = useRole();
  const [batches, setBatches] = useState<DeliveryBatch[]>([]);
  const [batchShippingItems, setBatchShippingItems] = useState<Record<string, BatchShippingItem[]>>({});
  const [batchCustomShipping, setBatchCustomShipping] = useState<Record<string, BatchCustomShippingItem[]>>({});
  const [batchConstructionItems, setBatchConstructionItems] = useState<Record<string, BatchConstructionItem[]>>({});
  const [batchConstructionComponents, setBatchConstructionComponents] = useState<Record<string, BatchConstructionComponent[]>>({});
  const [allConstructions, setAllConstructions] = useState<ConstructionData[]>([]);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [newBatchDate, setNewBatchDate] = useState<Date | undefined>(new Date());
  const [deliveryPerson, setDeliveryPerson] = useState<string>("");
  
  // Per-unit selection state
  const [selectedConstructionIds, setSelectedConstructionIds] = useState<Set<string>>(new Set());
  const [unitSelections, setUnitSelections] = useState<Record<string, UnitSelection[]>>({});
  
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
    
    const constructionItems = constructionRes.data || [];
    setBatchConstructionItems(prev => ({ ...prev, [batchId]: constructionItems }));

    // Fetch components for each construction item
    if (constructionItems.length > 0) {
      const itemIds = constructionItems.map(item => item.id);
      const { data: componentsData } = await supabase
        .from("batch_construction_components")
        .select("*")
        .in("batch_construction_item_id", itemIds);
      
      setBatchConstructionComponents(prev => ({ ...prev, [batchId]: componentsData || [] }));
    }
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
            setBatchConstructionComponents(prev => {
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

  // Calculate shipped units per construction from all batches
  const getShippedUnitsPerConstruction = useCallback(() => {
    const shippedUnits: Record<string, ShippedUnitInfo[]> = {};
    const existingBatchIds = new Set(batches.map(b => b.id));

    Object.entries(batchConstructionItems).forEach(([batchId, items]) => {
      if (!existingBatchIds.has(batchId)) return;
      
      items.forEach(item => {
        const constructionId = item.construction_id;
        if (!shippedUnits[constructionId]) {
          shippedUnits[constructionId] = [];
        }
        
        // Get components for this batch construction item
        const components = batchConstructionComponents[batchId]?.filter(
          c => c.batch_construction_item_id === item.id
        ) || [];
        
        // Group by unit_index
        const unitMap = new Map<number, string[]>();
        components.forEach(comp => {
          if (!unitMap.has(comp.unit_index)) {
            unitMap.set(comp.unit_index, []);
          }
          unitMap.get(comp.unit_index)!.push(comp.component_type);
        });
        
        unitMap.forEach((compTypes, unitIdx) => {
          shippedUnits[constructionId].push({
            unitIndex: unitIdx,
            components: compTypes,
          });
        });
      });
    });

    return shippedUnits;
  }, [batchConstructionItems, batchConstructionComponents, batches]);

  const shippedUnitsPerConstruction = getShippedUnitsPerConstruction();

  // Legacy shipped quantities for chip selector
  const getShippedQuantities = useCallback(() => {
    const quantities: Record<string, number> = {};
    Object.entries(shippedUnitsPerConstruction).forEach(([constructionId, units]) => {
      quantities[constructionId] = units.length;
    });
    return quantities;
  }, [shippedUnitsPerConstruction]);

  const shippedQuantities = getShippedQuantities();

  const initNewBatch = () => {
    setEditingBatchId(null);
    setNewBatchDate(new Date());
    setDeliveryPerson("");
    setNewCustomShippingItems([]);
    setCustomShippingName("");
    setCustomShippingQty(1);
    setSelectedConstructionIds(new Set());
    setUnitSelections({});
  };

  const initEditBatch = async (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;
    
    setEditingBatchId(batchId);
    setNewBatchDate(new Date(batch.delivery_date));
    setDeliveryPerson(batch.delivery_person || "");
    
    const customShipping = batchCustomShipping[batchId] || [];
    setNewCustomShippingItems(customShipping.map(cs => ({ name: cs.name, qty: cs.quantity })));
    
    // Initialize unit selections from existing batch
    const existingConstructions = batchConstructionItems[batchId] || [];
    const existingComponents = batchConstructionComponents[batchId] || [];
    
    const newSelectedIds = new Set<string>();
    const newUnitSelections: Record<string, UnitSelection[]> = {};
    
    existingConstructions.forEach(item => {
      newSelectedIds.add(item.construction_id);
      const construction = allConstructions.find(c => c.id === item.construction_id);
      if (construction) {
        // Get components for this item grouped by unit_index
        const itemComponents = existingComponents.filter(c => c.batch_construction_item_id === item.id);
        const unitMap = new Map<number, Set<string>>();
        
        itemComponents.forEach(comp => {
          if (!unitMap.has(comp.unit_index)) {
            unitMap.set(comp.unit_index, new Set());
          }
          unitMap.get(comp.unit_index)!.add(comp.component_type);
        });
        
        // Create unit selections
        const defaultComponents = getDefaultUnitComponents(construction, order);
        newUnitSelections[item.construction_id] = Array.from({ length: construction.quantity }, (_, i) => {
          const unitIdx = i + 1;
          const hasComponents = unitMap.has(unitIdx);
          const componentTypes = unitMap.get(unitIdx) || new Set();
          
          return {
            unitIndex: unitIdx,
            selected: hasComponents,
            components: hasComponents ? {
              screen: componentTypes.has('screen'),
              blinds: componentTypes.has('blinds'),
              handles: componentTypes.has('handles'),
              weepingCovers: componentTypes.has('weepingCovers'),
              hingeCovers: componentTypes.has('hingeCovers'),
              nailFins: componentTypes.has('nailFins'),
              brackets: componentTypes.has('brackets'),
              plisseScreen: componentTypes.has('plisseScreen'),
            } : { ...defaultComponents },
          };
        });
      }
    });
    
    setSelectedConstructionIds(newSelectedIds);
    setUnitSelections(newUnitSelections);
    
    setCustomShippingName("");
    setCustomShippingQty(1);
    
    setDialogOpen(true);
  };

  const handleConstructionToggle = (constructionId: string) => {
    setSelectedConstructionIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(constructionId)) {
        newSet.delete(constructionId);
        setUnitSelections(prevSel => {
          const updated = { ...prevSel };
          delete updated[constructionId];
          return updated;
        });
      } else {
        newSet.add(constructionId);
        const construction = allConstructions.find(c => c.id === constructionId);
        if (construction) {
          const shippedUnits = shippedUnitsPerConstruction[constructionId] || [];
          setUnitSelections(prevSel => ({
            ...prevSel,
            [constructionId]: createDefaultUnitSelections(construction, order, shippedUnits),
          }));
        }
      }
      return newSet;
    });
  };

  const handleUnitToggle = (constructionId: string, unitIndex: number, selected: boolean) => {
    setUnitSelections(prev => ({
      ...prev,
      [constructionId]: prev[constructionId]?.map(unit =>
        unit.unitIndex === unitIndex ? { ...unit, selected } : unit
      ) || [],
    }));
  };

  const handleUnitComponentToggle = (
    constructionId: string,
    unitIndex: number,
    component: keyof UnitComponentState,
    value: boolean
  ) => {
    setUnitSelections(prev => ({
      ...prev,
      [constructionId]: prev[constructionId]?.map(unit =>
        unit.unitIndex === unitIndex
          ? { ...unit, components: { ...unit.components, [component]: value } }
          : unit
      ) || [],
    }));
  };

  const handleSelectAllUnits = (constructionId: string) => {
    const shippedIndexes = new Set((shippedUnitsPerConstruction[constructionId] || []).map(u => u.unitIndex));
    setUnitSelections(prev => ({
      ...prev,
      [constructionId]: prev[constructionId]?.map(unit =>
        shippedIndexes.has(unit.unitIndex) ? unit : { ...unit, selected: true }
      ) || [],
    }));
  };

  const handleDeselectAllUnits = (constructionId: string) => {
    setUnitSelections(prev => ({
      ...prev,
      [constructionId]: prev[constructionId]?.map(unit => ({ ...unit, selected: false })) || [],
    }));
  };

  const handleApplyToAll = (constructionId: string, sourceUnitIndex: number) => {
    const shippedIndexes = new Set((shippedUnitsPerConstruction[constructionId] || []).map(u => u.unitIndex));
    const sourceUnit = unitSelections[constructionId]?.find(u => u.unitIndex === sourceUnitIndex);
    if (!sourceUnit) return;
    
    setUnitSelections(prev => ({
      ...prev,
      [constructionId]: prev[constructionId]?.map(unit => {
        if (shippedIndexes.has(unit.unitIndex) || unit.unitIndex === sourceUnitIndex) return unit;
        return unit.selected ? { ...unit, components: { ...sourceUnit.components } } : unit;
      }) || [],
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

    // Check that at least one unit is selected
    let hasSelectedUnits = false;
    selectedConstructionIds.forEach(id => {
      const units = unitSelections[id] || [];
      if (units.some(u => u.selected)) hasSelectedUnits = true;
    });
    
    if (!hasSelectedUnits) {
      toast({ title: "Error", description: "Please select at least one unit to deliver", variant: "destructive" });
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
        
        // Delete existing items and components
        const existingItems = batchConstructionItems[batchId] || [];
        if (existingItems.length > 0) {
          await supabase.from("batch_construction_components")
            .delete()
            .in("batch_construction_item_id", existingItems.map(i => i.id));
        }
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

      // Insert construction items and components
      for (const constructionId of Array.from(selectedConstructionIds)) {
        const units = unitSelections[constructionId] || [];
        const selectedUnits = units.filter(u => u.selected);
        
        if (selectedUnits.length === 0) continue;

        // Insert the construction item
        const { data: insertedItem, error: constructionError } = await supabase
          .from("batch_construction_items")
          .insert({
            batch_id: batchId,
            construction_id: constructionId,
            quantity: selectedUnits.length,
            include_glass: true,
            include_screens: selectedUnits.some(u => u.components.screen),
            include_blinds: selectedUnits.some(u => u.components.blinds),
            include_hardware: selectedUnits.some(u => u.components.handles),
            is_delivered: false,
            delivery_notes: null,
          })
          .select()
          .single();
        
        if (constructionError) throw constructionError;

        // Insert component details for each selected unit
        const componentsToInsert: { 
          batch_construction_item_id: string; 
          component_type: string; 
          quantity: number;
          unit_index: number;
        }[] = [];

        selectedUnits.forEach(unit => {
          Object.entries(unit.components).forEach(([key, included]) => {
            if (included) {
              componentsToInsert.push({
                batch_construction_item_id: insertedItem.id,
                component_type: key,
                quantity: 1,
                unit_index: unit.unitIndex,
              });
            }
          });
        });

        if (componentsToInsert.length > 0) {
          const { error: compError } = await supabase
            .from("batch_construction_components")
            .insert(componentsToInsert);
          if (compError) throw compError;
        }
      }

      toast({ 
        title: editingBatchId ? "Batch updated" : "Batch created", 
        description: `Delivery batch saved successfully` 
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

                    {/* Expanded Unit Selection Panels */}
                    {selectedConstructions.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-sm text-muted-foreground">
                          Select individual units and their components:
                        </Label>
                        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                          {selectedConstructions.map(construction => {
                            const shippedUnits = editingBatchId ? [] : (shippedUnitsPerConstruction[construction.id] || []);
                            const units = unitSelections[construction.id] || [];
                            
                            return (
                              <ExpandedConstructionPanel
                                key={construction.id}
                                construction={construction}
                                orderData={order}
                                unitSelections={units}
                                shippedUnits={shippedUnits}
                                onUnitToggle={(idx, sel) => handleUnitToggle(construction.id, idx, sel)}
                                onUnitComponentToggle={(idx, comp, val) => handleUnitComponentToggle(construction.id, idx, comp, val)}
                                onSelectAll={() => handleSelectAllUnits(construction.id)}
                                onDeselectAll={() => handleDeselectAllUnits(construction.id)}
                                onApplyToAll={(srcIdx) => handleApplyToAll(construction.id, srcIdx)}
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
        {/* Remaining to Ship - Per Unit Component Details */}
        {batches.length > 0 && (
          <RemainingToShipPanel
            constructions={allConstructions}
            shippedUnitsPerConstruction={shippedUnitsPerConstruction}
            orderData={order}
          />
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
