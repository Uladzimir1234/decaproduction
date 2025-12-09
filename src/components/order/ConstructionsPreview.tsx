import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Square, DoorOpen, PanelLeftOpen } from "lucide-react";
import { ParsedConstruction } from "./FileUploadZone";

interface ConstructionsPreviewProps {
  constructions: ParsedConstruction[];
}

export function ConstructionsPreview({ constructions }: ConstructionsPreviewProps) {
  const typeIcons = {
    window: Square,
    door: DoorOpen,
    sliding_door: PanelLeftOpen,
  };

  const typeLabels = {
    window: 'Window',
    door: 'Door',
    sliding_door: 'Sliding Door',
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium">
          Extracted Constructions ({constructions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[200px]">
          <div className="divide-y">
            {constructions.map((construction, index) => {
              const Icon = typeIcons[construction.construction_type] || Square;
              const dimensions = construction.width_inches && construction.height_inches
                ? `${construction.width_inches.toFixed(1)}×${construction.height_inches.toFixed(1)}"`
                : 'N/A';
              
              return (
                <div key={index} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="font-mono text-xs w-10">
                    C-{construction.construction_number.padStart(3, '0')}
                  </span>
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground text-xs">
                    {typeLabels[construction.construction_type]}
                  </span>
                  <span className="font-medium">{dimensions}</span>
                  {construction.location && (
                    <span className="text-muted-foreground text-xs truncate">
                      {construction.location}
                    </span>
                  )}
                  {construction.quantity > 1 && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      ×{construction.quantity}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
