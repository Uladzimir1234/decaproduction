import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import { createAuditLog } from "@/lib/auditLog";
import { Truck, Package, AlertTriangle, CheckCircle2, Plus, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface DeliveryLog {
  id: string;
  order_id: string;
  delivery_date: string;
  items_delivered: string;
  notes: string | null;
  created_at: string;
}

interface DeliveryFulfillment {
  windows_delivered: boolean;
  doors_delivered: boolean;
  sliding_doors_delivered: boolean;
  screens_delivered_final: boolean;
  handles_delivered: boolean;
  glass_delivered_final: boolean;
  nailing_fins_delivered: boolean;
  brackets_delivered: boolean;
  delivery_notes: string | null;
}

interface OrderInfo {
  id: string;
  order_number: string;
  windows_count: number;
  doors_count: number;
  sliding_doors_count: number;
  has_sliding_doors: boolean;
  screen_type: string | null;
  delivery_complete: boolean;
}

interface DeliveryTrackingSectionProps {
  order: OrderInfo;
  fulfillment: DeliveryFulfillment | null;
  onUpdate: (key: string, value: any) => void;
  manufacturingProgress: number;
}

const DELIVERY_ITEMS = [
  { key: 'windows_delivered', label: 'Windows', icon: Package },
  { key: 'doors_delivered', label: 'Doors', icon: Package },
  { key: 'sliding_doors_delivered', label: 'Sliding Doors', icon: Package },
  { key: 'glass_delivered_final', label: 'Glass', icon: Package },
  { key: 'screens_delivered_final', label: 'Screens', icon: Package },
  { key: 'handles_delivered', label: 'Handles', icon: Package },
  { key: 'nailing_fins_delivered', label: 'Nailing Fins', icon: Package },
  { key: 'brackets_delivered', label: 'Installation Brackets', icon: Package },
] as const;

export function DeliveryTrackingSection({ 
  order, 
  fulfillment, 
  onUpdate,
  manufacturingProgress 
}: DeliveryTrackingSectionProps) {
  const { toast } = useToast();
  const { canUpdateManufacturing, isWorker, isSeller } = useRole();
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDeliveryDate, setNewDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDeliveryItems, setNewDeliveryItems] = useState("");
  const [newDeliveryNotes, setNewDeliveryNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDeliveryLogs();
  }, [order.id]);

  const fetchDeliveryLogs = async () => {
    const { data, error } = await supabase
      .from("order_delivery_log")
      .select("*")
      .eq("order_id", order.id)
      .order("delivery_date", { ascending: false });

    if (!error && data) {
      setDeliveryLogs(data as DeliveryLog[]);
    }
  };

  const addDeliveryLog = async () => {
    if (!newDeliveryItems.trim()) {
      toast({
        title: "Error",
        description: "Please specify what was delivered",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("order_delivery_log")
        .insert({
          order_id: order.id,
          delivery_date: newDeliveryDate,
          items_delivered: newDeliveryItems.trim(),
          notes: newDeliveryNotes.trim() || null,
          created_by: userData.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setDeliveryLogs([data as DeliveryLog, ...deliveryLogs]);
      
      await createAuditLog({
        action: 'delivery_logged',
        description: `Logged delivery for order #${order.order_number}: ${newDeliveryItems.trim()}`,
        entityType: 'order',
        entityId: order.id,
      });

      toast({
        title: "Delivery logged",
        description: "Delivery record added successfully"
      });

      setNewDeliveryDate(new Date().toISOString().split('T')[0]);
      setNewDeliveryItems("");
      setNewDeliveryNotes("");
      setDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to log delivery",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeliveryItemChange = async (key: string, checked: boolean) => {
    onUpdate(key, checked);
    
    await createAuditLog({
      action: 'delivery_item_updated',
      description: `Marked ${key.replace(/_/g, ' ')} as ${checked ? 'delivered' : 'not delivered'} for order #${order.order_number}`,
      entityType: 'order_fulfillment',
      entityId: order.id,
    });
  };

  const markOrderComplete = async () => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ delivery_complete: true })
        .eq("id", order.id);

      if (error) throw error;

      await createAuditLog({
        action: 'order_completed',
        description: `Marked order #${order.order_number} as complete`,
        entityType: 'order',
        entityId: order.id,
      });

      toast({
        title: "Order Complete",
        description: "Order has been marked as complete"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete order",
        variant: "destructive"
      });
    }
  };

  // Filter delivery items based on order
  const applicableItems = DELIVERY_ITEMS.filter(item => {
    if (item.key === 'sliding_doors_delivered' && !order.has_sliding_doors) return false;
    if (item.key === 'screens_delivered_final' && !order.screen_type) return false;
    return true;
  });

  // Calculate delivery progress
  const deliveredCount = applicableItems.filter(item => 
    fulfillment?.[item.key as keyof DeliveryFulfillment] === true
  ).length;
  const totalItems = applicableItems.length;
  const allDelivered = deliveredCount === totalItems;

  // Get pending items
  const pendingItems = applicableItems.filter(item => 
    fulfillment?.[item.key as keyof DeliveryFulfillment] !== true
  );

  const isLocked = manufacturingProgress < 90;
  const canEdit = canUpdateManufacturing && !isSeller;

  return (
    <Card className={`${isLocked ? 'opacity-60' : ''} border-primary/20`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Delivery Tracking</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={allDelivered ? "default" : "outline"} className={allDelivered ? "bg-emerald-500" : ""}>
              {deliveredCount}/{totalItems} Delivered
            </Badge>
            {isLocked && (
              <Badge variant="secondary" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Manufacturing {"<"}90%
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Track what has been delivered from this order
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delivery Items Checklist */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {applicableItems.map(item => {
            const isChecked = fulfillment?.[item.key as keyof DeliveryFulfillment] === true;
            return (
              <div 
                key={item.key}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  isChecked 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : 'bg-card border-border'
                }`}
              >
                <Checkbox
                  id={item.key}
                  checked={isChecked}
                  onCheckedChange={(checked) => handleDeliveryItemChange(item.key, checked as boolean)}
                  disabled={isLocked || !canEdit}
                />
                <Label 
                  htmlFor={item.key} 
                  className={`text-sm cursor-pointer ${isChecked ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                >
                  {item.label}
                </Label>
              </div>
            );
          })}
        </div>

        {/* Pending Delivery Warning */}
        {pendingItems.length > 0 && !isLocked && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Pending Delivery ({pendingItems.length} items)
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {pendingItems.map(i => i.label).join(', ')} still need to be delivered
              </p>
            </div>
          </div>
        )}

        {/* Delivery Notes */}
        <div className="space-y-2">
          <Label>Delivery Notes</Label>
          <Textarea
            placeholder="Add notes about pending deliveries, special instructions, etc."
            value={fulfillment?.delivery_notes || ''}
            onChange={(e) => onUpdate('delivery_notes', e.target.value)}
            disabled={isLocked || !canEdit}
            className="resize-none"
            rows={2}
          />
        </div>

        <Separator />

        {/* Delivery History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Delivery History
            </h4>
            {canEdit && !isLocked && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    Log Delivery
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Log Delivery</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Delivery Date</Label>
                      <Input
                        type="date"
                        value={newDeliveryDate}
                        onChange={(e) => setNewDeliveryDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Items Delivered</Label>
                      <Input
                        placeholder="e.g., 5 windows, 2 doors, handles"
                        value={newDeliveryItems}
                        onChange={(e) => setNewDeliveryItems(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes (optional)</Label>
                      <Textarea
                        placeholder="Any additional notes about this delivery"
                        value={newDeliveryNotes}
                        onChange={(e) => setNewDeliveryNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <Button 
                      onClick={addDeliveryLog} 
                      disabled={saving || !newDeliveryItems.trim()}
                      className="w-full"
                    >
                      {saving ? "Saving..." : "Log Delivery"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {deliveryLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No deliveries logged yet
            </p>
          ) : (
            <div className="space-y-2">
              {deliveryLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  <Package className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {format(new Date(log.delivery_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{log.items_delivered}</p>
                    {log.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{log.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mark Complete Button */}
        {allDelivered && !order.delivery_complete && canEdit && (
          <Button 
            onClick={markOrderComplete}
            className="w-full gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark Order Complete
          </Button>
        )}

        {order.delivery_complete && (
          <div className="flex items-center justify-center gap-2 py-4 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Order Complete</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}