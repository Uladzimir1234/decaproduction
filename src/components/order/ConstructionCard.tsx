import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";

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
  open_issues_count?: number;
}

interface ConstructionCardProps {
  construction: Construction;
  onClick: () => void;
  isSelected?: boolean;
  orderFulfillment?: OrderFulfillment | null;
}

// Determine status color based on manufacturing progress
const getStatusColor = (
  manufacturing?: ConstructionManufacturing[],
  constructionType?: string,
  orderFulfillment?: OrderFulfillment | null
) => {
  // First check if construction_manufacturing has any progress
  if (manufacturing && manufacturing.length > 0) {
    const hasProgress = manufacturing.some(m => m.status !== 'not_started');
    if (hasProgress) {
      const statusMap = new Map(manufacturing.map(m => [m.stage, m.status]));
      
      // Check stages in reverse order of completion
      if (statusMap.get('glass_installation') === 'complete') {
        return { bg: 'bg-blue-500', text: 'text-white', label: 'Glass installed' };
      }
      if (statusMap.get('assembly') === 'complete') {
        return { bg: 'bg-green-500', text: 'text-white', label: 'Assembled' };
      }
      if (statusMap.get('welding') === 'complete') {
        return { bg: 'bg-amber-400', text: 'text-black', label: 'Welded' };
      }
      
      // Has some partial progress
      const hasPartial = manufacturing.some(m => m.status === 'partial');
      if (hasPartial) {
        return { bg: 'bg-amber-400', text: 'text-black', label: 'In progress' };
      }
    }
  }
  
  // Fall back to order_fulfillment data
  if (orderFulfillment) {
    if (constructionType === 'window') {
      if (orderFulfillment.glass_status === 'complete') {
        return { bg: 'bg-blue-500', text: 'text-white', label: 'Glass installed' };
      }
      if (orderFulfillment.assembly_status === 'complete') {
        return { bg: 'bg-green-500', text: 'text-white', label: 'Assembled' };
      }
      if (orderFulfillment.welding_status === 'complete') {
        return { bg: 'bg-amber-400', text: 'text-black', label: 'Welded' };
      }
      // Check for partial statuses
      if (orderFulfillment.glass_status === 'partial' || 
          orderFulfillment.assembly_status === 'partial' || 
          orderFulfillment.welding_status === 'partial') {
        return { bg: 'bg-amber-400', text: 'text-black', label: 'In progress' };
      }
    } else if (constructionType === 'door') {
      if (orderFulfillment.doors_status === 'complete') {
        return { bg: 'bg-blue-500', text: 'text-white', label: 'Complete' };
      }
      if (orderFulfillment.doors_status === 'partial') {
        return { bg: 'bg-amber-400', text: 'text-black', label: 'In progress' };
      }
    } else if (constructionType === 'sliding_door') {
      if (orderFulfillment.sliding_doors_status === 'complete') {
        return { bg: 'bg-blue-500', text: 'text-white', label: 'Complete' };
      }
      if (orderFulfillment.sliding_doors_status === 'partial') {
        return { bg: 'bg-amber-400', text: 'text-black', label: 'In progress' };
      }
    }
  }
  
  return { bg: 'bg-red-500', text: 'text-white', label: 'Not started' };
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

export function ConstructionCard({ construction, onClick, isSelected, orderFulfillment }: ConstructionCardProps) {
  const statusColor = getStatusColor(construction.manufacturing, construction.construction_type, orderFulfillment);
  const typePrefix = getTypePrefix(construction.construction_type);
  const hasOpenIssues = (construction.open_issues_count || 0) > 0;

  const dimensions = construction.width_inches && construction.height_inches
    ? `${construction.width_inches.toFixed(1)}×${construction.height_inches.toFixed(1)}"`
    : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={`
              relative w-10 h-10 rounded flex items-center justify-center
              font-mono text-[10px] font-bold cursor-pointer
              transition-all hover:scale-110 hover:shadow-lg
              ${statusColor.bg} ${statusColor.text}
              ${isSelected ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}
              ${construction.is_delivered ? 'opacity-50' : ''}
            `}
          >
            {typePrefix}{construction.construction_number}
            
            {/* Issue indicator */}
            {hasOpenIssues && (
              <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full h-3 w-3 flex items-center justify-center">
                <AlertTriangle className="h-2 w-2 text-white" />
              </div>
            )}
            
            {/* Quantity indicator */}
            {construction.quantity > 1 && (
              <div className="absolute -bottom-1 -right-1 bg-background text-foreground rounded-full h-3.5 w-3.5 flex items-center justify-center text-[8px] font-bold border">
                {construction.quantity}
              </div>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="space-y-0.5">
            <p className="font-bold">{typePrefix}-{construction.construction_number}</p>
            {dimensions && <p>{dimensions}</p>}
            {construction.location && <p className="text-muted-foreground">{construction.location}</p>}
            <p className="text-muted-foreground">{statusColor.label}</p>
            {hasOpenIssues && (
              <p className="text-amber-500 font-medium">{construction.open_issues_count} issue{construction.open_issues_count > 1 ? 's' : ''}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
