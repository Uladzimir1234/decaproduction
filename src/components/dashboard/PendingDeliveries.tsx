import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, AlertTriangle } from "lucide-react";

export interface PendingDeliveryOrder {
  id: string;
  order_number: string;
  customer_name: string;
  daysUntilDelivery: number;
  deliveredCount: number;
  totalItems: number;
  pendingItems: string[];
  manufacturingProgress: number;
}

interface PendingDeliveriesProps {
  orders: PendingDeliveryOrder[];
}

export function PendingDeliveries({ orders }: PendingDeliveriesProps) {
  if (orders.length === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Pending Deliveries</CardTitle>
          </div>
          <Badge variant="outline" className="border-primary/50">
            {orders.length} order{orders.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <CardDescription>
          Orders with manufacturing complete but items still to deliver
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
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {order.deliveredCount}/{order.totalItems} delivered
                    </Badge>
                    {order.daysUntilDelivery <= 3 && (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {order.daysUntilDelivery <= 0 ? 'Overdue' : `${order.daysUntilDelivery}d left`}
                      </Badge>
                    )}
                  </div>
                  {order.pendingItems.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {order.pendingItems.slice(0, 4).map((item) => (
                        <Badge 
                          key={item} 
                          variant="secondary" 
                          className="text-xs py-0 px-1.5"
                        >
                          {item}
                        </Badge>
                      ))}
                      {order.pendingItems.length > 4 && (
                        <Badge variant="secondary" className="text-xs py-0 px-1.5">
                          +{order.pendingItems.length - 4} more
                        </Badge>
                      )}
                    </div>
                  )}
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