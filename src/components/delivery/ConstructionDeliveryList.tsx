import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ConstructionDeliveryItem } from "./ConstructionDeliveryItem";
import { CheckSquare, Square } from "lucide-react";

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

interface ManufacturingStatus {
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
  existingBatchConstructionIds?: string[]; // IDs of constructions already in other batches
}

export function ConstructionDeliveryList({
  orderId,
  selections,
  onSelectionsChange,
  disabled = false,
  existingBatchConstructionIds = [],
}: ConstructionDeliveryListProps) {
  const [constructions, setConstructions] = useState<Construction[]>([]);
  const [manufacturingStatuses, setManufacturingStatuses] = useState<ManufacturingStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const [constructionsRes, manufacturingRes] = await Promise.all([
        supabase
          .from("order_constructions")
          .select("*")
          .eq("order_id", orderId)
          .order("position_index", { ascending: true }),
        supabase
          .from("construction_manufacturing")
          .select("construction_id, stage, status")
          .in("stage", ["glass_installation", "frames_sashes_assembled"])
      ]);

      if (constructionsRes.data) {
        setConstructions(constructionsRes.data);
        
        // Initialize selections for new constructions if not already set
        if (selections.length === 0) {
          const initialSelections: ConstructionSelection[] = constructionsRes.data.map(c => ({
            constructionId: c.id,
            selected: !existingBatchConstructionIds.includes(c.id), // Pre-select if not in another batch
            includeGlass: true,
            includeScreens: !!c.screen_type,
            includeBlinds: !!c.has_blinds,
            includeHardware: !!c.handle_type,
            notes: "",
          }));
          onSelectionsChange(initialSelections);
        }
      }

      if (manufacturingRes.data) {
        setManufacturingStatuses(manufacturingRes.data);
      }

      setLoading(false);
    };

    fetchData();
  }, [orderId]);

  const getManufacturingStatus = (constructionId: string) => {
    const statuses = manufacturingStatuses.filter(s => s.construction_id === constructionId);
    return {
      glass_installation: statuses.find(s => s.stage === 'glass_installation')?.status,
      frames_sashes_assembled: statuses.find(s => s.stage === 'frames_sashes_assembled')?.status,
    };
  };

  const updateSelection = (constructionId: string, updates: Partial<ConstructionSelection>) => {
    const newSelections = selections.map(s => 
      s.constructionId === constructionId ? { ...s, ...updates } : s
    );
    onSelectionsChange(newSelections);
  };

  const selectAll = () => {
    const newSelections = selections.map(s => ({ ...s, selected: true }));
    onSelectionsChange(newSelections);
  };

  const deselectAll = () => {
    const newSelections = selections.map(s => ({ ...s, selected: false }));
    onSelectionsChange(newSelections);
  };

  const selectedCount = selections.filter(s => s.selected).length;
  const totalCount = constructions.length;

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
    
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
        </div>
        <div className="space-y-2">
          {items.map(construction => {
            const selection = selections.find(s => s.constructionId === construction.id);
            if (!selection) return null;
            
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
                  manufacturingStatus={getManufacturingStatus(construction.id)}
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
                  disabled={disabled}
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={selectedCount === totalCount ? "default" : "secondary"}>
            {selectedCount}/{totalCount} selected
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={selectAll}
            disabled={disabled}
            className="h-7 text-xs gap-1"
          >
            <CheckSquare className="h-3 w-3" />
            All
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
