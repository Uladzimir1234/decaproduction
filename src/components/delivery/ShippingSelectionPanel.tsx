import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Package,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Truck,
  CalendarIcon,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { getApplicableComponents, getDefaultUnitComponents } from "./ExpandedConstructionPanel";
import type { ConstructionData } from "./ConstructionChipSelector";
import type { UnitSelection, UnitComponentState } from "./UnitCard";

interface OrderData {
  id: string;
  has_nailing_flanges?: boolean | null;
  has_plisse_screens?: boolean | null;
  visible_hinges_count?: number | null;
  hidden_hinges_count?: number | null;
}

interface ShippedUnitInfo {
  unitIndex: number;
  components: string[];
}

interface ManufacturingStage {
  stage: string;
  status: string;
}

interface OrderFulfillmentStatus {
  assembly_status: string | null;
  glass_status: string | null;
  screens_cutting: string | null;
  welding_status: string | null;
  profile_cutting: string | null;
  reinforcement_cutting: string | null;
  doors_status: string | null;
  sliding_doors_status: string | null;
}

interface ShippingSelectionPanelProps {
  orderId: string;
  orderData: OrderData;
  constructions: ConstructionData[];
  shippedUnitsPerConstruction: Record<string, ShippedUnitInfo[]>;
  onBatchCreated: () => void;
  canEdit: boolean;
}

const COMPONENT_LABELS: Record<keyof UnitComponentState, string> = {
  screen: "Screen",
  blinds: "Blinds",
  handles: "Handles",
  weepingCovers: "Weeping",
  hingeCovers: "Hinges",
  nailFins: "Nail Fins",
  brackets: "Brackets",
  plisseScreen: "Plissé",
};

const CONSTRUCTION_TYPE_LABELS: Record<string, string> = {
  window: "Window",
  door: "Door",
  sliding_door: "Sliding Door",
};

// Production status: not_available (red), in_production (yellow), ready (green), shipped (blue)
type ProductionStatus = "not_available" | "in_production" | "ready";
type UnitStatus = "not_available" | "in_production" | "ready" | "selected" | "shipped";

interface UnitState {
  unitIndex: number;
  status: UnitStatus;
  productionStatus: ProductionStatus; // Track underlying production status
  components: Record<keyof UnitComponentState, { 
    applicable: boolean; 
    productionStatus: ProductionStatus;
    shipped: boolean; 
    selected: boolean;
  }>;
}

interface ConstructionState {
  construction: ConstructionData;
  expanded: boolean;
  manufacturingStatus: Record<string, string>;
  units: UnitState[];
}

function getUnitProductionStatus(
  manufacturingStatus: Record<string, string>,
  constructionType: string,
  orderFulfillment: OrderFulfillmentStatus | null
): ProductionStatus {
  // For doors, check doors_status specifically from order_fulfillment
  if (constructionType === 'door' && orderFulfillment) {
    const doorsStatus = orderFulfillment.doors_status;
    if (doorsStatus === 'complete') return "ready";
    if (doorsStatus === 'partial' || doorsStatus === 'in_progress') return "in_production";
    return "not_available";
  }
  
  // For sliding doors, check sliding_doors_status from order_fulfillment
  if (constructionType === 'sliding_door' && orderFulfillment) {
    const slidingStatus = orderFulfillment.sliding_doors_status;
    if (slidingStatus === 'complete') return "ready";
    if (slidingStatus === 'partial' || slidingStatus === 'in_progress') return "in_production";
    return "not_available";
  }
  
  // For windows, check assembly_status
  const assemblyStatus = manufacturingStatus["assembly"];
  if (!assemblyStatus || assemblyStatus === "not_started") return "not_available";
  if (assemblyStatus === "in_progress" || assemblyStatus === "partial") return "in_production";
  return "ready"; // complete
}

function getComponentProductionStatus(
  componentKey: keyof UnitComponentState,
  manufacturingStatus: Record<string, string>
): ProductionStatus {
  // Map component to manufacturing stage
  let stageStatus: string | undefined;
  
  switch (componentKey) {
    case "screen":
    case "plisseScreen":
      stageStatus = manufacturingStatus["screens"];
      break;
    case "blinds":
      stageStatus = manufacturingStatus["assembly"];
      break;
    case "handles":
    case "weepingCovers":
    case "hingeCovers":
    case "nailFins":
    case "brackets":
      stageStatus = manufacturingStatus["assembly"];
      break;
    default:
      return "ready";
  }
  
  if (!stageStatus || stageStatus === "not_started") return "not_available";
  if (stageStatus === "in_progress") return "in_production";
  return "ready";
}

export function ShippingSelectionPanel({
  orderId,
  orderData,
  constructions,
  shippedUnitsPerConstruction,
  onBatchCreated,
  canEdit,
}: ShippingSelectionPanelProps) {
  const { toast } = useToast();
  const [constructionStates, setConstructionStates] = useState<ConstructionState[]>([]);
  const [manufacturingData, setManufacturingData] = useState<Record<string, ManufacturingStage[]>>({});
  const [orderFulfillment, setOrderFulfillment] = useState<OrderFulfillmentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Batch creation fields
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(new Date());
  const [deliveryPerson, setDeliveryPerson] = useState("");
  const [customItems, setCustomItems] = useState<{ name: string; qty: number }[]>([]);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemQty, setCustomItemQty] = useState(1);

  // Fetch manufacturing status for all constructions and order fulfillment as fallback
  const fetchManufacturingStatus = useCallback(async () => {
    const constructionIds = constructions.map(c => c.id);
    if (constructionIds.length === 0) {
      setLoading(false);
      return;
    }

    // Fetch both construction-level and order-level manufacturing data in parallel
    const [constructionResult, fulfillmentResult] = await Promise.all([
      supabase
        .from("construction_manufacturing")
        .select("construction_id, stage, status")
        .in("construction_id", constructionIds),
      supabase
        .from("order_fulfillment")
        .select("assembly_status, glass_status, screens_cutting, welding_status, profile_cutting, reinforcement_cutting, doors_status, sliding_doors_status")
        .eq("order_id", orderId)
        .maybeSingle()
    ]);

    if (!constructionResult.error && constructionResult.data) {
      const grouped: Record<string, ManufacturingStage[]> = {};
      constructionResult.data.forEach(row => {
        if (!grouped[row.construction_id]) {
          grouped[row.construction_id] = [];
        }
        grouped[row.construction_id].push({ stage: row.stage, status: row.status });
      });
      setManufacturingData(grouped);
    }

    if (!fulfillmentResult.error && fulfillmentResult.data) {
      setOrderFulfillment(fulfillmentResult.data);
    }

    setLoading(false);
  }, [constructions, orderId]);

  useEffect(() => {
    fetchManufacturingStatus();
  }, [fetchManufacturingStatus]);

  // Initialize construction states when data changes
  useEffect(() => {
    // Helper to get effective manufacturing status using order_fulfillment as source of truth
    const getEffectiveStatus = (stages: ManufacturingStage[]): Record<string, string> => {
      const mfgStatus: Record<string, string> = {};
      stages.forEach(s => { mfgStatus[s.stage] = s.status; });
      
      // Check if construction-level data has any real updates (not all "not_started")
      const hasRealUpdates = stages.some(s => s.status !== 'not_started');
      
      // Use order_fulfillment as source of truth when:
      // - No construction records exist, OR
      // - All construction records are "not_started" (placeholders that were never updated)
      if (!hasRealUpdates && orderFulfillment) {
        return {
          assembly: orderFulfillment.assembly_status || 'not_started',
          glass: orderFulfillment.glass_status || 'not_started',
          screens: orderFulfillment.screens_cutting || 'not_started',
          welding: orderFulfillment.welding_status || 'not_started',
          profile_cutting: orderFulfillment.profile_cutting || 'not_started',
          reinforcement_cutting: orderFulfillment.reinforcement_cutting || 'not_started',
        };
      }
      
      return mfgStatus;
    };

    const states: ConstructionState[] = constructions.map(construction => {
      const stages = manufacturingData[construction.id] || [];
      const mfgStatus = getEffectiveStatus(stages);

      const applicable = getApplicableComponents(construction, orderData);
      const shippedUnits = shippedUnitsPerConstruction[construction.id] || [];
      const shippedMap = new Map<number, Set<string>>();
      shippedUnits.forEach(u => {
        if (!shippedMap.has(u.unitIndex)) {
          shippedMap.set(u.unitIndex, new Set());
        }
        u.components.forEach(c => shippedMap.get(u.unitIndex)!.add(c));
      });

      const unitProductionStatus = getUnitProductionStatus(mfgStatus, construction.construction_type, orderFulfillment);

      const units: UnitState[] = Array.from({ length: construction.quantity }, (_, i) => {
        const unitIdx = i + 1;
        const shippedComponents = shippedMap.get(unitIdx) || new Set<string>();
        
        // Check if all applicable components are shipped
        const applicableKeys = (Object.keys(applicable) as (keyof UnitComponentState)[]).filter(k => applicable[k]);
        const allShipped = applicableKeys.every(k => shippedComponents.has(k));

        const componentStates: Record<keyof UnitComponentState, { applicable: boolean; productionStatus: ProductionStatus; shipped: boolean; selected: boolean }> = {} as any;
        
        (Object.keys(applicable) as (keyof UnitComponentState)[]).forEach(key => {
          const isApplicable = applicable[key];
          const isShipped = shippedComponents.has(key);
          
          // If the unit's production (assembly) is not ready, all components inherit that status
          // Components are only individually ready when the overall construction is ready
          let prodStatus: ProductionStatus;
          if (!isApplicable) {
            prodStatus = "not_available";
          } else if (unitProductionStatus !== "ready") {
            // Construction not finished = all components not available for shipping
            prodStatus = unitProductionStatus;
          } else {
            // Construction is ready, check individual component status
            prodStatus = getComponentProductionStatus(key, mfgStatus);
          }
          
          componentStates[key] = {
            applicable: isApplicable,
            productionStatus: prodStatus,
            shipped: isShipped,
            selected: false,
          };
        });

        let status: UnitStatus = unitProductionStatus;
        if (allShipped) {
          status = "shipped";
        }

        return {
          unitIndex: unitIdx,
          status,
          productionStatus: unitProductionStatus,
          components: componentStates,
        };
      });

      return {
        construction,
        expanded: construction.quantity > 1, // Auto-expand multi-unit constructions
        manufacturingStatus: mfgStatus,
        units,
      };
    });

    setConstructionStates(states);
  }, [constructions, manufacturingData, orderFulfillment, shippedUnitsPerConstruction, orderData]);

  const toggleExpanded = (constructionId: string) => {
    setConstructionStates(prev =>
      prev.map(cs =>
        cs.construction.id === constructionId ? { ...cs, expanded: !cs.expanded } : cs
      )
    );
  };

  const toggleUnitSelection = (constructionId: string, unitIndex: number) => {
    setConstructionStates(prev =>
      prev.map(cs => {
        if (cs.construction.id !== constructionId) return cs;
        return {
          ...cs,
          units: cs.units.map(u => {
            if (u.unitIndex !== unitIndex) return u;
            // Only allow selection of ready (green) units
            if (u.status === "shipped" || u.productionStatus !== "ready") return u;
            
            const newStatus: UnitStatus = u.status === "selected" ? "ready" : "selected";
            
            // When selecting, auto-select all ready components
            const newComponents = { ...u.components };
            if (newStatus === "selected") {
              (Object.keys(newComponents) as (keyof UnitComponentState)[]).forEach(key => {
                if (newComponents[key].applicable && newComponents[key].productionStatus === "ready" && !newComponents[key].shipped) {
                  newComponents[key] = { ...newComponents[key], selected: true };
                }
              });
            } else {
              // When deselecting, deselect all components
              (Object.keys(newComponents) as (keyof UnitComponentState)[]).forEach(key => {
                newComponents[key] = { ...newComponents[key], selected: false };
              });
            }
            
            return { ...u, status: newStatus, components: newComponents };
          }),
        };
      })
    );
  };

  const toggleComponentSelection = (
    constructionId: string,
    unitIndex: number,
    componentKey: keyof UnitComponentState
  ) => {
    setConstructionStates(prev =>
      prev.map(cs => {
        if (cs.construction.id !== constructionId) return cs;
        return {
          ...cs,
          units: cs.units.map(u => {
            if (u.unitIndex !== unitIndex) return u;
            if (u.status !== "selected") return u;
            
            const comp = u.components[componentKey];
            // Only allow toggling ready (green) components
            if (!comp.applicable || comp.productionStatus !== "ready" || comp.shipped) return u;
            
            return {
              ...u,
              components: {
                ...u.components,
                [componentKey]: { ...comp, selected: !comp.selected },
              },
            };
          }),
        };
      })
    );
  };

  const addCustomItem = () => {
    if (!customItemName.trim()) return;
    setCustomItems([...customItems, { name: customItemName.trim(), qty: customItemQty }]);
    setCustomItemName("");
    setCustomItemQty(1);
  };

  const removeCustomItem = (index: number) => {
    setCustomItems(customItems.filter((_, i) => i !== index));
  };

  // Count selected items
  const selectedCount = constructionStates.reduce((sum, cs) => {
    return sum + cs.units.filter(u => u.status === "selected").length;
  }, 0);

  const hasSelection = selectedCount > 0 || customItems.length > 0;

  const createShipment = async () => {
    if (!deliveryPerson.trim()) {
      toast({ title: "Error", description: "Please enter the person in charge", variant: "destructive" });
      return;
    }
    if (!hasSelection) {
      toast({ title: "Error", description: "Please select items to ship", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      // Create batch
      const { data: batchData, error: batchError } = await supabase
        .from("delivery_batches")
        .insert({
          order_id: orderId,
          delivery_date: format(deliveryDate!, "yyyy-MM-dd"),
          delivery_person: deliveryPerson.trim(),
          status: "preparing",
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (batchError) throw batchError;
      const batchId = batchData.id;

      // Insert custom items
      if (customItems.length > 0) {
        const { error: customError } = await supabase
          .from("batch_custom_shipping_items")
          .insert(customItems.map(item => ({
            batch_id: batchId,
            name: item.name,
            quantity: item.qty,
            is_complete: false,
          })));
        if (customError) throw customError;
      }

      // Insert construction items and components
      for (const cs of constructionStates) {
        const selectedUnits = cs.units.filter(u => u.status === "selected");
        if (selectedUnits.length === 0) continue;

        const { data: itemData, error: itemError } = await supabase
          .from("batch_construction_items")
          .insert({
            batch_id: batchId,
            construction_id: cs.construction.id,
            quantity: selectedUnits.length,
            include_glass: true,
            include_screens: selectedUnits.some(u => u.components.screen?.selected),
            include_blinds: selectedUnits.some(u => u.components.blinds?.selected),
            include_hardware: selectedUnits.some(u => u.components.handles?.selected),
            is_delivered: false,
          })
          .select()
          .single();

        if (itemError) throw itemError;

        // Insert component details
        const componentsToInsert: {
          batch_construction_item_id: string;
          component_type: string;
          quantity: number;
          unit_index: number;
        }[] = [];

        selectedUnits.forEach(unit => {
          (Object.keys(unit.components) as (keyof UnitComponentState)[]).forEach(key => {
            const comp = unit.components[key];
            if (comp.selected) {
              componentsToInsert.push({
                batch_construction_item_id: itemData.id,
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

      toast({ title: "Shipment created", description: "Delivery batch saved successfully" });
      
      // Reset selection state
      setDeliveryPerson("");
      setCustomItems([]);
      setConstructionStates(prev =>
        prev.map(cs => ({
          ...cs,
          units: cs.units.map(u => ({
            ...u,
            status: u.status === "selected" ? "ready" : u.status,
            components: Object.fromEntries(
              Object.entries(u.components).map(([k, v]) => [k, { ...v, selected: false }])
            ) as typeof u.components,
          })),
        }))
      );
      
      onBatchCreated();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardContent className="py-4 space-y-4">
        {/* Header with Ship button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <span className="font-semibold">Shipping Selection</span>
            {selectedCount > 0 && (
              <Badge variant="default" className="ml-2">
                {selectedCount} unit{selectedCount !== 1 ? "s" : ""} selected
              </Badge>
            )}
          </div>
          {hasSelection && canEdit && (
            <Button
              size="sm"
              onClick={createShipment}
              disabled={saving}
              className="gap-1"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Truck className="h-4 w-4" />
              )}
              Ship Selected
            </Button>
          )}
        </div>

        {/* Delivery info (always visible when items selected) */}
        {hasSelection && canEdit && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border">
            <div className="space-y-1">
              <Label className="text-xs">Person in Charge</Label>
              <Input
                value={deliveryPerson}
                onChange={e => setDeliveryPerson(e.target.value)}
                placeholder="Enter name"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Delivery Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-8 justify-start text-left font-normal text-sm",
                      !deliveryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {deliveryDate ? format(deliveryDate, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deliveryDate}
                    onSelect={setDeliveryDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {/* Construction list */}
        <div className="space-y-2">
          {constructionStates.map(cs => {
            const { construction, expanded, units } = cs;
            const isSingleUnit = construction.quantity === 1;
            const singleUnit = isSingleUnit ? units[0] : null;
            
            const readyCount = units.filter(u => u.productionStatus === "ready" && u.status !== "shipped" && u.status !== "selected").length;
            const selectedInConstruction = units.filter(u => u.status === "selected").length;
            const shippedCount = units.filter(u => u.status === "shipped").length;
            const inProductionCount = units.filter(u => u.productionStatus === "in_production" && u.status !== "shipped").length;
            const notAvailableCount = units.filter(u => u.productionStatus === "not_available" && u.status !== "shipped").length;

            // Single unit rendering - inline with components visible
            if (isSingleUnit && singleUnit) {
              const isShipped = singleUnit.status === "shipped";
              const isSelected = singleUnit.status === "selected";
              const isReady = singleUnit.productionStatus === "ready" && !isShipped && !isSelected;
              const isInProduction = singleUnit.productionStatus === "in_production" && !isShipped;
              const isNotAvailable = singleUnit.productionStatus === "not_available" && !isShipped;
              const canSelect = singleUnit.productionStatus === "ready" && !isShipped;

              const applicableComponents = (Object.keys(singleUnit.components) as (keyof UnitComponentState)[])
                .filter(key => singleUnit.components[key].applicable);

              return (
                <div
                  key={construction.id}
                  className={cn(
                    "border rounded-lg p-2.5 transition-all",
                    isNotAvailable && "bg-red-500/10 border-red-500/30",
                    isInProduction && "bg-amber-500/10 border-amber-500/30",
                    isReady && "bg-green-500/10 border-green-500/30",
                    isSelected && "bg-green-500/20 border-green-500/50 ring-2 ring-green-500/30",
                    isShipped && "bg-blue-500/10 border-blue-500/30"
                  )}
                >
                  {/* Construction header row */}
                  <div
                    className={cn(
                      "flex items-center gap-2",
                      canSelect && canEdit && "cursor-pointer"
                    )}
                    onClick={() => canEdit && canSelect && toggleUnitSelection(construction.id, singleUnit.unitIndex)}
                  >
                    {/* Status indicator */}
                    <div className="shrink-0">
                      {isShipped ? (
                        <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      ) : isSelected ? (
                        <Checkbox checked className="h-4 w-4" />
                      ) : isReady ? (
                        <Circle className="h-4 w-4 text-green-500" />
                      ) : isInProduction ? (
                        <Circle className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-red-500" />
                      )}
                    </div>

                    <Package
                      className={cn(
                        "h-4 w-4 shrink-0",
                        construction.construction_type === "window" && "text-blue-500",
                        construction.construction_type === "door" && "text-orange-500",
                        construction.construction_type === "sliding_door" && "text-purple-500"
                      )}
                    />
                    <span className="font-medium text-sm">#{construction.construction_number}</span>
                    <span className="text-xs text-muted-foreground">
                      {CONSTRUCTION_TYPE_LABELS[construction.construction_type] || construction.construction_type}
                    </span>
                    
                    <div className="flex-1" />
                    
                    {/* Status labels */}
                    {isNotAvailable && (
                      <span className="text-[10px] text-red-600 dark:text-red-400 italic">
                        Not available
                      </span>
                    )}
                    {isInProduction && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                        In production
                      </span>
                    )}
                    {isReady && (
                      <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                        Ready to ship
                      </span>
                    )}
                    {isSelected && (
                      <Badge className="text-[10px] px-1.5 py-0">
                        Selected
                      </Badge>
                    )}
                    {isShipped && (
                      <Badge variant="outline" className="bg-blue-500/10 border-blue-500/50 text-blue-600 dark:text-blue-400 text-[10px] px-1.5 py-0">
                        Shipped
                      </Badge>
                    )}
                  </div>

                  {/* Component badges - always visible for single unit */}
                  {applicableComponents.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-current/10" onClick={e => e.stopPropagation()}>
                      {applicableComponents.map(key => {
                        const comp = singleUnit.components[key];
                        const prodStatus = comp.productionStatus;
                        
                        if (comp.shipped) {
                          return (
                            <span
                              key={key}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-600 dark:text-blue-400"
                            >
                              {COMPONENT_LABELS[key]} ✓
                            </span>
                          );
                        }
                        if (prodStatus === "not_available") {
                          return (
                            <span
                              key={key}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-400"
                            >
                              {COMPONENT_LABELS[key]}
                            </span>
                          );
                        }
                        if (prodStatus === "in_production") {
                          return (
                            <span
                              key={key}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400"
                            >
                              {COMPONENT_LABELS[key]}
                            </span>
                          );
                        }
                        // Ready - selectable when unit is selected
                        if (isSelected) {
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => toggleComponentSelection(construction.id, singleUnit.unitIndex, key)}
                              className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                                comp.selected
                                  ? "bg-green-500/30 border-green-500/50 text-green-700 dark:text-green-300 font-medium ring-1 ring-green-500/30"
                                  : "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/20"
                              )}
                            >
                              {COMPONENT_LABELS[key]}
                            </button>
                          );
                        }
                        // Ready but not selected yet
                        return (
                          <span
                            key={key}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400"
                          >
                            {COMPONENT_LABELS[key]}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Multi-unit rendering - expandable
            return (
              <div key={construction.id} className="border rounded-lg overflow-hidden">
                {/* Construction header */}
                <button
                  type="button"
                  onClick={() => toggleExpanded(construction.id)}
                  className="w-full flex items-center gap-2 p-2.5 hover:bg-muted/50 transition-colors text-left"
                >
                  {expanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <Package
                    className={cn(
                      "h-4 w-4 shrink-0",
                      construction.construction_type === "window" && "text-blue-500",
                      construction.construction_type === "door" && "text-orange-500",
                      construction.construction_type === "sliding_door" && "text-purple-500"
                    )}
                  />
                  <span className="font-medium text-sm">#{construction.construction_number}</span>
                  <span className="text-xs text-muted-foreground">
                    {CONSTRUCTION_TYPE_LABELS[construction.construction_type] || construction.construction_type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({construction.quantity} units)
                  </span>
                  <div className="flex-1" />
                  <div className="flex gap-1.5">
                    {selectedInConstruction > 0 && (
                      <Badge className="text-[10px] px-1.5 py-0">
                        {selectedInConstruction} selected
                      </Badge>
                    )}
                    {shippedCount > 0 && (
                      <Badge variant="outline" className="bg-blue-500/10 border-blue-500/50 text-blue-600 dark:text-blue-400 text-[10px] px-1.5 py-0">
                        {shippedCount} shipped
                      </Badge>
                    )}
                    {readyCount > 0 && (
                      <Badge variant="outline" className="bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400 text-[10px] px-1.5 py-0">
                        {readyCount} ready
                      </Badge>
                    )}
                    {inProductionCount > 0 && (
                      <Badge variant="outline" className="bg-amber-500/10 border-amber-500/50 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 py-0">
                        {inProductionCount} in production
                      </Badge>
                    )}
                    {notAvailableCount > 0 && (
                      <Badge variant="outline" className="bg-red-500/10 border-red-500/50 text-red-600 dark:text-red-400 text-[10px] px-1.5 py-0">
                        {notAvailableCount} not available
                      </Badge>
                    )}
                  </div>
                </button>

                {/* Expanded unit list */}
                {expanded && (
                  <div className="border-t bg-muted/10 p-2 space-y-1">
                    {units.map(unit => {
                      const isShipped = unit.status === "shipped";
                      const isSelected = unit.status === "selected";
                      const isReady = unit.productionStatus === "ready" && !isShipped && !isSelected;
                      const isInProduction = unit.productionStatus === "in_production" && !isShipped;
                      const isNotAvailable = unit.productionStatus === "not_available" && !isShipped;
                      const canSelect = unit.productionStatus === "ready" && !isShipped;

                      const applicableComponents = (Object.keys(unit.components) as (keyof UnitComponentState)[])
                        .filter(key => unit.components[key].applicable);

                      return (
                        <div
                          key={unit.unitIndex}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg border transition-all",
                            // Color scheme: Red (not available), Yellow (in production), Green (ready), Blue (shipped)
                            isNotAvailable && "bg-red-500/10 border-red-500/30 opacity-70",
                            isInProduction && "bg-amber-500/10 border-amber-500/30",
                            isReady && "bg-green-500/10 border-green-500/30 cursor-pointer hover:bg-green-500/20",
                            isSelected && "bg-green-500/20 border-green-500/50 ring-2 ring-green-500/30",
                            isShipped && "bg-blue-500/10 border-blue-500/30"
                          )}
                          onClick={() => canEdit && canSelect && toggleUnitSelection(construction.id, unit.unitIndex)}
                        >
                          {/* Status indicator */}
                          <div className="shrink-0">
                            {isShipped ? (
                              <CheckCircle2 className="h-4 w-4 text-blue-500" />
                            ) : isSelected ? (
                              <Checkbox checked className="h-4 w-4" />
                            ) : isReady ? (
                              <Circle className="h-4 w-4 text-green-500" />
                            ) : isInProduction ? (
                              <Circle className="h-4 w-4 text-amber-500" />
                            ) : (
                              <Circle className="h-4 w-4 text-red-500" />
                            )}
                          </div>

                          {/* Unit label */}
                          <span
                            className={cn(
                              "text-xs font-medium min-w-[50px]",
                              isSelected && "text-green-700 dark:text-green-300",
                              isShipped && "text-blue-600 dark:text-blue-400",
                              isInProduction && "text-amber-600 dark:text-amber-400",
                              isNotAvailable && "text-red-600 dark:text-red-400",
                              isReady && "text-green-600 dark:text-green-400"
                            )}
                          >
                            Unit {unit.unitIndex}/{construction.quantity}
                          </span>

                          {/* Status labels */}
                          {isNotAvailable && (
                            <span className="text-[10px] text-red-600 dark:text-red-400 italic">
                              Not available
                            </span>
                          )}
                          {isInProduction && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                              In production
                            </span>
                          )}
                          {isShipped && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400">
                              Shipped
                            </span>
                          )}

                          {/* Component toggles for selected units */}
                          {isSelected && (
                            <div className="flex flex-wrap gap-1 flex-1" onClick={e => e.stopPropagation()}>
                              {applicableComponents.map(key => {
                                const comp = unit.components[key];
                                const prodStatus = comp.productionStatus;
                                
                                if (comp.shipped) {
                                  return (
                                    <span
                                      key={key}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-600 dark:text-blue-400"
                                    >
                                      {COMPONENT_LABELS[key]} ✓
                                    </span>
                                  );
                                }
                                if (prodStatus === "not_available") {
                                  return (
                                    <span
                                      key={key}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-400"
                                    >
                                      {COMPONENT_LABELS[key]}
                                    </span>
                                  );
                                }
                                if (prodStatus === "in_production") {
                                  return (
                                    <span
                                      key={key}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400"
                                    >
                                      {COMPONENT_LABELS[key]}
                                    </span>
                                  );
                                }
                                // Ready - selectable
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => toggleComponentSelection(construction.id, unit.unitIndex, key)}
                                    className={cn(
                                      "text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                                      comp.selected
                                        ? "bg-green-500/30 border-green-500/50 text-green-700 dark:text-green-300 font-medium ring-1 ring-green-500/30"
                                        : "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/20"
                                    )}
                                  >
                                    {COMPONENT_LABELS[key]}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Ready indicator */}
                          {isReady && (
                            <span className="text-[10px] text-green-600 dark:text-green-400 ml-auto font-medium">
                              Ready to ship
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom items section */}
        {canEdit && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-sm">Custom Shipping Items</Label>
              {customItems.length > 0 && (
                <div className="space-y-1">
                  {customItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                      <Badge variant="secondary" className="text-xs">Custom</Badge>
                      <span className="flex-1 text-sm">{item.name}</span>
                      <Badge variant="outline" className="text-xs">×{item.qty}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeCustomItem(idx)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Custom item name"
                  value={customItemName}
                  onChange={e => setCustomItemName(e.target.value)}
                  className="flex-1 h-8 text-sm"
                />
                <Input
                  type="number"
                  min={1}
                  value={customItemQty}
                  onChange={e => setCustomItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 h-8 text-xs text-center"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCustomItem}
                  disabled={!customItemName.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
