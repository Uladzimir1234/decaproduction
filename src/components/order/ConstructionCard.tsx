import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Square, DoorOpen, PanelLeftOpen, Check } from "lucide-react";

interface ConstructionManufacturing {
  stage: string;
  status: string;
}

interface Construction {
  id: string;
  construction_number: string;
  construction_type: string;
  width_inches: number | null;
  height_inches: number | null;
  location: string | null;
  opening_type: string | null;
  quantity: number;
  manufacturing?: ConstructionManufacturing[];
  notes_count?: number;
  is_delivered?: boolean;
}

interface ConstructionCardProps {
  construction: Construction;
  onClick: () => void;
  isSelected?: boolean;
}

const MANUFACTURING_STAGES = ['frame_cutting', 'welding', 'assembly', 'glass_installation'];

export function ConstructionCard({ construction, onClick, isSelected }: ConstructionCardProps) {
  const typeIcons = {
    window: Square,
    door: DoorOpen,
    sliding_door: PanelLeftOpen,
  };
  
  const Icon = typeIcons[construction.construction_type] || Square;

  // Calculate manufacturing progress
  const manufacturingMap = new Map(
    construction.manufacturing?.map(m => [m.stage, m.status]) || []
  );
  
  const completedStages = MANUFACTURING_STAGES.filter(
    stage => manufacturingMap.get(stage) === 'complete'
  ).length;
  
  const progressPercent = Math.round((completedStages / MANUFACTURING_STAGES.length) * 100);

  // Format dimensions
  const dimensions = construction.width_inches && construction.height_inches
    ? `${construction.width_inches.toFixed(1)}×${construction.height_inches.toFixed(1)}"`
    : 'N/A';

  return (
    <Card
      onClick={onClick}
      className={`
        p-2 cursor-pointer transition-all hover:shadow-md
        ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}
        ${construction.is_delivered ? 'opacity-60' : ''}
      `}
    >
      <div className="space-y-1">
        {/* Header with number and quantity */}
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-xs">
            C-{construction.construction_number.padStart(3, '0')}
          </span>
          {construction.quantity > 1 && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
              ×{construction.quantity}
            </Badge>
          )}
        </div>

        {/* Type icon and label */}
        <div className="flex items-center gap-1">
          <Icon className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            {construction.construction_type === 'window' ? 'Window' : 
             construction.construction_type === 'door' ? 'Door' : 'Sliding'}
          </span>
        </div>

        {/* Dimensions */}
        <div className="text-xs font-medium">{dimensions}</div>

        {/* Location - truncated */}
        {construction.location && (
          <div className="text-[10px] text-muted-foreground truncate">
            {construction.location}
          </div>
        )}

        {/* Progress dots and percentage */}
        <div className="flex items-center gap-0.5">
          <TooltipProvider>
            {MANUFACTURING_STAGES.map((stage) => {
              const status = manufacturingMap.get(stage) || 'not_started';
              return (
                <Tooltip key={stage}>
                  <TooltipTrigger asChild>
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        status === 'complete'
                          ? 'bg-green-500'
                          : status === 'partial'
                          ? 'bg-amber-500'
                          : 'bg-muted'
                      }`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">{stage.replace('_', ' ')}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
          <span className="text-[10px] text-muted-foreground ml-0.5">{progressPercent}%</span>
          {construction.is_delivered && (
            <Check className="h-3 w-3 text-green-500 ml-auto" />
          )}
        </div>
      </div>
    </Card>
  );
}
