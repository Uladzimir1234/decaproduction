import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface UnitComponentState {
  screen: boolean;
  blinds: boolean;
  handles: boolean;
  weepingCovers: boolean;
  hingeCovers: boolean;
  nailFins: boolean;
  brackets: boolean;
  plisseScreen: boolean;
}

export interface UnitSelection {
  unitIndex: number;
  selected: boolean;
  components: UnitComponentState;
}

interface ApplicableComponents {
  screen: boolean;
  blinds: boolean;
  handles: boolean;
  weepingCovers: boolean;
  hingeCovers: boolean;
  nailFins: boolean;
  brackets: boolean;
  plisseScreen: boolean;
}

interface UnitCardProps {
  unitIndex: number;
  totalUnits: number;
  selection: UnitSelection;
  applicableComponents: ApplicableComponents;
  isShipped: boolean;
  onToggleUnit: (selected: boolean) => void;
  onToggleComponent: (component: keyof UnitComponentState, value: boolean) => void;
}

const COMPONENT_LABELS: Record<keyof UnitComponentState, string> = {
  screen: 'Screen',
  blinds: 'Blinds',
  handles: 'Handles',
  weepingCovers: 'Weeping',
  hingeCovers: 'Hinges',
  nailFins: 'Nail Fins',
  brackets: 'Brackets',
  plisseScreen: 'Plissé',
};

export function UnitCard({
  unitIndex,
  totalUnits,
  selection,
  applicableComponents,
  isShipped,
  onToggleUnit,
  onToggleComponent,
}: UnitCardProps) {
  const applicableKeys = (Object.keys(applicableComponents) as (keyof UnitComponentState)[])
    .filter(key => applicableComponents[key]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg border transition-all",
        isShipped && "opacity-50 bg-muted/30 cursor-not-allowed",
        !isShipped && selection.selected && "border-primary/50 bg-primary/5",
        !isShipped && !selection.selected && "border-border bg-background hover:border-muted-foreground/30"
      )}
    >
      {/* Unit selection checkbox */}
      <Checkbox
        checked={selection.selected}
        onCheckedChange={(checked) => !isShipped && onToggleUnit(checked as boolean)}
        disabled={isShipped}
        className="h-4 w-4"
      />
      
      {/* Unit label */}
      <div className="flex items-center gap-1.5 min-w-[60px]">
        <span className={cn(
          "text-xs font-medium",
          selection.selected ? "text-primary" : "text-muted-foreground"
        )}>
          {unitIndex}/{totalUnits}
        </span>
        {isShipped && (
          <Badge variant="outline" className="text-[9px] px-1 py-0 text-success border-success/50">
            Shipped
          </Badge>
        )}
      </div>

      {/* Component toggles */}
      {selection.selected && !isShipped && (
        <div className="flex flex-wrap gap-1 flex-1">
          {applicableKeys.map(key => (
            <button
              key={key}
              type="button"
              onClick={() => onToggleComponent(key, !selection.components[key])}
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                selection.components[key]
                  ? "bg-primary/20 border-primary/40 text-primary font-medium"
                  : "bg-muted/50 border-border text-muted-foreground hover:border-muted-foreground/50"
              )}
            >
              {COMPONENT_LABELS[key]}
            </button>
          ))}
        </div>
      )}

      {/* Placeholder when not selected */}
      {!selection.selected && !isShipped && (
        <span className="text-[10px] text-muted-foreground italic">
          Not in this batch
        </span>
      )}
    </div>
  );
}
