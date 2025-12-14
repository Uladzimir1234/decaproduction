import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, AlertTriangle, PackageCheck, Send } from "lucide-react";

export interface PendingDeliveryOrder {
  id: string;
  order_number: string;
  customer_name: string;
  daysUntilDelivery: number;
  // Batch-based delivery
  batchesPreparing: number;
  batchesShipped: number;
  batchesDelivered: number;
  totalBatches: number;
  manufacturingProgress: number;
}

interface PendingDeliveriesProps {
  orders: PendingDeliveryOrder[];
}

export function PendingDeliveries({ orders }: PendingDeliveriesProps) {
  if (orders.length === 0) return null;

  // Calculate totals
  const totalPreparing = orders.reduce((sum, o) => sum + o.batchesPreparing, 0);
  const totalShipped = orders.reduce((sum, o) => sum + o.batchesShipped, 0);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Pending Deliveries</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {totalPreparing > 0 && (
              <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
                {totalPreparing} preparing
              </Badge>
            )}
            {totalShipped > 0 && (
              <Badge variant="outline" className="border-info/50 text-info">
                {totalShipped} in transit
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Orders with delivery batches pending
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="block p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-semibold">#{order.order_number}</span>
                    <span className="text-sm text-muted-foreground truncate">
                      {order.customer_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {order.batchesPreparing > 0 && (
                      <Badge variant="outline" className="text-xs gap-1 border-amber-500/50 text-amber-600">
                        <PackageCheck className="h-3 w-3" />
                        {order.batchesPreparing} preparing
                      </Badge>
                    )}
                    {order.batchesShipped > 0 && (
                      <Badge variant="outline" className="text-xs gap-1 border-info/50 text-info">
                        <Send className="h-3 w-3" />
                        {order.batchesShipped} in transit
                      </Badge>
                    )}
                    {order.batchesDelivered > 0 && (
                      <Badge variant="outline" className="text-xs gap-1 border-success/50 text-success">
                        {order.batchesDelivered} delivered
                      </Badge>
                    )}
                    {order.daysUntilDelivery <= 3 && (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {order.daysUntilDelivery <= 0 ? 'Overdue' : `${order.daysUntilDelivery}d left`}
                      </Badge>
                    )}
                  </div>
                </div>
                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
