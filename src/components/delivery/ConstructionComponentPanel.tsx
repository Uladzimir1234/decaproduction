import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ConstructionData } from "./ConstructionChipSelector";

export interface ComponentSelection {
  screens: { include: boolean; qty: number };
  blinds: { include: boolean; qty: number };
  handles: { include: boolean; qty: number };
  weepingCovers: { include: boolean; qty: number };
  hingeCovers: { include: boolean; qty: number };
  nailFins: { include: boolean; qty: number };
  brackets: { include: boolean; qty: number };
  plisseScreens: { include: boolean; qty: number };
}

export interface ConstructionComponentSelection {
  constructionId: string;
  quantity: number;
  components: ComponentSelection;
}

interface OrderData {
  has_nailing_flanges?: boolean | null;
  has_plisse_screens?: boolean | null;
  visible_hinges_count?: number | null;
  hidden_hinges_count?: number | null;
}

interface ConstructionComponentPanelProps {
  construction: ConstructionData;
  orderData: OrderData;
  selection: ConstructionComponentSelection;
  maxQuantity: number;
  onQuantityChange: (qty: number) => void;
  onComponentToggle: (component: keyof ComponentSelection, value: boolean) => void;
  onComponentQtyChange: (component: keyof ComponentSelection, qty: number) => void;
}

const COMPONENT_CONFIG: {
  key: keyof ComponentSelection;
  label: string;
  showCondition: (c: ConstructionData, o: OrderData) => boolean;
  getDefaultQty: (c: ConstructionData, o: OrderData, qty: number) => number;
}[] = [
  {
    key: 'screens',
    label: 'Screens',
    showCondition: (c) => !!c.screen_type && c.screen_type !== 'none',
    getDefaultQty: (c, o, qty) => qty,
  },
  {
    key: 'plisseScreens',
    label: 'Plissé Screens',
    showCondition: (c, o) => !!o.has_plisse_screens,
    getDefaultQty: (c, o, qty) => qty,
  },
  {
    key: 'blinds',
    label: 'Blinds',
    showCondition: (c) => !!c.has_blinds,
    getDefaultQty: (c, o, qty) => qty,
  },
  {
    key: 'handles',
    label: 'Handles',
    showCondition: (c) => !!c.handle_type && c.handle_type !== 'none',
    getDefaultQty: (c, o, qty) => qty,
  },
  {
    key: 'weepingCovers',
    label: 'Weeping Covers',
    showCondition: () => true,
    getDefaultQty: (c, o, qty) => qty * 2,
  },
  {
    key: 'hingeCovers',
    label: 'Hinge Covers',
    showCondition: (c, o) => (o.visible_hinges_count || 0) > 0 || (o.hidden_hinges_count || 0) > 0,
    getDefaultQty: (c, o, qty) => qty * 2,
  },
  {
    key: 'nailFins',
    label: 'Nail Fins',
    showCondition: (c, o) => !!o.has_nailing_flanges,
    getDefaultQty: (c, o, qty) => qty,
  },
  {
    key: 'brackets',
    label: 'Brackets',
    showCondition: () => true,
    getDefaultQty: (c, o, qty) => qty,
  },
];

export function getDefaultComponents(
  construction: ConstructionData,
  orderData: OrderData,
  quantity: number
): ComponentSelection {
  const components: ComponentSelection = {
    screens: { include: false, qty: 0 },
    blinds: { include: false, qty: 0 },
    handles: { include: false, qty: 0 },
    weepingCovers: { include: false, qty: 0 },
    hingeCovers: { include: false, qty: 0 },
    nailFins: { include: false, qty: 0 },
    brackets: { include: false, qty: 0 },
    plisseScreens: { include: false, qty: 0 },
  };

  COMPONENT_CONFIG.forEach(config => {
    if (config.showCondition(construction, orderData)) {
      const defaultQty = config.getDefaultQty(construction, orderData, quantity);
      components[config.key] = { include: true, qty: defaultQty };
    }
  });

  return components;
}

export function ConstructionComponentPanel({
  construction,
  orderData,
  selection,
  maxQuantity,
  onQuantityChange,
  onComponentToggle,
  onComponentQtyChange,
}: ConstructionComponentPanelProps) {
  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'window': return 'Window';
      case 'door': return 'Door';
      case 'sliding_door': return 'Sliding Door';
      default: return type;
    }
  };

  const applicableComponents = COMPONENT_CONFIG.filter(config => 
    config.showCondition(construction, orderData)
  );

  return (
    <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">#{construction.construction_number}</span>
          <Badge variant="secondary" className="text-xs">
            {getTypeLabel(construction.construction_type)}
          </Badge>
        </div>
        
        {/* Quantity selector for constructions with qty > 1 */}
        {maxQuantity > 1 && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Ship:</Label>
            <Input
              type="number"
              min={1}
              max={maxQuantity}
              value={selection.quantity}
              onChange={(e) => onQuantityChange(Math.min(maxQuantity, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-16 h-7 text-xs text-center"
            />
            <span className="text-xs text-muted-foreground">of {maxQuantity}</span>
          </div>
        )}
      </div>

      {/* Component toggles */}
      {applicableComponents.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {applicableComponents.map(config => {
            const comp = selection.components[config.key];
            return (
              <div 
                key={config.key}
                className={cn(
                  "flex items-center gap-2 p-2 rounded border transition-colors",
                  comp.include ? "bg-primary/5 border-primary/30" : "bg-background border-border"
                )}
              >
                <Checkbox
                  checked={comp.include}
                  onCheckedChange={(checked) => onComponentToggle(config.key, checked as boolean)}
                  className="h-3.5 w-3.5"
                />
                <div className="flex-1 min-w-0">
                  <Label className="text-xs font-medium truncate block cursor-pointer">
                    {config.label}
                  </Label>
                </div>
                <Input
                  type="number"
                  min={0}
                  value={comp.qty}
                  onChange={(e) => onComponentQtyChange(config.key, Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={!comp.include}
                  className="w-12 h-6 text-xs text-center p-1"
                />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No additional components for this item</p>
      )}
    </div>
  );
}
