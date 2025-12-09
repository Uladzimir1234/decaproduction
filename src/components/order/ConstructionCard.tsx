import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Square, DoorOpen, PanelLeftOpen, MessageSquare, Check } from "lucide-react";

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
  
  const typeLabels = {
    window: 'Window',
    door: 'Door',
    sliding_door: 'Sliding Door',
  };

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
        p-3 cursor-pointer transition-all hover:shadow-md
        ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}
        ${construction.is_delivered ? 'opacity-60' : ''}
      `}
    >
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm">
              C-{construction.construction_number.padStart(3, '0')}
            </span>
            {construction.is_delivered && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                <Check className="h-3 w-3 mr-0.5" />
                Delivered
              </Badge>
            )}
          </div>
          {construction.quantity > 1 && (
            <Badge variant="outline" className="text-xs">
              ×{construction.quantity}
            </Badge>
          )}
        </div>

        {/* Type and icon */}
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {typeLabels[construction.construction_type]}
          </span>
        </div>

        {/* Dimensions */}
        <div className="text-sm font-medium">{dimensions}</div>

        {/* Location */}
        {construction.location && (
          <div className="text-xs text-muted-foreground truncate">
            {construction.location}
          </div>
        )}

        {/* Progress dots */}
        <div className="flex items-center gap-1">
          <TooltipProvider>
            {MANUFACTURING_STAGES.map((stage, index) => {
              const status = manufacturingMap.get(stage) || 'not_started';
              const stageLabels: Record<string, string> = {
                frame_cutting: 'Frame Cutting',
                welding: 'Welding',
                assembly: 'Assembly',
                glass_installation: 'Glass Installation',
              };
              
              return (
                <Tooltip key={stage}>
                  <TooltipTrigger asChild>
                    <div
                      className={`h-2 w-2 rounded-full ${
                        status === 'complete'
                          ? 'bg-green-500'
                          : status === 'partial'
                          ? 'bg-amber-500'
                          : 'bg-muted'
                      }`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">{stageLabels[stage]}: {status.replace('_', ' ')}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
          <span className="text-xs text-muted-foreground ml-1">{progressPercent}%</span>
        </div>

        {/* Notes indicator */}
        {(construction.notes_count || 0) > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            <span>{construction.notes_count} notes</span>
          </div>
        )}
      </div>
    </Card>
  );
}
