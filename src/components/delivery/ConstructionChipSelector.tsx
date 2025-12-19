import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface ConstructionData {
  id: string;
  construction_number: string;
  construction_type: string;
  quantity: number;
  screen_type: string | null;
  has_blinds: boolean | null;
  handle_type: string | null;
  glass_type: string | null;
}

interface ConstructionChipSelectorProps {
  constructions: ConstructionData[];
  selectedIds: Set<string>;
  shippedQuantities: Record<string, number>;
  onToggle: (constructionId: string) => void;
}

export function ConstructionChipSelector({
  constructions,
  selectedIds,
  shippedQuantities,
  onToggle,
}: ConstructionChipSelectorProps) {
  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'window': return 'W';
      case 'door': return 'D';
      case 'sliding_door': return 'S';
      default: return type.charAt(0).toUpperCase();
    }
  };

  const getTypeBadgeColor = (type: string): string => {
    switch (type) {
      case 'window': return 'bg-blue-500/20 text-blue-600 dark:text-blue-400';
      case 'door': return 'bg-purple-500/20 text-purple-600 dark:text-purple-400';
      case 'sliding_door': return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Click to select constructions for this delivery batch
      </p>
      <div className="flex flex-wrap gap-2">
        {constructions.map((construction) => {
          const shipped = shippedQuantities[construction.id] || 0;
          const remaining = construction.quantity - shipped;
          const isFullyShipped = remaining <= 0;
          const isSelected = selectedIds.has(construction.id);

          return (
            <button
              key={construction.id}
              type="button"
              disabled={isFullyShipped}
              onClick={() => !isFullyShipped && onToggle(construction.id)}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                isFullyShipped && "opacity-50 cursor-not-allowed bg-muted/50",
                !isFullyShipped && !isSelected && "border-border hover:border-primary/50 hover:bg-muted/30",
                !isFullyShipped && isSelected && "border-primary bg-primary/10 shadow-sm"
              )}
            >
              {/* Selection indicator */}
              {isSelected && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 text-primary-foreground" />
                </span>
              )}
              
              {/* Construction number */}
              <span className={cn(
                "font-semibold text-sm",
                isSelected ? "text-primary" : "text-foreground"
              )}>
                #{construction.construction_number}
              </span>
              
              {/* Type badge */}
              <Badge 
                variant="secondary" 
                className={cn("text-[10px] px-1.5 py-0", getTypeBadgeColor(construction.construction_type))}
              >
                {getTypeLabel(construction.construction_type)}
              </Badge>
              
              {/* Quantity */}
              {construction.quantity > 1 && (
                <span className="text-xs text-muted-foreground">
                  ×{remaining}{shipped > 0 ? ` of ${construction.quantity}` : ''}
                </span>
              )}
              
              {/* Fully shipped indicator */}
              {isFullyShipped && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 text-success border-success/50">
                  ✓
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
