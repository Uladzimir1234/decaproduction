import { useState } from "react";
import { ChevronDown, ChevronRight, Sparkles, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ParsedConstruction, ParsedComponent } from "./FileUploadZone";

interface ConstructionReviewPanelProps {
  constructions: ParsedConstruction[];
  onConstructionChange: (index: number, updates: Partial<ParsedConstruction>) => void;
}

const CONSTRUCTION_TYPE_LABELS: Record<string, string> = {
  window: "Window",
  door: "Door",
  sliding_door: "Sliding Door",
};

const CONSTRUCTION_TYPE_COLORS: Record<string, string> = {
  window: "bg-blue-500/10 text-blue-600 border-blue-200",
  door: "bg-orange-500/10 text-orange-600 border-orange-200",
  sliding_door: "bg-purple-500/10 text-purple-600 border-purple-200",
};

const OPENING_TYPES = [
  "Tilt-Turn",
  "Fixed",
  "Casement",
  "Awning",
  "Hopper",
  "Pivot",
  "Sliding",
];

const SCREEN_TYPES = [
  { value: "flex", label: "Flex Screen" },
  { value: "deca", label: "Deca Aluminum Screen" },
  { value: "retractable", label: "Retractable Screen" },
  { value: "plisse", label: "Plisse Screen" },
];

function DetectedBadge({ detected }: { detected: boolean }) {
  if (!detected) return null;
  return (
    <Badge variant="secondary" className="ml-2 text-xs gap-1 shrink-0">
      <Sparkles className="h-3 w-3" />
      AI Detected
    </Badge>
  );
}

function FieldRow({ 
  label, 
  value, 
  detected, 
  onEdit,
  type = "text",
  placeholder,
  options,
}: { 
  label: string; 
  value: string | number | null | undefined; 
  detected: boolean;
  onEdit: (value: string) => void;
  type?: "text" | "number" | "select";
  placeholder?: string;
  options?: { value: string; label: string }[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const displayValue = value !== null && value !== undefined && value !== "" 
    ? String(value) 
    : null;

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 py-1">
        <span className="text-sm text-muted-foreground w-32 shrink-0">{label}:</span>
        {type === "select" && options ? (
          <Select 
            value={displayValue || ""} 
            onValueChange={(v) => {
              onEdit(v);
              setIsEditing(false);
            }}
          >
            <SelectTrigger className="h-8 text-sm flex-1">
              <SelectValue placeholder={placeholder || "Select..."} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {options.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            autoFocus
            type={type}
            value={displayValue || ""}
            onChange={(e) => onEdit(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
            className="h-8 text-sm flex-1"
            placeholder={placeholder}
          />
        )}
      </div>
    );
  }

  return (
    <div 
      className="flex items-center gap-2 py-1 group cursor-pointer hover:bg-muted/50 px-2 -mx-2 rounded"
      onClick={() => setIsEditing(true)}
    >
      <span className="text-sm text-muted-foreground w-32 shrink-0">{label}:</span>
      <span className={`text-sm flex-1 ${!displayValue ? 'text-muted-foreground/50 italic' : ''}`}>
        {displayValue || "Not detected"}
      </span>
      <DetectedBadge detected={detected && !!displayValue} />
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

function ComponentsList({ components }: { components: ParsedComponent[] }) {
  if (!components || components.length === 0) {
    return (
      <p className="text-sm text-muted-foreground/50 italic">No components detected</p>
    );
  }

  return (
    <div className="space-y-1">
      {components.map((comp, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <Badge variant="outline" className="text-xs shrink-0">
            x{comp.quantity}
          </Badge>
          <span className="font-medium">{comp.component_type}</span>
          {comp.component_name && (
            <span className="text-muted-foreground truncate">({comp.component_name})</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ConstructionCard({
  construction,
  index,
  onChange,
}: {
  construction: ParsedConstruction;
  index: number;
  onChange: (updates: Partial<ParsedConstruction>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const typeBadgeClass = CONSTRUCTION_TYPE_COLORS[construction.construction_type] || 
    "bg-muted text-muted-foreground";

  const dimensionText = construction.width_inches && construction.height_inches
    ? `${construction.width_inches}" × ${construction.height_inches}"`
    : construction.width_mm && construction.height_mm
    ? `${construction.width_mm}mm × ${construction.height_mm}mm`
    : "Dimensions not set";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-medium">#{construction.construction_number}</span>
            <Badge className={`${typeBadgeClass} border`}>
              {CONSTRUCTION_TYPE_LABELS[construction.construction_type] || construction.construction_type}
            </Badge>
            {construction.quantity > 1 && (
              <Badge variant="secondary">×{construction.quantity}</Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground shrink-0">
            {dimensionText}
          </span>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="mt-2 ml-7 p-4 border rounded-lg bg-muted/30 space-y-4">
          {/* Dimensions Section */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Dimensions</h4>
            <div className="grid grid-cols-2 gap-x-4">
              <FieldRow
                label="Width (inches)"
                value={construction.width_inches}
                detected={construction.width_inches !== null}
                onEdit={(v) => onChange({ width_inches: parseFloat(v) || null })}
                type="number"
              />
              <FieldRow
                label="Height (inches)"
                value={construction.height_inches}
                detected={construction.height_inches !== null}
                onEdit={(v) => onChange({ height_inches: parseFloat(v) || null })}
                type="number"
              />
              <FieldRow
                label="Width (mm)"
                value={construction.width_mm}
                detected={construction.width_mm !== null}
                onEdit={(v) => onChange({ width_mm: parseFloat(v) || null })}
                type="number"
              />
              <FieldRow
                label="Height (mm)"
                value={construction.height_mm}
                detected={construction.height_mm !== null}
                onEdit={(v) => onChange({ height_mm: parseFloat(v) || null })}
                type="number"
              />
              <FieldRow
                label="Rough Opening"
                value={construction.rough_opening}
                detected={!!construction.rough_opening}
                onEdit={(v) => onChange({ rough_opening: v || null })}
              />
              <FieldRow
                label="Quantity"
                value={construction.quantity}
                detected={construction.quantity > 0}
                onEdit={(v) => onChange({ quantity: parseInt(v) || 1 })}
                type="number"
              />
            </div>
          </div>

          {/* Colors Section */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Colors & Profile</h4>
            <div className="grid grid-cols-2 gap-x-4">
              <FieldRow
                label="Exterior Color"
                value={construction.color_exterior}
                detected={!!construction.color_exterior}
                onEdit={(v) => onChange({ color_exterior: v || null })}
                placeholder="e.g., White, RAL 7016"
              />
              <FieldRow
                label="Interior Color"
                value={construction.color_interior}
                detected={!!construction.color_interior}
                onEdit={(v) => onChange({ color_interior: v || null })}
                placeholder="e.g., White, Oak"
              />
              <FieldRow
                label="Model/Profile"
                value={construction.model}
                detected={!!construction.model}
                onEdit={(v) => onChange({ model: v || null })}
              />
              <FieldRow
                label="Opening Type"
                value={construction.opening_type}
                detected={!!construction.opening_type}
                onEdit={(v) => onChange({ opening_type: v || null })}
                type="select"
                options={OPENING_TYPES.map(t => ({ value: t, label: t }))}
              />
            </div>
          </div>

          {/* Glass & Screens */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Glass & Screens</h4>
            <div className="grid grid-cols-2 gap-x-4">
              <FieldRow
                label="Glass Type"
                value={construction.glass_type}
                detected={!!construction.glass_type}
                onEdit={(v) => onChange({ glass_type: v || null })}
                placeholder="e.g., Triple Low-E Argon"
              />
              <FieldRow
                label="Screen Type"
                value={construction.screen_type}
                detected={!!construction.screen_type}
                onEdit={(v) => onChange({ screen_type: v || null })}
                type="select"
                options={SCREEN_TYPES}
              />
            </div>
          </div>

          {/* Hardware & Blinds */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Hardware & Blinds</h4>
            <div className="grid grid-cols-2 gap-x-4">
              <FieldRow
                label="Handle Type"
                value={construction.handle_type}
                detected={!!construction.handle_type}
                onEdit={(v) => onChange({ handle_type: v || null })}
              />
              <div className="flex items-center gap-2 py-1 col-span-2">
                <span className="text-sm text-muted-foreground w-32 shrink-0">Has Blinds:</span>
                <Switch
                  checked={construction.has_blinds}
                  onCheckedChange={(checked) => onChange({ has_blinds: checked })}
                />
                <DetectedBadge detected={construction.has_blinds} />
              </div>
              {construction.has_blinds && (
                <FieldRow
                  label="Blinds Color"
                  value={construction.blinds_color}
                  detected={!!construction.blinds_color}
                  onEdit={(v) => onChange({ blinds_color: v || null })}
                  placeholder="e.g., White, Cream"
                />
              )}
              <div className="flex items-center gap-2 py-1 col-span-2">
                <span className="text-sm text-muted-foreground w-32 shrink-0">Center Seal:</span>
                <Switch
                  checked={construction.center_seal}
                  onCheckedChange={(checked) => onChange({ center_seal: checked })}
                />
                <DetectedBadge detected={construction.center_seal} />
              </div>
            </div>
          </div>

          {/* Location & Notes */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Location & Notes</h4>
            <FieldRow
              label="Location"
              value={construction.location}
              detected={!!construction.location}
              onEdit={(v) => onChange({ location: v || null })}
              placeholder="e.g., Living Room, Bedroom 1"
            />
            <FieldRow
              label="Comments"
              value={construction.comments}
              detected={!!construction.comments}
              onEdit={(v) => onChange({ comments: v || null })}
            />
          </div>

          {/* Components */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
              Components
              {construction.components && construction.components.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {construction.components.length} detected
                </Badge>
              )}
            </h4>
            <ComponentsList components={construction.components || []} />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ConstructionReviewPanel({
  constructions,
  onConstructionChange,
}: ConstructionReviewPanelProps) {
  if (!constructions || constructions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No constructions extracted from file</p>
      </div>
    );
  }

  // Group by type for summary
  const summary = constructions.reduce((acc, c) => {
    acc[c.construction_type] = (acc[c.construction_type] || 0) + c.quantity;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-3">
      {/* Summary badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">
          {constructions.length} construction{constructions.length !== 1 ? 's' : ''}:
        </span>
        {Object.entries(summary).map(([type, count]) => (
          <Badge 
            key={type} 
            className={`${CONSTRUCTION_TYPE_COLORS[type] || 'bg-muted'} border`}
          >
            {count} {CONSTRUCTION_TYPE_LABELS[type] || type}
          </Badge>
        ))}
      </div>

      {/* Construction cards */}
      <div className="space-y-2">
        {constructions.map((construction, index) => (
          <ConstructionCard
            key={`${construction.construction_number}-${index}`}
            construction={construction}
            index={index}
            onChange={(updates) => onConstructionChange(index, updates)}
          />
        ))}
      </div>
    </div>
  );
}
