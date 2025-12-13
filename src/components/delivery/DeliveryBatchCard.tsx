import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Truck, Package, BoxIcon, Trash2, CalendarIcon, Pencil, CheckCircle, User, Undo2 } from "lucide-react";
import { format } from "date-fns";

interface DeliveryBatch {
  id: string;
  order_id: string;
  delivery_date: string;
  status: string;
  notes: string | null;
  created_at: string;
  delivery_person: string | null;
}

interface BatchShippingItem {
  id: string;
  batch_id: string;
  item_type: string;
  quantity: number;
  is_complete: boolean;
}

interface BatchCustomShippingItem {
  id: string;
  batch_id: string;
  name: string;
  quantity: number;
  is_complete: boolean;
}

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
  quantity: number;
}

interface DeliveryBatchCardProps {
  batch: DeliveryBatch;
  shippingItems: BatchShippingItem[];
  customShippingItems: BatchCustomShippingItem[];
  constructionItems: BatchConstructionItem[];
  canEdit: boolean;
  isAdmin: boolean;
  onRefresh: () => void;
  onEdit: () => void;
  batchNumber: number;
}

const SHIPPING_ITEM_LABELS: Record<string, string> = {
  'handles': 'Handles',
  'hinges_covers': 'Hinges',
  'weeping_covers': 'Weeping',
  'spec_labels': 'Labels',
  'nailing_fins': 'Fins',
  'brackets': 'Brackets',
};

export function DeliveryBatchCard({
  batch,
  shippingItems,
  customShippingItems,
  constructionItems,
  canEdit,
  isAdmin,
  onRefresh,
  onEdit,
  batchNumber
}: DeliveryBatchCardProps) {
  const { toast } = useToast();
  const [constructions, setConstructions] = useState<Record<string, Construction>>({});
  const [markingShipped, setMarkingShipped] = useState(false);
  const [undoingShipment, setUndoingShipment] = useState(false);

  // Fetch constructions for display
  useEffect(() => {
    const fetchConstructions = async () => {
      const constructionIds = constructionItems.map(item => item.construction_id);
      if (constructionIds.length === 0) return;

      const { data } = await supabase
        .from("order_constructions")
        .select("id, construction_number, construction_type, width_inches, height_inches, quantity")
        .in("id", constructionIds);

      if (data) {
        const constructionMap: Record<string, Construction> = {};
        data.forEach(c => {
          constructionMap[c.id] = c;
        });
        setConstructions(constructionMap);
      }
    };

    fetchConstructions();
  }, [constructionItems]);

  const isShipped = batch.status === 'shipped';

  const deleteBatch = async () => {
    try {
      const { error } = await supabase.from("delivery_batches").delete().eq("id", batch.id);
      if (error) throw error;
      onRefresh();
      toast({ title: "Batch deleted", description: "Delivery batch removed" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const markAsShipped = async () => {
    setMarkingShipped(true);
    try {
      const { error } = await supabase
        .from("delivery_batches")
        .update({ status: 'shipped' })
        .eq("id", batch.id);
      if (error) throw error;
      onRefresh();
      toast({ title: "Batch shipped", description: "Delivery batch marked as shipped" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setMarkingShipped(false);
    }
  };

  const undoShipment = async () => {
    setUndoingShipment(true);
    try {
      const { error } = await supabase
        .from("delivery_batches")
        .update({ status: 'preparing' })
        .eq("id", batch.id);
      if (error) throw error;
      onRefresh();
      toast({ title: "Shipment reverted", description: "Batch status changed back to preparing" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setUndoingShipment(false);
    }
  };

  // Count windows and doors
  const windowCount = constructionItems.filter(item => {
    const c = constructions[item.construction_id];
    return c && c.construction_type === 'window';
  }).reduce((sum, item) => sum + (constructions[item.construction_id]?.quantity || 1), 0);

  const doorCount = constructionItems.filter(item => {
    const c = constructions[item.construction_id];
    return c && (c.construction_type === 'door' || c.construction_type === 'sliding_door');
  }).reduce((sum, item) => sum + (constructions[item.construction_id]?.quantity || 1), 0);

  // Count shipping items with quantities
  const totalShippingQty = shippingItems.reduce((sum, item) => sum + item.quantity, 0) + 
    customShippingItems.reduce((sum, item) => sum + item.quantity, 0);

  // Get shipping summary
  const shippingSummary = [
    ...shippingItems.filter(i => i.quantity > 0).map(i => `${SHIPPING_ITEM_LABELS[i.item_type] || i.item_type}: ${i.quantity}`),
    ...customShippingItems.filter(i => i.quantity > 0).map(i => `${i.name}: ${i.quantity}`)
  ];

  // Get accessory counts from construction items
  const glassCount = constructionItems.filter(i => i.include_glass).length;
  const screensCount = constructionItems.filter(i => i.include_screens).length;
  const blindsCount = constructionItems.filter(i => i.include_blinds).length;
  const hardwareCount = constructionItems.filter(i => i.include_hardware).length;

  return (
    <Card className={`border-primary/20 ${isShipped ? 'bg-emerald-500/5 border-emerald-500/30' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {isShipped ? (
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
            )}
            <CardTitle className={`text-base ${isShipped ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
              Delivery #{batchNumber}
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {format(new Date(batch.delivery_date), "MMM dd, yyyy")}
            </span>
            {batch.delivery_person && (
              <Badge variant="outline" className="gap-1">
                <User className="h-3 w-3" />
                {batch.delivery_person}
              </Badge>
            )}
            {isShipped && (
              <Badge className="bg-emerald-500 hover:bg-emerald-500/90 text-white text-xs">Shipped</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {canEdit && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {isAdmin && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={deleteBatch}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-4 items-start">
          {/* Delivery Items Summary */}
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-emerald-500 shrink-0" />
            <div className="flex flex-wrap gap-1.5">
              {windowCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {windowCount} Window{windowCount !== 1 ? 's' : ''}
                </Badge>
              )}
              {doorCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {doorCount} Door{doorCount !== 1 ? 's' : ''}
                </Badge>
              )}
              {glassCount > 0 && (
                <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                  Glass: {glassCount}
                </Badge>
              )}
              {screensCount > 0 && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                  Screens: {screensCount}
                </Badge>
              )}
              {blindsCount > 0 && (
                <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">
                  Blinds: {blindsCount}
                </Badge>
              )}
              {hardwareCount > 0 && (
                <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                  Hardware: {hardwareCount}
                </Badge>
              )}
            </div>
          </div>

          {/* Shipping Items Summary */}
          {totalShippingQty > 0 && (
            <div className="flex items-center gap-2">
              <BoxIcon className="h-4 w-4 text-blue-500 shrink-0" />
              <span className="text-xs text-muted-foreground">
                {shippingSummary.slice(0, 3).join(' • ')}
                {shippingSummary.length > 3 && ` +${shippingSummary.length - 3} more`}
              </span>
            </div>
          )}
        </div>

        {/* Mark as Shipped / Undo Shipment Buttons */}
        {canEdit && (
          <div className="mt-3 pt-3 border-t">
            {!isShipped ? (
              <Button 
                onClick={markAsShipped} 
                disabled={markingShipped}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Truck className="h-4 w-4 mr-2" />
                {markingShipped ? "Marking..." : "Mark as Shipped"}
              </Button>
            ) : (
              <Button 
                onClick={undoShipment} 
                disabled={undoingShipment}
                size="sm"
                variant="outline"
                className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
              >
                <Undo2 className="h-4 w-4 mr-2" />
                {undoingShipment ? "Reverting..." : "Undo Shipment"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}