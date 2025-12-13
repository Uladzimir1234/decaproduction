import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ConstructionDeliveryItem, ManufacturingStatus } from "./ConstructionDeliveryItem";
import { CheckSquare, Square, AlertTriangle } from "lucide-react";

interface Construction {
  id: string;
  construction_number: string;
  construction_type: string;
  width_inches: number | null;
  height_inches: number | null;
  width_mm: number | null;
  height_mm: number | null;
  color_exterior: string | null;
  color_interior: string | null;
  glass_type: string | null;
  screen_type: string | null;
  has_blinds: boolean | null;
  blinds_color: string | null;
  handle_type: string | null;
  quantity: number;
  position_index: number;
}

interface ManufacturingStageRow {
  construction_id: string;
  stage: string;
  status: string;
}

export interface ConstructionSelection {
  constructionId: string;
  selected: boolean;
  includeGlass: boolean;
  includeScreens: boolean;
  includeBlinds: boolean;
  includeHardware: boolean;
  notes: string;
}

interface ConstructionDeliveryListProps {
  orderId: string;
  selections: ConstructionSelection[];
  onSelectionsChange: (selections: ConstructionSelection[]) => void;
  disabled?: boolean;
  existingBatchConstructionIds?: string[];
}

export function ConstructionDeliveryList({
  orderId,
  selections,
  onSelectionsChange,
  disabled = false,
  existingBatchConstructionIds = [],
}: ConstructionDeliveryListProps) {
  const [constructions, setConstructions] = useState<Construction[]>([]);
  const [manufacturingStages, setManufacturingStages] = useState<ManufacturingStageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch constructions and ALL manufacturing stages
      const [constructionsRes, manufacturingRes] = await Promise.all([
        supabase
          .from("order_constructions")
          .select("*")
          .eq("order_id", orderId)
          .order("position_index", { ascending: true }),
        supabase
          .from("construction_manufacturing")
          .select("construction_id, stage, status")
      ]);

      if (constructionsRes.data) {
        setConstructions(constructionsRes.data);
        
        // Filter to only stages for this order's constructions
        const constructionIds = constructionsRes.data.map(c => c.id);
        const relevantStages = manufacturingRes.data?.filter(s => 
          constructionIds.includes(s.construction_id)
        ) || [];
        setManufacturingStages(relevantStages);
        
        // Initialize selections - only pre-select deliverable items
        if (selections.length === 0) {
          const initialSelections: ConstructionSelection[] = constructionsRes.data.map(c => {
            const status = getManufacturingStatusForConstruction(c.id, c.construction_type, relevantStages);
            const deliverability = checkDeliverability(c.construction_type, status);
            const alreadyInBatch = existingBatchConstructionIds.includes(c.id);
            
            return {
              constructionId: c.id,
              // Only pre-select if deliverable AND not in another batch
              selected: deliverability.isDeliverable && !alreadyInBatch,
              // Default glass to false if not installed
              includeGlass: status.glass_installation === 'complete',
              includeScreens: !!c.screen_type,
              includeBlinds: !!c.has_blinds,
              includeHardware: !!c.handle_type,
              notes: "",
            };
          });
          onSelectionsChange(initialSelections);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [orderId]);

  // Get manufacturing status for a specific construction
  const getManufacturingStatusForConstruction = (
    constructionId: string, 
    constructionType: string,
    stages: ManufacturingStageRow[] = manufacturingStages
  ): ManufacturingStatus => {
    const constructionStages = stages.filter(s => s.construction_id === constructionId);
    
    return {
      welding: constructionStages.find(s => s.stage === 'welding')?.status,
      frames_sashes_assembled: constructionStages.find(s => s.stage === 'frames_sashes_assembled')?.status,
      doors_assembly: constructionStages.find(s => s.stage === 'doors_assembly')?.status,
      sliding_doors_assembly: constructionStages.find(s => s.stage === 'sliding_doors_assembly')?.status,
      glass_installation: constructionStages.find(s => s.stage === 'glass_installation')?.status,
    };
  };

  // Check if construction is deliverable based on manufacturing status
  const checkDeliverability = (
    constructionType: string, 
    status: ManufacturingStatus
  ): { isDeliverable: boolean; reason?: string } => {
    // Must be assembled to be deliverable
    switch (constructionType) {
      case 'window':
        if (status.frames_sashes_assembled !== 'complete') {
          return { isDeliverable: false, reason: "Window frame/sash not assembled" };
        }
        break;
      case 'door':
        if (status.doors_assembly !== 'complete') {
          return { isDeliverable: false, reason: "Door not assembled" };
        }
        break;
      case 'sliding_door':
        if (status.sliding_doors_assembly !== 'complete') {
          return { isDeliverable: false, reason: "Sliding door not assembled" };
        }
        break;
    }
    
    return { isDeliverable: true };
  };

  const updateSelection = (constructionId: string, updates: Partial<ConstructionSelection>) => {
    const newSelections = selections.map(s => 
      s.constructionId === constructionId ? { ...s, ...updates } : s
    );
    onSelectionsChange(newSelections);
  };

  // Select only deliverable items
  const selectAllDeliverable = () => {
    const newSelections = selections.map(s => {
      const construction = constructions.find(c => c.id === s.constructionId);
      if (!construction) return s;
      
      const status = getManufacturingStatusForConstruction(s.constructionId, construction.construction_type);
      const deliverability = checkDeliverability(construction.construction_type, status);
      const alreadyInBatch = existingBatchConstructionIds.includes(s.constructionId);
      
      return { 
        ...s, 
        selected: deliverability.isDeliverable && !alreadyInBatch 
      };
    });
    onSelectionsChange(newSelections);
  };

  const deselectAll = () => {
    const newSelections = selections.map(s => ({ ...s, selected: false }));
    onSelectionsChange(newSelections);
  };

  // Calculate counts
  const deliverableCount = constructions.filter(c => {
    const status = getManufacturingStatusForConstruction(c.id, c.construction_type);
    return checkDeliverability(c.construction_type, status).isDeliverable;
  }).length;
  
  const selectedCount = selections.filter(s => s.selected).length;
  const notDeliverableCount = constructions.length - deliverableCount;

  // Group constructions by type
  const windows = constructions.filter(c => c.construction_type === 'window');
  const doors = constructions.filter(c => c.construction_type === 'door');
  const slidingDoors = constructions.filter(c => c.construction_type === 'sliding_door');

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground text-sm">Loading constructions...</div>;
  }

  if (constructions.length === 0) {
    return <div className="text-center py-4 text-muted-foreground text-sm">No constructions found for this order.</div>;
  }

  const renderConstructionGroup = (items: Construction[], label: string) => {
    if (items.length === 0) return null;
    
    // Count deliverable items in this group
    const deliverableInGroup = items.filter(c => {
      const status = getManufacturingStatusForConstruction(c.id, c.construction_type);
      return checkDeliverability(c.construction_type, status).isDeliverable;
    }).length;
    
    const notReadyInGroup = items.length - deliverableInGroup;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          <Badge variant="secondary" className="text-xs">
            {deliverableInGroup} ready
          </Badge>
          {notReadyInGroup > 0 && (
            <Badge variant="outline" className="text-xs border-red-500/50 text-red-600">
              {notReadyInGroup} not assembled
            </Badge>
          )}
        </div>
        <div className="space-y-2">
          {items.map(construction => {
            const selection = selections.find(s => s.constructionId === construction.id);
            if (!selection) return null;
            
            const status = getManufacturingStatusForConstruction(construction.id, construction.construction_type);
            const deliverability = checkDeliverability(construction.construction_type, status);
            const alreadyInBatch = existingBatchConstructionIds.includes(construction.id);
            
            return (
              <div key={construction.id} className="relative">
                {alreadyInBatch && (
                  <Badge 
                    variant="outline" 
                    className="absolute -top-2 right-2 text-[10px] bg-background z-10 border-amber-500/50 text-amber-600"
                  >
                    In another batch
                  </Badge>
                )}
                <ConstructionDeliveryItem
                  construction={construction}
                  manufacturingStatus={status}
                  selected={selection.selected}
                  includeGlass={selection.includeGlass}
                  includeScreens={selection.includeScreens}
                  includeBlinds={selection.includeBlinds}
                  includeHardware={selection.includeHardware}
                  notes={selection.notes}
                  onSelectedChange={(selected) => updateSelection(construction.id, { selected })}
                  onGlassChange={(includeGlass) => updateSelection(construction.id, { includeGlass })}
                  onScreensChange={(includeScreens) => updateSelection(construction.id, { includeScreens })}
                  onBlindsChange={(includeBlinds) => updateSelection(construction.id, { includeBlinds })}
                  onHardwareChange={(includeHardware) => updateSelection(construction.id, { includeHardware })}
                  onNotesChange={(notes) => updateSelection(construction.id, { notes })}
                  disabled={disabled || alreadyInBatch}
                  isDeliverable={deliverability.isDeliverable}
                  deliveryBlockReason={deliverability.reason}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={selectedCount > 0 ? "default" : "secondary"}>
            {selectedCount} selected
          </Badge>
          <Badge variant="outline" className="border-green-500/50 text-green-600">
            {deliverableCount} ready to ship
          </Badge>
          {notDeliverableCount > 0 && (
            <Badge variant="outline" className="border-red-500/50 text-red-600">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {notDeliverableCount} not assembled
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={selectAllDeliverable}
            disabled={disabled}
            className="h-7 text-xs gap-1"
          >
            <CheckSquare className="h-3 w-3" />
            Ready
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={deselectAll}
            disabled={disabled}
            className="h-7 text-xs gap-1"
          >
            <Square className="h-3 w-3" />
            None
          </Button>
        </div>
      </div>

      {renderConstructionGroup(windows, "Windows")}
      {windows.length > 0 && (doors.length > 0 || slidingDoors.length > 0) && <Separator />}
      {renderConstructionGroup(doors, "Doors")}
      {doors.length > 0 && slidingDoors.length > 0 && <Separator />}
      {renderConstructionGroup(slidingDoors, "Sliding Doors")}
    </div>
  );
}
