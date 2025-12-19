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

type UnitStatus = "not_ready" | "ready" | "selected" | "shipped";

interface UnitState {
  unitIndex: number;
  status: UnitStatus;
  components: Record<keyof UnitComponentState, { 
    applicable: boolean; 
    ready: boolean; 
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

function isUnitReady(manufacturingStatus: Record<string, string>, constructionType: string): boolean {
  // Check if assembly is complete for this construction type
  const assemblyStatus = manufacturingStatus["assembly"];
  return assemblyStatus === "complete";
}

function isComponentReady(
  componentKey: keyof UnitComponentState,
  manufacturingStatus: Record<string, string>,
  constructionType: string
): boolean {
  // Map component to manufacturing stage
  switch (componentKey) {
    case "screen":
    case "plisseScreen":
      return manufacturingStatus["screens"] === "complete";
    case "blinds":
      return manufacturingStatus["assembly"] === "complete";
    case "handles":
    case "weepingCovers":
    case "hingeCovers":
    case "nailFins":
    case "brackets":
      return manufacturingStatus["assembly"] === "complete";
    default:
      return true;
  }
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
        .select("assembly_status, glass_status, screens_cutting, welding_status, profile_cutting, reinforcement_cutting")
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
    // Helper to get effective manufacturing status using order_fulfillment as fallback
    const getEffectiveStatus = (stages: ManufacturingStage[]): Record<string, string> => {
      const mfgStatus: Record<string, string> = {};
      stages.forEach(s => { mfgStatus[s.stage] = s.status; });
      
      // Check if all construction-level stages are not_started (indicates data wasn't populated)
      const allNotStarted = stages.length > 0 && stages.every(s => s.status === 'not_started');
      
      // If construction-level data is missing or all not_started, use order_fulfillment as fallback
      if ((stages.length === 0 || allNotStarted) && orderFulfillment) {
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

      const unitReady = isUnitReady(mfgStatus, construction.construction_type);

      const units: UnitState[] = Array.from({ length: construction.quantity }, (_, i) => {
        const unitIdx = i + 1;
        const shippedComponents = shippedMap.get(unitIdx) || new Set<string>();
        
        // Check if all applicable components are shipped
        const applicableKeys = (Object.keys(applicable) as (keyof UnitComponentState)[]).filter(k => applicable[k]);
        const allShipped = applicableKeys.every(k => shippedComponents.has(k));
        const anyShipped = applicableKeys.some(k => shippedComponents.has(k));

        const componentStates: Record<keyof UnitComponentState, { applicable: boolean; ready: boolean; shipped: boolean; selected: boolean }> = {} as any;
        
        (Object.keys(applicable) as (keyof UnitComponentState)[]).forEach(key => {
          const isApplicable = applicable[key];
          const isReady = isApplicable && isComponentReady(key, mfgStatus, construction.construction_type);
          const isShipped = shippedComponents.has(key);
          
          componentStates[key] = {
            applicable: isApplicable,
            ready: isReady,
            shipped: isShipped,
            selected: false,
          };
        });

        let status: UnitStatus = "not_ready";
        if (allShipped) {
          status = "shipped";
        } else if (unitReady) {
          status = "ready";
        }

        return {
          unitIndex: unitIdx,
          status,
          components: componentStates,
        };
      });

      return {
        construction,
        expanded: false,
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
            if (u.status === "shipped" || u.status === "not_ready") return u;
            
            const newStatus: UnitStatus = u.status === "selected" ? "ready" : "selected";
            
            // When selecting, auto-select all ready components
            const newComponents = { ...u.components };
            if (newStatus === "selected") {
              (Object.keys(newComponents) as (keyof UnitComponentState)[]).forEach(key => {
                if (newComponents[key].applicable && newComponents[key].ready && !newComponents[key].shipped) {
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
            if (!comp.applicable || !comp.ready || comp.shipped) return u;
            
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
            const readyCount = units.filter(u => u.status === "ready").length;
            const selectedInConstruction = units.filter(u => u.status === "selected").length;
            const shippedCount = units.filter(u => u.status === "shipped").length;
            const notReadyCount = units.filter(u => u.status === "not_ready").length;

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
                    ({construction.quantity} total)
                  </span>
                  <div className="flex-1" />
                  <div className="flex gap-1.5">
                    {selectedInConstruction > 0 && (
                      <Badge className="text-[10px] px-1.5 py-0">
                        {selectedInConstruction} selected
                      </Badge>
                    )}
                    {readyCount > 0 && (
                      <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400 text-[10px] px-1.5 py-0">
                        {readyCount} ready
                      </Badge>
                    )}
                    {shippedCount > 0 && (
                      <Badge variant="outline" className="border-blue-500/50 text-blue-600 dark:text-blue-400 text-[10px] px-1.5 py-0">
                        {shippedCount} shipped
                      </Badge>
                    )}
                    {notReadyCount > 0 && (
                      <Badge variant="outline" className="border-muted-foreground/50 text-muted-foreground text-[10px] px-1.5 py-0">
                        {notReadyCount} pending
                      </Badge>
                    )}
                  </div>
                </button>

                {/* Expanded unit list */}
                {expanded && (
                  <div className="border-t bg-muted/10 p-2 space-y-1">
                    {units.map(unit => {
                      const isNotReady = unit.status === "not_ready";
                      const isShipped = unit.status === "shipped";
                      const isSelected = unit.status === "selected";
                      const isReady = unit.status === "ready";

                      const applicableComponents = (Object.keys(unit.components) as (keyof UnitComponentState)[])
                        .filter(key => unit.components[key].applicable);

                      return (
                        <div
                          key={unit.unitIndex}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg border transition-all",
                            isNotReady && "opacity-50 bg-muted/30 cursor-not-allowed",
                            isShipped && "bg-blue-500/10 border-blue-500/30",
                            isSelected && "bg-primary/10 border-primary/50",
                            isReady && "bg-background hover:bg-muted/30 cursor-pointer"
                          )}
                          onClick={() => canEdit && !isNotReady && !isShipped && toggleUnitSelection(construction.id, unit.unitIndex)}
                        >
                          {/* Status indicator */}
                          <div className="shrink-0">
                            {isShipped ? (
                              <CheckCircle2 className="h-4 w-4 text-blue-500" />
                            ) : isSelected ? (
                              <Checkbox checked className="h-4 w-4" />
                            ) : isReady ? (
                              <Circle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground/50" />
                            )}
                          </div>

                          {/* Unit label */}
                          <span
                            className={cn(
                              "text-xs font-medium min-w-[50px]",
                              isSelected && "text-primary",
                              isShipped && "text-blue-600 dark:text-blue-400",
                              isNotReady && "text-muted-foreground"
                            )}
                          >
                            Unit {unit.unitIndex}/{construction.quantity}
                          </span>

                          {/* Status label for not ready/shipped */}
                          {isNotReady && (
                            <span className="text-[10px] text-muted-foreground italic">
                              Manufacturing incomplete
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
                                if (comp.shipped) {
                                  return (
                                    <span
                                      key={key}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400"
                                    >
                                      {COMPONENT_LABELS[key]} ✓
                                    </span>
                                  );
                                }
                                if (!comp.ready) {
                                  return (
                                    <span
                                      key={key}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground opacity-50"
                                    >
                                      {COMPONENT_LABELS[key]}
                                    </span>
                                  );
                                }
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => toggleComponentSelection(construction.id, unit.unitIndex, key)}
                                    className={cn(
                                      "text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                                      comp.selected
                                        ? "bg-primary/20 border-primary/40 text-primary font-medium"
                                        : "bg-muted/50 border-border text-muted-foreground hover:border-muted-foreground/50"
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
                            <span className="text-[10px] text-green-600 dark:text-green-400 ml-auto">
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
