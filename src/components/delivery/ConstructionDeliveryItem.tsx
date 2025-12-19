import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, MessageSquare, AlertTriangle } from "lucide-react";

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

export interface ManufacturingStatus {
  welding?: string;
  frames_sashes_assembled?: string;
  doors_assembly?: string;
  sliding_doors_assembly?: string;
  glass_installation?: string;
}

interface ConstructionDeliveryItemProps {
  construction: Construction;
  manufacturingStatus?: ManufacturingStatus;
  selected: boolean;
  shipQuantity: number;
  maxQuantity: number;
  includeGlass: boolean;
  includeScreens: boolean;
  includeBlinds: boolean;
  includeHardware: boolean;
  notes: string;
  onSelectedChange: (selected: boolean) => void;
  onQuantityChange: (quantity: number) => void;
  onGlassChange: (include: boolean) => void;
  onScreensChange: (include: boolean) => void;
  onBlindsChange: (include: boolean) => void;
  onHardwareChange: (include: boolean) => void;
  onNotesChange: (notes: string) => void;
  disabled?: boolean;
  isDeliverable: boolean;
  deliveryBlockReason?: string;
}

export function ConstructionDeliveryItem({
  construction,
  manufacturingStatus,
  selected,
  shipQuantity,
  maxQuantity,
  includeGlass,
  includeScreens,
  includeBlinds,
  includeHardware,
  notes,
  onSelectedChange,
  onQuantityChange,
  onGlassChange,
  onScreensChange,
  onBlindsChange,
  onHardwareChange,
  onNotesChange,
  disabled = false,
  isDeliverable,
  deliveryBlockReason,
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

  const formatDimensions = () => {
    if (construction.width_inches && construction.height_inches) {
      return `${construction.width_inches}" × ${construction.height_inches}"`;
    }
    if (construction.width_mm && construction.height_mm) {
      return `${construction.width_mm}mm × ${construction.height_mm}mm`;
    }
    return null;
  };

  // Full status determination based on manufacturing stages
  const getFullStatus = () => {
    const type = construction.construction_type;
    
    // Check glass installation first (highest priority)
    if (manufacturingStatus?.glass_installation === 'complete') {
      return { color: 'bg-blue-500', label: 'Glass Installed', level: 4 };
    }
    
    // Check assembly based on type
    if (type === 'door' && manufacturingStatus?.doors_assembly === 'complete') {
      return { color: 'bg-green-500', label: 'Assembled', level: 3 };
    }
    if (type === 'sliding_door' && manufacturingStatus?.sliding_doors_assembly === 'complete') {
      return { color: 'bg-green-500', label: 'Assembled', level: 3 };
    }
    if (type === 'window' && manufacturingStatus?.frames_sashes_assembled === 'complete') {
      return { color: 'bg-green-500', label: 'Assembled', level: 3 };
    }
    
    // Check welding
    if (manufacturingStatus?.welding === 'complete') {
      return { color: 'bg-amber-500', label: 'Welded', level: 2 };
    }
    
    // Not started
    return { color: 'bg-red-500', label: 'Not Assembled', level: 1 };
  };

  const status = getFullStatus();
  const hasScreens = !!construction.screen_type;
  const hasBlinds = construction.has_blinds;
  const hasHardware = !!construction.handle_type;
  const dimensions = formatDimensions();
  const colors = construction.color_exterior && construction.color_interior 
    ? `${construction.color_exterior}/${construction.color_interior}` 
    : construction.color_exterior || construction.color_interior;

  const isGlassInstalled = manufacturingStatus?.glass_installation === 'complete';
  const actuallyDisabled = disabled || !isDeliverable;

  return (
    <div className={`border rounded-lg p-3 transition-all ${
      !isDeliverable
        ? 'border-destructive/30 bg-destructive/5 opacity-60'
        : selected 
          ? 'border-primary/50 bg-primary/5' 
          : 'border-border bg-muted/30 opacity-60'
    }`}>
      <div className="flex items-start gap-3">
        {isDeliverable ? (
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelectedChange(checked as boolean)}
            disabled={disabled}
            className="mt-1"
          />
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mt-1 h-4 w-4 flex items-center justify-center text-destructive">
                <Lock className="h-3.5 w-3.5" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="text-xs">{deliveryBlockReason || "Not ready for delivery"}</p>
            </TooltipContent>
          </Tooltip>
        )}
        
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
            
            {/* Manufacturing Status Badge */}
            <Badge 
              variant="outline" 
              className={`text-[10px] px-1.5 py-0 h-5 ${
                status.level >= 3 
                  ? 'border-green-500/50 text-green-600 bg-green-500/10' 
                  : status.level === 2 
                    ? 'border-amber-500/50 text-amber-600 bg-amber-500/10'
                    : 'border-red-500/50 text-red-600 bg-red-500/10'
              }`}
            >
              <div className={`h-1.5 w-1.5 rounded-full mr-1 ${status.color}`} />
              {status.label}
            </Badge>
            
            {dimensions && (
              <span className="text-xs text-muted-foreground">{dimensions}</span>
            )}
            {colors && (
              <span className="text-xs text-muted-foreground">{colors}</span>
            )}
          </div>

          {/* Warning for non-deliverable items */}
          {!isDeliverable && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="h-3 w-3" />
              <span>{deliveryBlockReason || "Cannot ship - not assembled"}</span>
            </div>
          )}

          {/* Quantity input - show when construction has multiple units and is selected */}
          {isDeliverable && selected && maxQuantity > 0 && (
            <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-2 py-1.5">
              <span className="text-muted-foreground">Shipping:</span>
              <Input
                type="number"
                min={1}
                max={maxQuantity}
                value={shipQuantity}
                onChange={(e) => {
                  const val = Math.min(Math.max(1, parseInt(e.target.value) || 1), maxQuantity);
                  onQuantityChange(val);
                }}
                className="w-14 h-6 text-xs text-center px-1"
                disabled={disabled}
              />
              <span className="text-muted-foreground">of {maxQuantity} remaining</span>
              {construction.quantity > maxQuantity && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-green-500/50 text-green-600">
                  {construction.quantity - maxQuantity} already shipped
                </Badge>
              )}
            </div>
          )}

          {/* Accessory toggles - only show if deliverable and selected */}
          {isDeliverable && selected && (
            <div className="flex flex-wrap gap-3 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  checked={includeGlass}
                  onCheckedChange={(checked) => onGlassChange(checked as boolean)}
                  disabled={disabled}
                  className="h-3.5 w-3.5"
                />
                <span className={includeGlass ? 'text-foreground' : 'text-muted-foreground'}>
                  Glass
                </span>
                {!isGlassInstalled && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-500/50 text-amber-600">
                    Not installed
                  </Badge>
                )}
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
          {isDeliverable && selected && showNotes && (
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
