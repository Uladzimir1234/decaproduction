import * as React from "react";
import { Lock, Package, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusPopoverButtons, manufacturingPopoverOptions } from "@/components/ui/status-popover-buttons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type StageStatus = "not_started" | "partial" | "complete";
type SupplyStatus = "not_ordered" | "ordered" | "available";

interface SupplyItem {
  id: string;
  label: string;
  shortLabel: string;
  statusField: string;
  connectedStages: string[]; // Which manufacturing stages depend on this
}

interface ManufacturingStage {
  id: string;
  label: string;
  shortLabel: string;
  fulfillmentField: string;
  isLocked: boolean;
  lockReason?: string;
  dependsOnSupply: string[]; // Which supply items this depends on
}

interface SupplyManufacturingPipelineProps {
  trackType: "windows" | "doors" | "sliding_doors";
  supplyItems: SupplyItem[];
  manufacturingStages: ManufacturingStage[];
  order: Record<string, any>;
  fulfillment: Record<string, any>;
  aggregatedComponents: Array<{
    component_type: string;
    component_name: string | null;
    status: string;
  }>;
  isProductionReady: boolean;
  canUpdateSupply: boolean;
  canUpdateManufacturing: boolean;
  onSupplyStatusChange: (field: string, value: string) => void;
  onManufacturingStatusChange: (field: string, value: string) => void;
}

const supplyPopoverOptions = [
  { value: "not_ordered", label: "Not Ordered", color: "bg-destructive text-white" },
  { value: "ordered", label: "Ordered", color: "bg-amber-500 text-white" },
  { value: "available", label: "Available", color: "bg-emerald-500 text-white" },
];

const getSupplyStatusColor = (status: SupplyStatus | string | null) => {
  switch (status) {
    case "available":
      return "bg-emerald-500 text-white";
    case "ordered":
      return "bg-amber-500 text-white";
    case "not_ordered":
    default:
      return "bg-destructive text-white";
  }
};

const getManufacturingStatusColor = (status: StageStatus | string | null | boolean, isLocked: boolean) => {
  if (isLocked) return "bg-muted text-muted-foreground";
  if (typeof status === 'boolean') {
    return status ? "bg-emerald-500 text-white" : "bg-destructive text-white";
  }
  switch (status) {
    case "complete":
      return "bg-emerald-500 text-white";
    case "partial":
      return "bg-amber-500 text-white";
    case "not_started":
    default:
      return "bg-destructive text-white";
  }
};

const getStatusLabel = (status: string | null | boolean, type: 'supply' | 'manufacturing'): string => {
  if (typeof status === 'boolean') {
    return status ? "Complete" : "Not Started";
  }
  if (type === 'supply') {
    switch (status) {
      case "available": return "Available";
      case "ordered": return "Ordered";
      case "not_ordered": default: return "Not Ordered";
    }
  }
  switch (status) {
    case "complete": return "Complete";
    case "partial": return "Partial";
    case "not_started": default: return "Not Started";
  }
};

// Compact labels
const compactLabels: Record<string, string> = {
  'Reinf.': 'R',
  'Profile': 'P',
  'Glass': 'G',
  'Hardware': 'H',
  'SD Prof.': 'P',
  'SD Hdw.': 'H',
  'Reinf. Cut': 'R',
  'Prof. Cut': 'P',
  'Welded': 'W',
  'Assembly': 'A',
  'SD Reinf.': 'R',
  'SD Prof. Cut': 'P',
  'SD Weld': 'W',
  'SD Assy': 'A',
};

function SupplyManufacturingPipeline({
  trackType,
  supplyItems,
  manufacturingStages,
  order,
  fulfillment,
  aggregatedComponents,
  isProductionReady,
  canUpdateSupply,
  canUpdateManufacturing,
  onSupplyStatusChange,
  onManufacturingStatusChange,
}: SupplyManufacturingPipelineProps) {
  const trackLetter = trackType === 'windows' ? 'W' : trackType === 'doors' ? 'D' : 'S';
  
  // Helper to get supply status from aggregated or legacy
  const getSupplyStatus = (item: SupplyItem): SupplyStatus => {
    const componentType = item.id.replace('sd-', '').replace('-', '_');
    const matchingComponents = aggregatedComponents.filter(c => c.component_type === componentType);
    if (matchingComponents.length > 0) {
      if (matchingComponents.some(c => c.status === 'available')) return 'available';
      if (matchingComponents.some(c => c.status === 'ordered')) return 'ordered';
      return 'not_ordered';
    }
    return (order?.[item.statusField] as SupplyStatus) || 'not_ordered';
  };

  return (
    <div className="space-y-1">
      {/* Supply Row */}
      <div className="flex items-center">
        <span className="text-xs font-semibold text-muted-foreground mr-2 w-6">
          {trackLetter}
        </span>
        <div className="flex items-center gap-0.5">
          <Package className="h-3.5 w-3.5 text-muted-foreground mr-1" />
          <TooltipProvider>
            {supplyItems.map((item, index) => {
              const status = getSupplyStatus(item);
              const isFirst = index === 0;
              const isLast = index === supplyItems.length - 1;

              return (
                <Popover key={item.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <button
                          disabled={!canUpdateSupply}
                          className={cn(
                            "relative flex items-center justify-center font-medium transition-all duration-300",
                            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                            getSupplyStatusColor(status),
                            !canUpdateSupply && "cursor-not-allowed opacity-70",
                            canUpdateSupply && "hover:scale-105 active:scale-95 cursor-pointer",
                            // Rectangle with slight rounding for supply row
                            "rounded-sm",
                            !isFirst && "ml-0.5",
                            "h-8 min-w-[70px] text-xs px-2"
                          )}
                        >
                          <span className="truncate">{item.shortLabel}</span>
                        </button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      <div className="text-xs">
                        <p className="font-medium">{item.label}</p>
                        <p className="text-muted-foreground mt-0.5">
                          Status: {getStatusLabel(status, 'supply')}
                        </p>
                        <p className="text-blue-400 mt-1 text-[10px]">
                          → {item.connectedStages.join(', ')}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  
                  {canUpdateSupply && (
                    <PopoverContent className="w-auto p-0" align="center">
                      <div className="p-2">
                        <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
                          {item.label}
                        </p>
                        <StatusPopoverButtons
                          currentValue={status}
                          options={supplyPopoverOptions}
                          onChange={(value) => onSupplyStatusChange(item.statusField, value)}
                        />
                      </div>
                    </PopoverContent>
                  )}
                </Popover>
              );
            })}
          </TooltipProvider>
        </div>
      </div>

      {/* Connection indicators */}
      <div className="flex items-center pl-8">
        <div className="flex items-center gap-0.5">
          {supplyItems.map((item, index) => (
            <div 
              key={`conn-${item.id}`}
              className="flex flex-col items-center"
              style={{ width: index === 0 ? '70px' : '70.5px' }}
            >
              <ArrowDown className="h-3 w-3 text-muted-foreground/50" />
            </div>
          ))}
        </div>
      </div>

      {/* Manufacturing Row */}
      <div className="flex items-center">
        <span className="text-xs font-semibold text-transparent mr-2 w-6">
          {trackLetter}
        </span>
        <TooltipProvider>
          {manufacturingStages.map((stage, index) => {
            const status = fulfillment[stage.fulfillmentField];
            const isLocked = !isProductionReady || stage.isLocked;
            const isFirst = index === 0;
            const isLast = index === manufacturingStages.length - 1;

            return (
              <React.Fragment key={stage.id}>
                <Popover>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <button
                          disabled={isLocked || !canUpdateManufacturing}
                          className={cn(
                            "relative flex items-center justify-center font-medium transition-all duration-300",
                            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                            getManufacturingStatusColor(status, isLocked),
                            isLocked && "cursor-not-allowed opacity-70",
                            !isLocked && canUpdateManufacturing && "hover:scale-105 active:scale-95 cursor-pointer",
                            // Chevron shape
                            isFirst
                              ? "[clip-path:polygon(0%_0%,85%_0%,100%_50%,85%_100%,0%_100%)]"
                              : isLast
                              ? "[clip-path:polygon(0%_0%,100%_0%,100%_100%,0%_100%,15%_50%)]"
                              : "[clip-path:polygon(0%_0%,85%_0%,100%_50%,85%_100%,0%_100%,15%_50%)]",
                            !isFirst && "-ml-1",
                            "h-9 min-w-[70px] text-xs"
                          )}
                        >
                          {isLocked && <Lock className="h-3 w-3 mr-0.5" />}
                          <span className="truncate px-2">{stage.shortLabel}</span>
                        </button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px]">
                      <div className="text-xs">
                        <p className="font-medium">{stage.label}</p>
                        <p className="text-muted-foreground mt-0.5">
                          Status: {getStatusLabel(status, 'manufacturing')}
                        </p>
                        {isLocked && stage.lockReason && (
                          <p className="text-amber-500 mt-0.5">{stage.lockReason}</p>
                        )}
                        {stage.dependsOnSupply.length > 0 && (
                          <p className="text-blue-400 mt-1 text-[10px]">
                            Requires: {stage.dependsOnSupply.join(', ')}
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  
                  {!isLocked && canUpdateManufacturing && (
                    <PopoverContent className="w-auto p-0" align="center">
                      <div className="p-2">
                        <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
                          {stage.label}
                        </p>
                        <StatusPopoverButtons
                          currentValue={typeof status === 'boolean' ? (status ? 'complete' : 'not_started') : (status || "not_started")}
                          options={manufacturingPopoverOptions}
                          onChange={(value) => onManufacturingStatusChange(stage.fulfillmentField, value)}
                        />
                      </div>
                    </PopoverContent>
                  )}
                </Popover>
              </React.Fragment>
            );
          })}
        </TooltipProvider>
      </div>
    </div>
  );
}

// Section wrapper that combines multiple dual-row pipelines
interface SupplyManufacturingSectionProps {
  order: {
    id: string;
    reinforcement_status: string | null;
    windows_profile_status: string | null;
    glass_status: string | null;
    hardware_status: string | null;
    screens_status: string | null;
    sliding_doors_profile_status: string | null;
    sliding_doors_hardware_status: string | null;
    windows_count: number;
    doors_count: number;
    has_sliding_doors: boolean;
    production_status: string;
  };
  fulfillment: Record<string, any>;
  aggregatedComponents: Array<{
    component_type: string;
    component_name: string | null;
    status: string;
  }>;
  canUpdateSupply: boolean;
  canUpdateManufacturing: boolean;
  onSupplyStatusChange: (field: string, value: string) => void;
  onManufacturingStatusChange: (field: string, value: string) => void;
}

export function SupplyManufacturingSection({
  order,
  fulfillment,
  aggregatedComponents,
  canUpdateSupply,
  canUpdateManufacturing,
  onSupplyStatusChange,
  onManufacturingStatusChange,
}: SupplyManufacturingSectionProps) {
  // Helper functions for checking status
  const isReinforcementAvailable = () => order?.reinforcement_status === 'available';
  const isProfileAvailable = () => {
    const profileComponents = aggregatedComponents.filter(c => c.component_type === 'profile');
    return profileComponents.length > 0 
      ? profileComponents.some(c => c.status === 'available')
      : order?.windows_profile_status === 'available';
  };
  const isGlassAvailable = () => {
    const glassComponents = aggregatedComponents.filter(c => c.component_type === 'glass');
    return glassComponents.length > 0 
      ? glassComponents.some(c => c.status === 'available')
      : order?.glass_status === 'available';
  };
  const isHardwareAvailable = () => {
    const hardwareComponents = aggregatedComponents.filter(c => c.component_type === 'hardware');
    return hardwareComponents.length > 0 
      ? hardwareComponents.some(c => c.status === 'available')
      : order?.hardware_status === 'available';
  };
  const isSlidingDoorsProfileAvailable = () => order?.sliding_doors_profile_status === 'available';
  const isSlidingDoorsHardwareAvailable = () => order?.sliding_doors_hardware_status === 'available';

  // Manufacturing stage completion checks
  const isReinforcementCut = () => fulfillment?.reinforcement_cutting === 'complete';
  const isProfileCut = () => fulfillment?.profile_cutting === 'complete';
  const isWelded = () => fulfillment?.welding_status === 'complete';
  const isAssembled = () => fulfillment?.assembly_status === 'complete';
  const isDoorsAssembled = () => fulfillment?.doors_status === 'complete';
  const isSlidingDoorsReinforcementCut = () => fulfillment?.sliding_doors_reinforcement_cutting === 'complete';
  const isSlidingDoorsProfileCut = () => fulfillment?.sliding_doors_profile_cutting === 'complete';
  const isSlidingDoorsWelded = () => fulfillment?.sliding_doors_welding_status === 'complete';
  const isSlidingDoorsAssembled = () => fulfillment?.sliding_doors_status === 'complete';

  const getComponentLockReason = (available: boolean, name: string, status: string | null) => {
    if (available) return undefined;
    return status === 'ordered' ? `${name} ordered` : `${name} not ordered`;
  };

  // Windows supply items and stages
  const windowsSupplyItems: SupplyItem[] = [
    { id: 'reinforcement', label: 'Reinforcement', shortLabel: 'Reinf.', statusField: 'reinforcement_status', connectedStages: ['Reinf. Cut'] },
    { id: 'profile', label: 'Profile', shortLabel: 'Profile', statusField: 'windows_profile_status', connectedStages: ['Prof. Cut'] },
    { id: 'hardware', label: 'Hardware', shortLabel: 'Hardware', statusField: 'hardware_status', connectedStages: ['Assembly'] },
    { id: 'glass', label: 'Glass', shortLabel: 'Glass', statusField: 'glass_status', connectedStages: ['Glass Install'] },
  ];

  const windowsManufacturingStages: ManufacturingStage[] = [
    {
      id: 'reinforcement',
      label: 'Reinforcement Cutting',
      shortLabel: 'Reinf. Cut',
      fulfillmentField: 'reinforcement_cutting',
      isLocked: !isReinforcementAvailable(),
      lockReason: getComponentLockReason(isReinforcementAvailable(), 'Reinforcement', order?.reinforcement_status),
      dependsOnSupply: ['Reinforcement'],
    },
    {
      id: 'profile',
      label: 'Profile Cutting',
      shortLabel: 'Prof. Cut',
      fulfillmentField: 'profile_cutting',
      isLocked: !isProfileAvailable(),
      lockReason: getComponentLockReason(isProfileAvailable(), 'Profile', order?.windows_profile_status),
      dependsOnSupply: ['Profile'],
    },
    {
      id: 'welding',
      label: 'Frames/Sashes Welded',
      shortLabel: 'Welded',
      fulfillmentField: 'welding_status',
      isLocked: !isReinforcementCut() || !isProfileCut(),
      lockReason: !isReinforcementCut() ? 'Reinforcement not cut' : !isProfileCut() ? 'Profile not cut' : undefined,
      dependsOnSupply: [],
    },
    {
      id: 'assembly',
      label: 'Frame/Sash Assembly',
      shortLabel: 'Assembly',
      fulfillmentField: 'assembly_status',
      isLocked: !isWelded() || !isHardwareAvailable(),
      lockReason: !isWelded() ? 'Welding not complete' : !isHardwareAvailable() ? 'Hardware not available' : undefined,
      dependsOnSupply: ['Hardware'],
    },
    {
      id: 'glass',
      label: 'Glass Installed',
      shortLabel: 'Glass',
      fulfillmentField: 'glass_status',
      isLocked: !isAssembled() || !isGlassAvailable(),
      lockReason: !isAssembled() ? 'Assembly not complete' : !isGlassAvailable() ? 'Glass not available' : undefined,
      dependsOnSupply: ['Glass'],
    },
  ];

  // Doors supply and stages (shares with windows)
  const doorsSupplyItems = windowsSupplyItems;

  const doorsManufacturingStages: ManufacturingStage[] = [
    {
      id: 'doors-reinforcement',
      label: 'Reinforcement Cutting',
      shortLabel: 'Reinf. Cut',
      fulfillmentField: 'reinforcement_cutting',
      isLocked: !isReinforcementAvailable(),
      lockReason: getComponentLockReason(isReinforcementAvailable(), 'Reinforcement', order?.reinforcement_status),
      dependsOnSupply: ['Reinforcement'],
    },
    {
      id: 'doors-profile',
      label: 'Profile Cutting',
      shortLabel: 'Prof. Cut',
      fulfillmentField: 'profile_cutting',
      isLocked: !isProfileAvailable(),
      lockReason: getComponentLockReason(isProfileAvailable(), 'Profile', order?.windows_profile_status),
      dependsOnSupply: ['Profile'],
    },
    {
      id: 'doors-welding',
      label: 'Frame Welded',
      shortLabel: 'Welded',
      fulfillmentField: 'welding_status',
      isLocked: !isReinforcementCut() || !isProfileCut(),
      lockReason: !isReinforcementCut() ? 'Reinforcement not cut' : !isProfileCut() ? 'Profile not cut' : undefined,
      dependsOnSupply: [],
    },
    {
      id: 'doors-assembly',
      label: 'Doors Assembled',
      shortLabel: 'Assembly',
      fulfillmentField: 'doors_status',
      isLocked: !isWelded() || !isHardwareAvailable(),
      lockReason: !isWelded() ? 'Welding not complete' : !isHardwareAvailable() ? 'Hardware not available' : undefined,
      dependsOnSupply: ['Hardware'],
    },
    {
      id: 'doors-glass',
      label: 'Glass Installed',
      shortLabel: 'Glass',
      fulfillmentField: 'doors_glass_installed',
      isLocked: !isDoorsAssembled() || !isGlassAvailable(),
      lockReason: !isDoorsAssembled() ? 'Doors not assembled' : !isGlassAvailable() ? 'Glass not available' : undefined,
      dependsOnSupply: ['Glass'],
    },
  ];

  // Sliding doors supply and stages
  const slidingDoorsSupplyItems: SupplyItem[] = [
    { id: 'sd-reinforcement', label: 'Reinforcement', shortLabel: 'Reinf.', statusField: 'reinforcement_status', connectedStages: ['SD Reinf.'] },
    { id: 'sd-profile', label: 'SD Profile', shortLabel: 'SD Prof.', statusField: 'sliding_doors_profile_status', connectedStages: ['SD Prof. Cut'] },
    { id: 'sd-hardware', label: 'SD Hardware', shortLabel: 'SD Hdw.', statusField: 'sliding_doors_hardware_status', connectedStages: ['SD Assy'] },
    { id: 'sd-glass', label: 'Glass', shortLabel: 'Glass', statusField: 'glass_status', connectedStages: ['SD Glass'] },
  ];

  const slidingDoorsManufacturingStages: ManufacturingStage[] = [
    {
      id: 'sd-reinforcement',
      label: 'SD Reinforcement Cutting',
      shortLabel: 'SD Reinf.',
      fulfillmentField: 'sliding_doors_reinforcement_cutting',
      isLocked: !isReinforcementAvailable(),
      lockReason: getComponentLockReason(isReinforcementAvailable(), 'Reinforcement', order?.reinforcement_status),
      dependsOnSupply: ['Reinforcement'],
    },
    {
      id: 'sd-profile',
      label: 'SD Profile Cutting',
      shortLabel: 'SD Prof.',
      fulfillmentField: 'sliding_doors_profile_cutting',
      isLocked: !isSlidingDoorsProfileAvailable(),
      lockReason: getComponentLockReason(isSlidingDoorsProfileAvailable(), 'SD Profile', order?.sliding_doors_profile_status),
      dependsOnSupply: ['SD Profile'],
    },
    {
      id: 'sd-welding',
      label: 'SD Frames Welded',
      shortLabel: 'SD Weld',
      fulfillmentField: 'sliding_doors_welding_status',
      isLocked: !isSlidingDoorsReinforcementCut() || !isSlidingDoorsProfileCut(),
      lockReason: !isSlidingDoorsReinforcementCut() ? 'SD Reinforcement not cut' : !isSlidingDoorsProfileCut() ? 'SD Profile not cut' : undefined,
      dependsOnSupply: [],
    },
    {
      id: 'sd-assembly',
      label: 'SD Assembled',
      shortLabel: 'SD Assy',
      fulfillmentField: 'sliding_doors_status',
      isLocked: !isSlidingDoorsWelded() || !isSlidingDoorsHardwareAvailable(),
      lockReason: !isSlidingDoorsWelded() ? 'SD Welding not complete' : !isSlidingDoorsHardwareAvailable() ? 'SD Hardware not available' : undefined,
      dependsOnSupply: ['SD Hardware'],
    },
    {
      id: 'sd-glass',
      label: 'SD Glass Installed',
      shortLabel: 'SD Glass',
      fulfillmentField: 'sliding_doors_glass_installed',
      isLocked: !isSlidingDoorsAssembled() || !isGlassAvailable(),
      lockReason: !isSlidingDoorsAssembled() ? 'SD not assembled' : !isGlassAvailable() ? 'Glass not available' : undefined,
      dependsOnSupply: ['Glass'],
    },
  ];

  const hasWindows = (order?.windows_count ?? 0) > 0;
  const hasDoors = (order?.doors_count ?? 0) > 0;
  const hasSlidingDoors = order?.has_sliding_doors ?? false;
  const isProductionReady = order?.production_status === 'production_ready';

  if (!fulfillment) return null;

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-b pb-2">
        <span className="font-medium">Supply:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-destructive" />
          <span>Not Ordered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-500" />
          <span>Ordered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span>Available</span>
        </div>
        <span className="ml-4 font-medium">Manufacturing:</span>
        <div className="flex items-center gap-1.5">
          <Lock className="h-3 w-3" />
          <span>Locked</span>
        </div>
      </div>

      {hasWindows && (
        <SupplyManufacturingPipeline
          trackType="windows"
          supplyItems={windowsSupplyItems}
          manufacturingStages={windowsManufacturingStages}
          order={order}
          fulfillment={fulfillment}
          aggregatedComponents={aggregatedComponents}
          isProductionReady={isProductionReady}
          canUpdateSupply={canUpdateSupply}
          canUpdateManufacturing={canUpdateManufacturing}
          onSupplyStatusChange={onSupplyStatusChange}
          onManufacturingStatusChange={onManufacturingStatusChange}
        />
      )}
      
      {hasDoors && (
        <SupplyManufacturingPipeline
          trackType="doors"
          supplyItems={doorsSupplyItems}
          manufacturingStages={doorsManufacturingStages}
          order={order}
          fulfillment={fulfillment}
          aggregatedComponents={aggregatedComponents}
          isProductionReady={isProductionReady}
          canUpdateSupply={canUpdateSupply}
          canUpdateManufacturing={canUpdateManufacturing}
          onSupplyStatusChange={onSupplyStatusChange}
          onManufacturingStatusChange={onManufacturingStatusChange}
        />
      )}
      
      {hasSlidingDoors && (
        <SupplyManufacturingPipeline
          trackType="sliding_doors"
          supplyItems={slidingDoorsSupplyItems}
          manufacturingStages={slidingDoorsManufacturingStages}
          order={order}
          fulfillment={fulfillment}
          aggregatedComponents={aggregatedComponents}
          isProductionReady={isProductionReady}
          canUpdateSupply={canUpdateSupply}
          canUpdateManufacturing={canUpdateManufacturing}
          onSupplyStatusChange={onSupplyStatusChange}
          onManufacturingStatusChange={onManufacturingStatusChange}
        />
      )}
    </div>
  );
}
