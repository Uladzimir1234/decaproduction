import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react";

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
}

interface ManufacturingStatus {
  glass_installation?: string;
  frames_sashes_assembled?: string;
}

interface ConstructionDeliveryItemProps {
  construction: Construction;
  manufacturingStatus?: ManufacturingStatus;
  selected: boolean;
  includeGlass: boolean;
  includeScreens: boolean;
  includeBlinds: boolean;
  includeHardware: boolean;
  notes: string;
  onSelectedChange: (selected: boolean) => void;
  onGlassChange: (include: boolean) => void;
  onScreensChange: (include: boolean) => void;
  onBlindsChange: (include: boolean) => void;
  onHardwareChange: (include: boolean) => void;
  onNotesChange: (notes: string) => void;
  disabled?: boolean;
}

export function ConstructionDeliveryItem({
  construction,
  manufacturingStatus,
  selected,
  includeGlass,
  includeScreens,
  includeBlinds,
  includeHardware,
  notes,
  onSelectedChange,
  onGlassChange,
  onScreensChange,
  onBlindsChange,
  onHardwareChange,
  onNotesChange,
  disabled = false,
}: ConstructionDeliveryItemProps) {
  const [showNotes, setShowNotes] = useState(!!notes);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'window': return 'W';
      case 'door': return 'D';
      case 'sliding_door': return 'S';
      default: return type.charAt(0).toUpperCase();
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'window': return 'Window';
      case 'door': return 'Door';
      case 'sliding_door': return 'Sliding Door';
      default: return type;
    }
  };

  const formatDimensions = () => {
    if (construction.width_inches && construction.height_inches) {
      return `${construction.width_inches}" × ${construction.height_inches}"`;
    }
    if (construction.width_mm && construction.height_mm) {
      return `${construction.width_mm}mm × ${construction.height_mm}mm`;
    }
    return null;
  };

  const getStatusColor = () => {
    if (manufacturingStatus?.glass_installation === 'complete') return 'bg-blue-500';
    if (manufacturingStatus?.frames_sashes_assembled === 'complete') return 'bg-green-500';
    return 'bg-amber-500';
  };

  const getStatusLabel = () => {
    if (manufacturingStatus?.glass_installation === 'complete') return 'Glass Installed';
    if (manufacturingStatus?.frames_sashes_assembled === 'complete') return 'Assembled';
    return 'In Progress';
  };

  const hasScreens = !!construction.screen_type;
  const hasBlinds = construction.has_blinds;
  const hasHardware = !!construction.handle_type;
  const dimensions = formatDimensions();
  const colors = construction.color_exterior && construction.color_interior 
    ? `${construction.color_exterior}/${construction.color_interior}` 
    : construction.color_exterior || construction.color_interior;

  return (
    <div className={`border rounded-lg p-3 transition-all ${
      selected 
        ? 'border-primary/50 bg-primary/5' 
        : 'border-border bg-muted/30 opacity-60'
    }`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelectedChange(checked as boolean)}
          disabled={disabled}
          className="mt-1"
        />
        
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header row */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm">#{construction.construction_number}</span>
              <Badge variant="secondary" className="text-xs">
                {getTypeLabel(construction.construction_type)}
              </Badge>
              {construction.quantity > 1 && (
                <Badge variant="outline" className="text-xs">×{construction.quantity}</Badge>
              )}
            </div>
            
            <div className={`h-2 w-2 rounded-full ${getStatusColor()}`} title={getStatusLabel()} />
            
            {dimensions && (
              <span className="text-xs text-muted-foreground">{dimensions}</span>
            )}
            {colors && (
              <span className="text-xs text-muted-foreground">{colors}</span>
            )}
          </div>

          {/* Accessory toggles */}
          {selected && (
            <div className="flex flex-wrap gap-3 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  checked={includeGlass}
                  onCheckedChange={(checked) => onGlassChange(checked as boolean)}
                  disabled={disabled}
                  className="h-3.5 w-3.5"
                />
                <span className={includeGlass ? 'text-foreground' : 'text-muted-foreground'}>Glass</span>
              </label>
              
              {hasScreens && (
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={includeScreens}
                    onCheckedChange={(checked) => onScreensChange(checked as boolean)}
                    disabled={disabled}
                    className="h-3.5 w-3.5"
                  />
                  <span className={includeScreens ? 'text-foreground' : 'text-muted-foreground'}>Screens</span>
                </label>
              )}
              
              {hasBlinds && (
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={includeBlinds}
                    onCheckedChange={(checked) => onBlindsChange(checked as boolean)}
                    disabled={disabled}
                    className="h-3.5 w-3.5"
                  />
                  <span className={includeBlinds ? 'text-foreground' : 'text-muted-foreground'}>Blinds</span>
                </label>
              )}
              
              {hasHardware && (
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={includeHardware}
                    onCheckedChange={(checked) => onHardwareChange(checked as boolean)}
                    disabled={disabled}
                    className="h-3.5 w-3.5"
                  />
                  <span className={includeHardware ? 'text-foreground' : 'text-muted-foreground'}>Hardware</span>
                </label>
              )}

              <button
                type="button"
                onClick={() => setShowNotes(!showNotes)}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <MessageSquare className="h-3 w-3" />
                <span>Note</span>
                {notes && <span className="text-primary">•</span>}
              </button>
            </div>
          )}

          {/* Notes input */}
          {selected && showNotes && (
            <Textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Delivery notes for this item..."
              className="text-xs h-16 resize-none"
              disabled={disabled}
            />
          )}
        </div>
      </div>
    </div>
  );
}
