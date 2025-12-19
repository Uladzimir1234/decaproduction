import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronDown, ChevronRight, CheckCircle2, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConstructionData } from "./ConstructionChipSelector";
import type { UnitComponentState } from "./UnitCard";
import { getApplicableComponents } from "./ExpandedConstructionPanel";

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

interface RemainingToShipPanelProps {
  constructions: ConstructionData[];
  shippedUnitsPerConstruction: Record<string, ShippedUnitInfo[]>;
  orderData: OrderData;
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

interface UnitRemainingInfo {
  unitIndex: number;
  isFullyShipped: boolean;
  isPartiallyShipped: boolean;
  missingComponents: string[];
  shippedComponents: string[];
}

interface ConstructionRemainingInfo {
  construction: ConstructionData;
  units: UnitRemainingInfo[];
  totalUnshipped: number;
  totalPartial: number;
  totalFullyShipped: number;
}

function getConstructionRemainingInfo(
  construction: ConstructionData,
  shippedUnits: ShippedUnitInfo[],
  orderData: OrderData
): ConstructionRemainingInfo {
  const applicable = getApplicableComponents(construction, orderData);
  const applicableKeys = (Object.keys(applicable) as (keyof UnitComponentState)[])
    .filter(key => applicable[key]);

  // Create a map of shipped components per unit
  const shippedMap = new Map<number, Set<string>>();
  shippedUnits.forEach(unit => {
    if (!shippedMap.has(unit.unitIndex)) {
      shippedMap.set(unit.unitIndex, new Set());
    }
    unit.components.forEach(comp => shippedMap.get(unit.unitIndex)!.add(comp));
  });

  const units: UnitRemainingInfo[] = [];
  let totalUnshipped = 0;
  let totalPartial = 0;
  let totalFullyShipped = 0;

  for (let i = 1; i <= construction.quantity; i++) {
    const shippedSet = shippedMap.get(i) || new Set();
    const shippedComponents = applicableKeys.filter(key => shippedSet.has(key));
    const missingComponents = applicableKeys.filter(key => !shippedSet.has(key));
    
    const isFullyShipped = missingComponents.length === 0 && shippedSet.size > 0;
    const isPartiallyShipped = shippedComponents.length > 0 && missingComponents.length > 0;
    const isUnshipped = shippedSet.size === 0;

    if (isFullyShipped) totalFullyShipped++;
    else if (isPartiallyShipped) totalPartial++;
    else if (isUnshipped) totalUnshipped++;

    units.push({
      unitIndex: i,
      isFullyShipped,
      isPartiallyShipped,
      missingComponents,
      shippedComponents,
    });
  }

  return {
    construction,
    units,
    totalUnshipped,
    totalPartial,
    totalFullyShipped,
  };
}

function ConstructionTypeIcon({ type }: { type: string }) {
  return (
    <Package className={cn(
      "h-3.5 w-3.5",
      type === 'window' && "text-blue-500",
      type === 'door' && "text-orange-500",
      type === 'sliding_door' && "text-purple-500"
    )} />
  );
}

function ConstructionRow({ info }: { info: ConstructionRemainingInfo }) {
  const [expanded, setExpanded] = useState(false);
  const { construction, units, totalUnshipped, totalPartial, totalFullyShipped } = info;

  const hasRemaining = totalUnshipped > 0 || totalPartial > 0;
  if (!hasRemaining) return null;

  const unshippedUnits = units.filter(u => !u.isFullyShipped);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <ConstructionTypeIcon type={construction.construction_type} />
        <span className="font-medium text-sm">#{construction.construction_number}</span>
        <span className="text-xs text-muted-foreground capitalize">
          {construction.construction_type.replace('_', ' ')}
        </span>
        <span className="text-xs text-muted-foreground">
          ({construction.quantity} total)
        </span>
        <div className="flex-1" />
        <div className="flex gap-1.5">
          {totalUnshipped > 0 && (
            <Badge variant="outline" className="border-destructive/50 text-destructive text-[10px] px-1.5 py-0">
              {totalUnshipped} not shipped
            </Badge>
          )}
          {totalPartial > 0 && (
            <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 py-0">
              {totalPartial} partial
            </Badge>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t bg-muted/20 p-2 space-y-1">
          {unshippedUnits.map(unit => (
            <div
              key={unit.unitIndex}
              className={cn(
                "flex items-center gap-2 p-1.5 rounded text-xs",
                unit.isPartiallyShipped ? "bg-amber-500/10" : "bg-destructive/5"
              )}
            >
              <span className="font-medium min-w-[50px]">
                Unit {unit.unitIndex}/{construction.quantity}:
              </span>
              {unit.isPartiallyShipped ? (
                <div className="flex flex-wrap gap-1">
                  <span className="text-muted-foreground">Missing:</span>
                  {unit.missingComponents.map(comp => (
                    <Badge
                      key={comp}
                      variant="outline"
                      className="border-amber-500/50 text-amber-600 dark:text-amber-400 text-[10px] px-1 py-0"
                    >
                      {COMPONENT_LABELS[comp as keyof UnitComponentState] || comp}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground italic">All components pending</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RemainingToShipPanel({
  constructions,
  shippedUnitsPerConstruction,
  orderData,
}: RemainingToShipPanelProps) {
  const constructionInfos = constructions.map(c =>
    getConstructionRemainingInfo(c, shippedUnitsPerConstruction[c.id] || [], orderData)
  );

  const hasAnyRemaining = constructionInfos.some(
    info => info.totalUnshipped > 0 || info.totalPartial > 0
  );

  if (!hasAnyRemaining) return null;

  const totalUnshipped = constructionInfos.reduce((sum, info) => sum + info.totalUnshipped, 0);
  const totalPartial = constructionInfos.reduce((sum, info) => sum + info.totalPartial, 0);

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="py-3 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">Remaining to Deliver:</span>
          <div className="flex gap-1.5 ml-auto">
            {totalUnshipped > 0 && (
              <Badge variant="outline" className="border-destructive/50 text-destructive text-xs">
                {totalUnshipped} units not shipped
              </Badge>
            )}
            {totalPartial > 0 && (
              <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 text-xs">
                {totalPartial} partial
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {constructionInfos.map(info => (
            <ConstructionRow key={info.construction.id} info={info} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
