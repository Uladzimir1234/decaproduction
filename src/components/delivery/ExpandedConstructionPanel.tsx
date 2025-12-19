import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Check, Copy, X } from "lucide-react";
import { UnitCard, type UnitSelection, type UnitComponentState } from "./UnitCard";
import type { ConstructionData } from "./ConstructionChipSelector";

interface OrderData {
  has_nailing_flanges?: boolean | null;
  has_plisse_screens?: boolean | null;
  visible_hinges_count?: number | null;
  hidden_hinges_count?: number | null;
}

interface ShippedUnitInfo {
  unitIndex: number;
  components: string[];
}

interface ExpandedConstructionPanelProps {
  construction: ConstructionData;
  orderData: OrderData;
  unitSelections: UnitSelection[];
  shippedUnits: ShippedUnitInfo[];
  onUnitToggle: (unitIndex: number, selected: boolean) => void;
  onUnitComponentToggle: (unitIndex: number, component: keyof UnitComponentState, value: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onApplyToAll: (sourceUnitIndex: number) => void;
}

export function getApplicableComponents(
  construction: ConstructionData,
  orderData: OrderData
): Record<keyof UnitComponentState, boolean> {
  return {
    screen: !!construction.screen_type && construction.screen_type !== 'none',
    blinds: !!construction.has_blinds,
    handles: !!construction.handle_type && construction.handle_type !== 'none',
    weepingCovers: true,
    hingeCovers: (orderData.visible_hinges_count || 0) > 0 || (orderData.hidden_hinges_count || 0) > 0,
    nailFins: !!orderData.has_nailing_flanges,
    brackets: true,
    plisseScreen: !!orderData.has_plisse_screens,
  };
}

export function getDefaultUnitComponents(
  construction: ConstructionData,
  orderData: OrderData
): UnitComponentState {
  const applicable = getApplicableComponents(construction, orderData);
  return {
    screen: applicable.screen,
    blinds: applicable.blinds,
    handles: applicable.handles,
    weepingCovers: applicable.weepingCovers,
    hingeCovers: applicable.hingeCovers,
    nailFins: applicable.nailFins,
    brackets: applicable.brackets,
    plisseScreen: applicable.plisseScreen,
  };
}

export function createDefaultUnitSelections(
  construction: ConstructionData,
  orderData: OrderData,
  shippedUnits: ShippedUnitInfo[]
): UnitSelection[] {
  const shippedIndexes = new Set(shippedUnits.map(u => u.unitIndex));
  const defaultComponents = getDefaultUnitComponents(construction, orderData);
  
  return Array.from({ length: construction.quantity }, (_, i) => ({
    unitIndex: i + 1,
    selected: !shippedIndexes.has(i + 1),
    components: { ...defaultComponents },
  }));
}

const TYPE_LABELS: Record<string, string> = {
  window: 'Window',
  door: 'Door',
  sliding_door: 'Sliding Door',
};

export function ExpandedConstructionPanel({
  construction,
  orderData,
  unitSelections,
  shippedUnits,
  onUnitToggle,
  onUnitComponentToggle,
  onSelectAll,
  onDeselectAll,
  onApplyToAll,
}: ExpandedConstructionPanelProps) {
  const applicableComponents = getApplicableComponents(construction, orderData);
  const shippedIndexes = new Set(shippedUnits.map(u => u.unitIndex));
  
  const selectedCount = unitSelections.filter(u => u.selected && !shippedIndexes.has(u.unitIndex)).length;
  const availableCount = construction.quantity - shippedUnits.length;
  const allSelected = selectedCount === availableCount && availableCount > 0;
  const noneSelected = selectedCount === 0;

  // Find first selected unit for "Apply to All"
  const firstSelectedUnit = unitSelections.find(u => u.selected && !shippedIndexes.has(u.unitIndex));

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-muted/30 border-b">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">#{construction.construction_number}</span>
          <Badge variant="secondary" className="text-xs">
            {TYPE_LABELS[construction.construction_type] || construction.construction_type}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {construction.quantity} unit{construction.quantity > 1 ? 's' : ''}
          </span>
          {shippedUnits.length > 0 && (
            <Badge variant="outline" className="text-[10px] text-success border-success/50">
              {shippedUnits.length} shipped
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Badge variant={selectedCount > 0 ? "default" : "secondary"} className="text-xs">
            {selectedCount} selected
          </Badge>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onSelectAll}
            disabled={allSelected}
          >
            <Check className="h-3 w-3 mr-1" />
            All
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onDeselectAll}
            disabled={noneSelected}
          >
            <X className="h-3 w-3 mr-1" />
            None
          </Button>
          
          {firstSelectedUnit && selectedCount > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onApplyToAll(firstSelectedUnit.unitIndex)}
              title={`Copy components from unit ${firstSelectedUnit.unitIndex} to all selected`}
            >
              <Copy className="h-3 w-3 mr-1" />
              Apply
            </Button>
          )}
        </div>
      </div>

      {/* Unit cards */}
      <div className="p-2 space-y-1 max-h-[200px] overflow-y-auto">
        {unitSelections.map(unit => (
          <UnitCard
            key={unit.unitIndex}
            unitIndex={unit.unitIndex}
            totalUnits={construction.quantity}
            selection={unit}
            applicableComponents={applicableComponents}
            isShipped={shippedIndexes.has(unit.unitIndex)}
            onToggleUnit={(selected) => onUnitToggle(unit.unitIndex, selected)}
            onToggleComponent={(comp, val) => onUnitComponentToggle(unit.unitIndex, comp, val)}
          />
        ))}
      </div>
    </div>
  );
}
