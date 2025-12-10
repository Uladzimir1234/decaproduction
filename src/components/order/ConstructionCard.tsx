import { useState, useEffect, useRef } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertTriangle, MessageSquare } from "lucide-react";
import { ConstructionQuickActions } from "./ConstructionQuickActions";

interface ConstructionManufacturing {
  stage: string;
  status: string;
}

interface OrderFulfillment {
  welding_status?: string | null;
  assembly_status?: string | null;
  glass_status?: string | null;
  doors_status?: string | null;
  sliding_doors_status?: string | null;
}

interface ConstructionNote {
  note_text: string;
  created_by_email: string | null;
  created_at: string;
}

interface ConstructionIssue {
  issue_type: string;
  description: string;
  created_by_email: string | null;
  created_at: string;
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
  notes?: ConstructionNote[];
  is_delivered?: boolean;
  open_issues_count?: number;
  issues?: ConstructionIssue[];
}

interface ConstructionCardProps {
  construction: Construction;
  onClick: () => void;
  onViewDetails?: () => void;
  isSelected?: boolean;
  orderFulfillment?: OrderFulfillment | null;
  orderId?: string;
  isProductionReady?: boolean;
  onRefresh?: () => void;
  usePopover?: boolean;
}

// Determine status color based on manufacturing progress
// Priority: orderFulfillment (main badges) is primary, construction_manufacturing only for explicit overrides
const getStatusColor = (
  manufacturing?: ConstructionManufacturing[],
  constructionType?: string,
  orderFulfillment?: OrderFulfillment | null
) => {
  // First, determine the base status from order_fulfillment (main manufacturing badges)
  let baseStatus = { bg: 'bg-red-500', text: 'text-white', label: 'Not started' };
  
  if (orderFulfillment) {
    if (constructionType === 'window') {
      if (orderFulfillment.glass_status === 'complete') {
        baseStatus = { bg: 'bg-blue-500', text: 'text-white', label: 'Glass installed' };
      } else if (orderFulfillment.assembly_status === 'complete') {
        baseStatus = { bg: 'bg-green-500', text: 'text-white', label: 'Assembled' };
      } else if (orderFulfillment.welding_status === 'complete') {
        baseStatus = { bg: 'bg-amber-400', text: 'text-black', label: 'Welded' };
      } else if (orderFulfillment.glass_status === 'partial' || 
          orderFulfillment.assembly_status === 'partial' || 
          orderFulfillment.welding_status === 'partial') {
        baseStatus = { bg: 'bg-amber-400', text: 'text-black', label: 'In progress' };
      }
    } else if (constructionType === 'door') {
      if (orderFulfillment.doors_status === 'complete') {
        baseStatus = { bg: 'bg-blue-500', text: 'text-white', label: 'Complete' };
      } else if (orderFulfillment.doors_status === 'partial') {
        baseStatus = { bg: 'bg-amber-400', text: 'text-black', label: 'In progress' };
      }
    } else if (constructionType === 'sliding_door') {
      if (orderFulfillment.sliding_doors_status === 'complete') {
        baseStatus = { bg: 'bg-blue-500', text: 'text-white', label: 'Complete' };
      } else if (orderFulfillment.sliding_doors_status === 'partial') {
        baseStatus = { bg: 'bg-amber-400', text: 'text-black', label: 'In progress' };
      }
    }
  }
  
  // Per-construction override: ONLY allows DOWNGRADING (marking specific item as less complete)
  // construction_manufacturing should NOT upgrade status beyond what main badges show
  // This is for fine-tuning when one specific window/door isn't as far along as the order level
  if (manufacturing && manufacturing.length > 0) {
    const statusMap = new Map(manufacturing.map(m => [m.stage, m.status]));
    
    // Check per-construction stages
    const hasGlassComplete = statusMap.get('glass_installation') === 'complete';
    const hasAssemblyComplete = statusMap.get('assembly') === 'complete';
    const hasWeldingComplete = statusMap.get('welding') === 'complete';
    
    // Determine per-construction level (0=not started, 1=welded, 2=assembled, 3=glass)
    let constructionLevel = 0;
    if (hasGlassComplete) constructionLevel = 3;
    else if (hasAssemblyComplete) constructionLevel = 2;
    else if (hasWeldingComplete) constructionLevel = 1;
    
    // Determine base level from orderFulfillment
    let baseLevel = 0;
    if (baseStatus.bg === 'bg-blue-500') baseLevel = 3; // glass installed
    else if (baseStatus.bg === 'bg-green-500') baseLevel = 2; // assembled
    else if (baseStatus.bg === 'bg-amber-400') baseLevel = 1; // welded/in progress
    
    // Only override if construction level is LOWER than base (downgrade only)
    // This allows marking specific items as "not as far along" as the order level
    if (constructionLevel < baseLevel) {
      if (constructionLevel === 0) {
        return { bg: 'bg-red-500', text: 'text-white', label: 'Not started' };
      }
      if (constructionLevel === 1) {
        return { bg: 'bg-amber-400', text: 'text-black', label: 'Welded' };
      }
      if (constructionLevel === 2) {
        return { bg: 'bg-green-500', text: 'text-white', label: 'Assembled' };
      }
    }
    // If construction level >= base level, ignore it and use base status
  }
  
  return baseStatus;
};

// Get type prefix
const getTypePrefix = (type: string) => {
  switch (type) {
    case 'window': return 'W';
    case 'door': return 'D';
    case 'sliding_door': return 'S';
    default: return 'W';
  }
};

export function ConstructionCard({ 
  construction, 
  onClick, 
  onViewDetails,
  isSelected, 
  orderFulfillment,
  orderId,
  isProductionReady = false,
  onRefresh,
  usePopover = false,
}: ConstructionCardProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const previousStatusRef = useRef<string | null>(null);
  
  const statusColor = getStatusColor(construction.manufacturing, construction.construction_type, orderFulfillment);
  const typePrefix = getTypePrefix(construction.construction_type);
  const hasOpenIssues = (construction.open_issues_count || 0) > 0;
  const hasNotes = (construction.notes_count || 0) > 0;

  // Detect status changes and trigger pulse animation
  useEffect(() => {
    if (previousStatusRef.current !== null && previousStatusRef.current !== statusColor.bg) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 500);
      return () => clearTimeout(timer);
    }
    previousStatusRef.current = statusColor.bg;
  }, [statusColor.bg]);

  const dimensions = construction.width_inches && construction.height_inches
    ? `${construction.width_inches.toFixed(1)}×${construction.height_inches.toFixed(1)}"`
    : null;

  const CardContent = (
    <div
      className={`
        relative flex flex-col items-center gap-0.5 cursor-pointer
        transition-all hover:scale-110
        ${isSelected ? 'scale-110' : ''}
      `}
    >
      {/* Badge square - now shows type letter */}
      <div
        className={`
          relative w-7 h-7 rounded-sm flex items-center justify-center
          text-sm font-black drop-shadow-sm
          transition-all duration-300 ease-out
          ${statusColor.bg} ${statusColor.text}
          ${isSelected ? 'ring-1 ring-offset-1 ring-primary' : ''}
          ${construction.is_delivered ? 'opacity-50' : ''}
          ${isPulsing ? 'animate-[pulse-scale_0.5s_ease-out]' : ''}
        `}
      >
        {typePrefix}
        
        {/* Issue indicator with tooltip */}
        {hasOpenIssues && (
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <div 
                  className="absolute -top-1.5 -right-1.5 bg-amber-500 rounded-full h-4 w-4 flex items-center justify-center cursor-pointer hover:bg-amber-600 transition-colors shadow-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <AlertTriangle className="h-2.5 w-2.5 text-white" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-xs z-[9999]">
                <div className="space-y-1">
                  <p className="font-bold text-amber-500">Issues ({construction.open_issues_count})</p>
                  {construction.issues && construction.issues.slice(0, 3).map((issue, idx) => (
                    <div key={idx} className="pl-2 border-l-2 border-amber-400">
                      <p className="font-medium text-foreground capitalize">{issue.issue_type}</p>
                      <p className="break-words text-muted-foreground">{issue.description}</p>
                      {issue.created_by_email && (
                        <p className="text-[10px] text-muted-foreground">— {issue.created_by_email.split('@')[0]}</p>
                      )}
                    </div>
                  ))}
                  {construction.issues && construction.issues.length > 3 && (
                    <p className="text-muted-foreground text-[10px]">+{construction.issues.length - 3} more...</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {/* Notes indicator with tooltip */}
        {hasNotes && !hasOpenIssues && (
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <div 
                  className="absolute -top-1 -right-1 bg-blue-400 rounded-full h-2.5 w-2.5 flex items-center justify-center cursor-pointer hover:bg-blue-500 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MessageSquare className="h-1.5 w-1.5 text-white" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-xs z-[9999]">
                <div className="space-y-1">
                  <p className="font-bold text-blue-500">Notes ({construction.notes_count})</p>
                  {construction.notes && construction.notes.slice(0, 3).map((note, idx) => (
                    <div key={idx} className="pl-2 border-l-2 border-blue-300">
                      <p className="break-words text-foreground">{note.note_text}</p>
                      {note.created_by_email && (
                        <p className="text-[10px] text-muted-foreground">— {note.created_by_email.split('@')[0]}</p>
                      )}
                    </div>
                  ))}
                  {construction.notes && construction.notes.length > 3 && (
                    <p className="text-muted-foreground text-[10px]">+{construction.notes.length - 3} more...</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {/* Quantity indicator - top right */}
        {construction.quantity > 1 && (
          <div className="absolute -top-1.5 -right-1.5 bg-white text-gray-900 rounded-full h-4 w-4 flex items-center justify-center text-[10px] font-bold border border-gray-400 shadow-md">
            {construction.quantity}
          </div>
        )}
      </div>
      
      {/* Construction number below */}
      <span className="text-xs font-bold text-muted-foreground">
        {construction.construction_number}
      </span>
    </div>
  );

  // If usePopover is enabled, wrap in Popover instead of just Tooltip
  if (usePopover && orderId && onRefresh) {
    return (
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button 
            type="button" 
            className="focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              setPopoverOpen(true);
            }}
          >
            {CardContent}
          </button>
        </PopoverTrigger>
        <PopoverContent 
          side="bottom" 
          align="start" 
          className="p-0 w-auto max-w-[90vw] bg-background border shadow-lg" 
          sideOffset={8}
          collisionPadding={16}
          style={{ zIndex: 9999 }}
        >
          <ConstructionQuickActions
            construction={construction}
            orderId={orderId}
            isProductionReady={isProductionReady}
            onViewDetails={() => {
              setPopoverOpen(false);
              if (onViewDetails) {
                onViewDetails();
              } else {
                onClick();
              }
            }}
            onClose={() => setPopoverOpen(false)}
            onRefresh={onRefresh}
          />
        </PopoverContent>
      </Popover>
    );
  }

  // Default tooltip behavior
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={onClick}>{CardContent}</button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-xs">
          <div className="space-y-1">
            <p className="font-bold">{typePrefix}-{construction.construction_number}</p>
            {dimensions && <p>{dimensions}</p>}
            {construction.location && <p className="text-muted-foreground">{construction.location}</p>}
            <p className="text-muted-foreground">{statusColor.label}</p>
            {hasOpenIssues && (
              <p className="text-amber-500 font-medium">{construction.open_issues_count} issue{construction.open_issues_count! > 1 ? 's' : ''}</p>
            )}
            {/* Display actual notes */}
            {construction.notes && construction.notes.length > 0 && (
              <div className="border-t pt-1 mt-1 space-y-1">
                <p className="text-blue-500 font-medium">Notes:</p>
                {construction.notes.slice(0, 3).map((note, idx) => (
                  <div key={idx} className="text-muted-foreground pl-2 border-l-2 border-blue-300">
                    <p className="break-words">{note.note_text}</p>
                    {note.created_by_email && (
                      <p className="text-[10px] opacity-70">— {note.created_by_email.split('@')[0]}</p>
                    )}
                  </div>
                ))}
                {construction.notes.length > 3 && (
                  <p className="text-muted-foreground text-[10px]">+{construction.notes.length - 3} more...</p>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
