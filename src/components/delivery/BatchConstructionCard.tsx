import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BatchConstructionItem {
  id: string;
  batch_id: string;
  construction_id: string;
  include_glass: boolean;
  include_screens: boolean;
  include_blinds: boolean;
  include_hardware: boolean;
  is_delivered: boolean;
  delivery_notes: string | null;
}

interface Construction {
  id: string;
  construction_number: string;
  construction_type: string;
  width_inches: number | null;
  height_inches: number | null;
  color_exterior: string | null;
  color_interior: string | null;
  glass_type: string | null;
  screen_type: string | null;
  has_blinds: boolean | null;
  handle_type: string | null;
  quantity: number;
}

interface BatchConstructionCardProps {
  item: BatchConstructionItem;
  construction: Construction;
  canEdit: boolean;
  isAdmin: boolean;
  onRefresh: () => void;
}

export function BatchConstructionCard({
  item,
  construction,
  canEdit,
  isAdmin,
  onRefresh,
}: BatchConstructionCardProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

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
    return null;
  };

  const colors = construction.color_exterior && construction.color_interior 
    ? `${construction.color_exterior}/${construction.color_interior}` 
    : construction.color_exterior || construction.color_interior;

  const updateDelivered = async (isDelivered: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("batch_construction_items")
        .update({ is_delivered: isDelivered })
        .eq("id", item.id);
      if (error) throw error;
      onRefresh();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async () => {
    try {
      const { error } = await supabase
        .from("batch_construction_items")
        .delete()
        .eq("id", item.id);
      if (error) throw error;
      onRefresh();
      toast({ title: "Item removed", description: "Construction removed from batch" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const accessories = [
    item.include_glass && "Glass",
    item.include_screens && construction.screen_type && "Screens",
    item.include_blinds && construction.has_blinds && "Blinds",
    item.include_hardware && construction.handle_type && "Hardware",
  ].filter(Boolean);

  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg border text-sm ${
      item.is_delivered 
        ? 'bg-emerald-500/10 border-emerald-500/30' 
        : 'bg-card border-border'
    }`}>
      <Checkbox
        checked={item.is_delivered}
        onCheckedChange={(checked) => updateDelivered(checked as boolean)}
        disabled={!canEdit || saving}
        className="shrink-0"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-medium ${item.is_delivered ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
            #{construction.construction_number}
          </span>
          <Badge variant="secondary" className="text-xs">
            {getTypeLabel(construction.construction_type)}
          </Badge>
          {construction.quantity > 1 && (
            <Badge variant="outline" className="text-xs">×{construction.quantity}</Badge>
          )}
          {formatDimensions() && (
            <span className="text-xs text-muted-foreground">{formatDimensions()}</span>
          )}
          {colors && (
            <span className="text-xs text-muted-foreground">{colors}</span>
          )}
        </div>
        
        {accessories.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {accessories.map((acc, i) => (
              <Badge key={i} variant="outline" className="text-[10px] h-4 px-1">
                {acc}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {item.delivery_notes && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-xs">{item.delivery_notes}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {isAdmin && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" 
          onClick={deleteItem}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
