import * as React from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusPopoverButtons, manufacturingPopoverOptions } from "@/components/ui/status-popover-buttons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type StageStatus = "not_started" | "partial" | "complete";

interface Stage {
  id: string;
  label: string;
  shortLabel: string;
  fulfillmentField: string;
  isLocked: boolean;
  lockReason?: string;
}

interface ManufacturingPipelineProps {
  trackType: "windows" | "doors" | "sliding_doors";
  trackLabel: string;
  stages: Stage[];
  fulfillment: Record<string, any>;
  isProductionReady: boolean;
  canUpdate: boolean;
  onStatusChange: (field: string, value: string) => void;
  size?: "default" | "compact";
  showLegend?: boolean;
  showTrackLetter?: boolean;
}

const getStatusColor = (status: StageStatus | string | null | boolean, isLocked: boolean) => {
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

const getStatusLabel = (status: StageStatus | string | null | boolean): string => {
  if (typeof status === 'boolean') {
    return status ? "Complete" : "Not Started";
  }
  switch (status) {
    case "complete":
      return "Complete";
    case "partial":
      return "Partial";
    case "not_started":
    default:
      return "Not Started";
  }
};

// Abbreviated labels for compact mode
const compactLabels: Record<string, string> = {
  'Reinf. Cut': 'R',
  'Prof. Cut': 'P',
  'Welded': 'W',
  'Assembly': 'A',
  'Glass': 'G',
  'SD Reinf.': 'R',
  'SD Prof.': 'P',
  'SD Weld': 'W',
  'SD Assy': 'A',
  'SD Glass': 'G',
  'Screens': 'Sc',
  'SD Scr.': 'Sc',
};

export function ManufacturingPipeline({
  trackType,
  trackLabel,
  stages,
  fulfillment,
  isProductionReady,
  canUpdate,
  onStatusChange,
  size = "default",
  showLegend = true,
  showTrackLetter = false,
}: ManufacturingPipelineProps) {
  const isCompact = size === "compact";
  const trackLetter = trackType === 'windows' ? 'W' : trackType === 'doors' ? 'D' : 'S';
  
  return (
    <div className={cn("space-y-1", isCompact && "space-y-0")}>
      {/* Track Label - hidden in compact mode or when showTrackLetter is true */}
      {!isCompact && !showTrackLetter && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">{trackLabel}</span>
          {!isProductionReady && (
            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              On Hold
            </span>
          )}
        </div>
      )}

      {/* Pipeline Arrow */}
      <div className="flex items-center">
        {/* Track letter indicator - show in compact mode OR when showTrackLetter is true */}
        {(isCompact || showTrackLetter) && (
          <span className={cn(
            "font-bold text-muted-foreground",
            isCompact ? "text-xs mr-1.5 w-4" : "text-base mr-2 w-6"
          )}>
            {trackLetter}
          </span>
        )}
        <TooltipProvider>
          {stages.map((stage, index) => {
            const status = fulfillment[stage.fulfillmentField];
            const isLocked = !isProductionReady || stage.isLocked;
            const isFirst = index === 0;
            const isLast = index === stages.length - 1;
            const displayLabel = isCompact ? (compactLabels[stage.shortLabel] || stage.shortLabel.charAt(0)) : stage.shortLabel;

            return (
              <React.Fragment key={stage.id}>
                <Popover>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <button
                          disabled={isLocked || !canUpdate}
                          className={cn(
                            "relative flex items-center justify-center font-medium transition-all duration-300",
                            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                            getStatusColor(status, isLocked),
                            isLocked && "cursor-not-allowed opacity-70",
                            !isLocked && canUpdate && "hover:scale-105 active:scale-95 cursor-pointer",
                            // Chevron shape using clip-path
                            isFirst
                              ? "[clip-path:polygon(0%_0%,85%_0%,100%_50%,85%_100%,0%_100%)]"
                              : isLast
                              ? "[clip-path:polygon(0%_0%,100%_0%,100%_100%,0%_100%,15%_50%)]"
                              : "[clip-path:polygon(0%_0%,85%_0%,100%_50%,85%_100%,0%_100%,15%_50%)]",
                            // Add overlap for connected look
                            !isFirst && "-ml-2",
                            // Size variants - compact is touch-friendly (44px min target)
                            isCompact 
                              ? "h-9 min-w-[44px] text-[11px]" 
                              : "h-7 min-w-[90px] text-xs"
                          )}
                        >
                          {isLocked && <Lock className={cn("mr-0.5", isCompact ? "h-3 w-3" : "h-3 w-3")} />}
                          <span className={cn("truncate", isCompact ? "px-1.5" : "px-3")}>{displayLabel}</span>
                        </button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      <div className="text-xs">
                        <p className="font-medium">{stage.label}</p>
                        <p className="text-muted-foreground mt-0.5">
                          Status: {getStatusLabel(status)}
                        </p>
                        {isLocked && stage.lockReason && (
                          <p className="text-amber-500 mt-0.5">{stage.lockReason}</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  
                  {!isLocked && canUpdate && (
                    <PopoverContent className="w-auto p-0" align="center">
                      <div className="p-2">
                        <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
                          {stage.label}
                        </p>
                        <StatusPopoverButtons
                          currentValue={typeof status === 'boolean' ? (status ? 'complete' : 'not_started') : (status || "not_started")}
                          options={manufacturingPopoverOptions}
                          onChange={(value) => onStatusChange(stage.fulfillmentField, value)}
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

      {/* Legend - only when showLegend is true and in default mode */}
      {showLegend && !isCompact && (
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-destructive" />
            <span>Not Started</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-amber-500" />
            <span>Partial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-emerald-500" />
            <span>Complete</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            <span>Locked</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Section wrapper that combines multiple pipelines
interface ManufacturingPipelineSectionProps {
  order: {
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
  constructions?: Array<{
    construction_type: string;
    screen_type: string | null;
  }>;
  canUpdateManufacturing: boolean;
  updateFulfillment: (field: string, value: any) => void;
  size?: "default" | "compact";
  showLegend?: boolean;
  showTrackLetter?: boolean;
}

export function ManufacturingPipelineSection({
  order,
  fulfillment,
  aggregatedComponents,
  constructions = [],
  canUpdateManufacturing,
  updateFulfillment,
  size = "default",
  showLegend = true,
  showTrackLetter = false,
}: ManufacturingPipelineSectionProps) {
  // Helper to check component availability from aggregated components or legacy fields
  const isProfileAvailable = () => {
    const profileComponents = aggregatedComponents.filter(c => c.component_type === 'profile');
    if (profileComponents.length > 0) {
      return profileComponents.some(c => c.status === 'available');
    }
    return order?.windows_profile_status === 'available';
  };

  const isGlassAvailable = () => {
    const glassComponents = aggregatedComponents.filter(c => c.component_type === 'glass');
    if (glassComponents.length > 0) {
      return glassComponents.some(c => c.status === 'available');
    }
    return order?.glass_status === 'available';
  };

  const isHardwareAvailable = () => {
    const hardwareComponents = aggregatedComponents.filter(c => c.component_type === 'hardware');
    if (hardwareComponents.length > 0) {
      return hardwareComponents.some(c => c.status === 'available');
    }
    return order?.hardware_status === 'available';
  };

  const isReinforcementAvailable = () => order?.reinforcement_status === 'available';
  const isSlidingDoorsProfileAvailable = () => order?.sliding_doors_profile_status === 'available';
  const isSlidingDoorsHardwareAvailable = () => order?.sliding_doors_hardware_status === 'available';

  // Check if screen material is ordered or available
  const isScreensAvailable = () => {
    const screensComponents = aggregatedComponents.filter(c => c.component_type === 'screens');
    if (screensComponents.length > 0) {
      return screensComponents.some(c => c.status === 'available' || c.status === 'ordered');
    }
    return order?.screens_status === 'available' || order?.screens_status === 'ordered';
  };

  // Check which tracks have screens based on construction data
  const windowsHaveScreens = constructions.some(
    c => c.construction_type === 'window' && c.screen_type != null && c.screen_type !== ''
  );
  const doorsHaveScreens = constructions.some(
    c => c.construction_type === 'door' && c.screen_type != null && c.screen_type !== ''
  );
  const slidingDoorsHaveScreens = constructions.some(
    c => c.construction_type === 'sliding_door' && c.screen_type != null && c.screen_type !== ''
  );

  // Check stage completion
  const isReinforcementCut = () => fulfillment?.reinforcement_cutting === 'complete';
  const isProfileCut = () => fulfillment?.profile_cutting === 'complete';
  const isWelded = () => fulfillment?.welding_status === 'complete';
  const isAssembled = () => fulfillment?.assembly_status === 'complete';
  const isGlassInstalled = () => fulfillment?.glass_status === 'complete';
  const isDoorsAssembled = () => fulfillment?.doors_status === 'complete';
  const isDoorsGlassInstalled = () => fulfillment?.doors_glass_installed === true || fulfillment?.doors_glass_installed === 'complete';
  const isSlidingDoorsReinforcementCut = () => fulfillment?.sliding_doors_reinforcement_cutting === 'complete';
  const isSlidingDoorsProfileCut = () => fulfillment?.sliding_doors_profile_cutting === 'complete';
  const isSlidingDoorsWelded = () => fulfillment?.sliding_doors_welding_status === 'complete';
  const isSlidingDoorsAssembled = () => fulfillment?.sliding_doors_status === 'complete';
  const isSlidingDoorsGlassInstalled = () => fulfillment?.sliding_doors_glass_installed === true || fulfillment?.sliding_doors_glass_installed === 'complete';

  const getComponentLockReason = (available: boolean, name: string, status: string | null) => {
    if (available) return undefined;
    return status === 'ordered' ? `${name} ordered` : `${name} not ordered`;
  };

  const getScreensLockReason = () => {
    if (isScreensAvailable()) return undefined;
    return order?.screens_status === 'not_ordered' || !order?.screens_status 
      ? 'Screen material not ordered' 
      : 'Screen material not available';
  };

  // Windows/General track stages
  const windowsStages: Stage[] = [
    {
      id: 'reinforcement',
      label: 'Reinforcement Cutting',
      shortLabel: 'Reinf. Cut',
      fulfillmentField: 'reinforcement_cutting',
      isLocked: !isReinforcementAvailable(),
      lockReason: getComponentLockReason(isReinforcementAvailable(), 'Reinforcement', order?.reinforcement_status || null),
    },
    {
      id: 'profile',
      label: 'Profile Cutting',
      shortLabel: 'Prof. Cut',
      fulfillmentField: 'profile_cutting',
      isLocked: !isProfileAvailable(),
      lockReason: getComponentLockReason(isProfileAvailable(), 'Profile', order?.windows_profile_status || null),
    },
    {
      id: 'welding',
      label: 'Frames/Sashes Welded',
      shortLabel: 'Welded',
      fulfillmentField: 'welding_status',
      isLocked: !isReinforcementCut() || !isProfileCut(),
      lockReason: !isReinforcementCut() 
        ? 'Reinforcement not cut' 
        : !isProfileCut() 
          ? 'Profile not cut' 
          : undefined,
    },
    {
      id: 'assembly',
      label: 'Frame/Sash Assembly',
      shortLabel: 'Assembly',
      fulfillmentField: 'assembly_status',
      isLocked: !isWelded() || !isHardwareAvailable(),
      lockReason: !isWelded() 
        ? 'Welding not complete' 
        : !isHardwareAvailable() 
          ? 'Hardware not available' 
          : undefined,
    },
    {
      id: 'glass',
      label: 'Glass Installed',
      shortLabel: 'Glass',
      fulfillmentField: 'glass_status',
      isLocked: !isAssembled() || !isGlassAvailable(),
      lockReason: !isAssembled() 
        ? 'Assembly not complete' 
        : !isGlassAvailable() 
          ? 'Glass not available' 
          : undefined,
    },
    // Add Screens stage only if windows have screens
    ...(windowsHaveScreens ? [{
      id: 'windows-screens',
      label: 'Window Screens',
      shortLabel: 'Screens',
      fulfillmentField: 'screens_cutting',
      isLocked: !isScreensAvailable(),
      lockReason: getScreensLockReason(),
    }] : []),
  ];

  // Doors track stages
  const doorsStages: Stage[] = [
    {
      id: 'doors-reinforcement',
      label: 'Reinforcement Cutting',
      shortLabel: 'Reinf. Cut',
      fulfillmentField: 'reinforcement_cutting',
      isLocked: !isReinforcementAvailable(),
      lockReason: getComponentLockReason(isReinforcementAvailable(), 'Reinforcement', order?.reinforcement_status || null),
    },
    {
      id: 'doors-profile',
      label: 'Profile Cutting',
      shortLabel: 'Prof. Cut',
      fulfillmentField: 'profile_cutting',
      isLocked: !isProfileAvailable(),
      lockReason: getComponentLockReason(isProfileAvailable(), 'Profile', order?.windows_profile_status || null),
    },
    {
      id: 'doors-welding',
      label: 'Frame Welded',
      shortLabel: 'Welded',
      fulfillmentField: 'welding_status',
      isLocked: !isReinforcementCut() || !isProfileCut(),
      lockReason: !isReinforcementCut() 
        ? 'Reinforcement not cut' 
        : !isProfileCut() 
          ? 'Profile not cut' 
          : undefined,
    },
    {
      id: 'doors-assembly',
      label: 'Doors Assembled',
      shortLabel: 'Assembly',
      fulfillmentField: 'doors_status',
      isLocked: !isWelded() || !isHardwareAvailable(),
      lockReason: !isWelded() 
        ? 'Welding not complete' 
        : !isHardwareAvailable() 
          ? 'Hardware not available' 
          : undefined,
    },
    {
      id: 'doors-glass',
      label: 'Glass Installed',
      shortLabel: 'Glass',
      fulfillmentField: 'doors_glass_installed',
      isLocked: !isDoorsAssembled() || !isGlassAvailable(),
      lockReason: !isDoorsAssembled() 
        ? 'Doors not assembled' 
        : !isGlassAvailable() 
          ? 'Glass not available' 
          : undefined,
    },
    // Add Screens stage only if doors have screens
    ...(doorsHaveScreens ? [{
      id: 'doors-screens',
      label: 'Door Screens',
      shortLabel: 'Screens',
      fulfillmentField: 'screens_cutting',
      isLocked: !isScreensAvailable(),
      lockReason: getScreensLockReason(),
    }] : []),
  ];

  // Sliding doors independent track stages
  const slidingDoorsStages: Stage[] = [
    {
      id: 'sd-reinforcement',
      label: 'SD Reinforcement Cutting',
      shortLabel: 'SD Reinf.',
      fulfillmentField: 'sliding_doors_reinforcement_cutting',
      isLocked: !isReinforcementAvailable(),
      lockReason: getComponentLockReason(isReinforcementAvailable(), 'Reinforcement', order?.reinforcement_status || null),
    },
    {
      id: 'sd-profile',
      label: 'SD Profile Cutting',
      shortLabel: 'SD Prof.',
      fulfillmentField: 'sliding_doors_profile_cutting',
      isLocked: !isSlidingDoorsProfileAvailable(),
      lockReason: getComponentLockReason(isSlidingDoorsProfileAvailable(), 'SD Profile', order?.sliding_doors_profile_status || null),
    },
    {
      id: 'sd-welding',
      label: 'SD Frames Welded',
      shortLabel: 'SD Weld',
      fulfillmentField: 'sliding_doors_welding_status',
      isLocked: !isSlidingDoorsReinforcementCut() || !isSlidingDoorsProfileCut(),
      lockReason: !isSlidingDoorsReinforcementCut() 
        ? 'SD Reinforcement not cut' 
        : !isSlidingDoorsProfileCut() 
          ? 'SD Profile not cut' 
          : undefined,
    },
    {
      id: 'sd-assembly',
      label: 'SD Assembled',
      shortLabel: 'SD Assy',
      fulfillmentField: 'sliding_doors_status',
      isLocked: !isSlidingDoorsWelded() || !isSlidingDoorsHardwareAvailable(),
      lockReason: !isSlidingDoorsWelded() 
        ? 'SD Welding not complete' 
        : !isSlidingDoorsHardwareAvailable() 
          ? 'SD Hardware not available' 
          : undefined,
    },
    {
      id: 'sd-glass',
      label: 'SD Glass Installed',
      shortLabel: 'SD Glass',
      fulfillmentField: 'sliding_doors_glass_installed',
      isLocked: !isSlidingDoorsAssembled() || !isGlassAvailable(),
      lockReason: !isSlidingDoorsAssembled() 
        ? 'SD not assembled' 
        : !isGlassAvailable() 
          ? 'Glass not available' 
          : undefined,
    },
    // Add Screens stage only if sliding doors have screens
    ...(slidingDoorsHaveScreens ? [{
      id: 'sd-screens',
      label: 'Sliding Door Screens',
      shortLabel: 'SD Scr.',
      fulfillmentField: 'screens_cutting',
      isLocked: !isScreensAvailable(),
      lockReason: getScreensLockReason(),
    }] : []),
  ];

  const hasWindows = (order?.windows_count ?? 0) > 0;
  const hasDoors = (order?.doors_count ?? 0) > 0;
  const hasSlidingDoors = order?.has_sliding_doors ?? false;
  const isProductionReady = order?.production_status === 'production_ready';

  if (!fulfillment) return null;

  return (
    <div className={cn(size === "compact" ? "space-y-0.5" : "space-y-1")}>
      {hasWindows && (
        <ManufacturingPipeline
          trackType="windows"
          trackLabel="Windows Track"
          stages={windowsStages}
          fulfillment={fulfillment}
          isProductionReady={isProductionReady}
          canUpdate={canUpdateManufacturing}
          onStatusChange={updateFulfillment}
          size={size}
          showLegend={showLegend}
          showTrackLetter={showTrackLetter}
        />
      )}
      
      {hasDoors && (
        <ManufacturingPipeline
          trackType="doors"
          trackLabel="Doors Track"
          stages={doorsStages}
          fulfillment={fulfillment}
          isProductionReady={isProductionReady}
          canUpdate={canUpdateManufacturing}
          onStatusChange={updateFulfillment}
          size={size}
          showLegend={showLegend}
          showTrackLetter={showTrackLetter}
        />
      )}
      
      {hasSlidingDoors && (
        <ManufacturingPipeline
          trackType="sliding_doors"
          trackLabel="Sliding Doors Track"
          stages={slidingDoorsStages}
          fulfillment={fulfillment}
          isProductionReady={isProductionReady}
          canUpdate={canUpdateManufacturing}
          onStatusChange={updateFulfillment}
          size={size}
          showLegend={showLegend}
          showTrackLetter={showTrackLetter}
        />
      )}
    </div>
  );
}
