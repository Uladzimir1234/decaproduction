import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ArrowRight, Clock } from 'lucide-react';
import type { PriorityOrder } from '@/hooks/useDashboardData';

interface BlockersListProps {
  orders: PriorityOrder[];
}

export function BlockersList({ orders }: BlockersListProps) {
  // Filter to orders with blockers, sorted by priority
  const blockedOrders = orders
    .filter(o => o.blockers.length > 0)
    .slice(0, 5);

  if (blockedOrders.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-lg">Action Required</CardTitle>
        </div>
        <CardDescription>
          Orders with blockers that need attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {blockedOrders.map((order) => (
          <Link
            key={order.id}
            to={`/orders/${order.id}`}
            className="block p-3 rounded-lg border bg-card hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">
                    #{order.order_number}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    order.daysUntilDelivery <= 0 ? 'bg-destructive/10 text-destructive' :
                    order.daysUntilDelivery <= 7 ? 'bg-warning/10 text-warning' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    <Clock className="h-3 w-3 inline mr-1" />
                    {order.daysUntilDelivery <= 0 ? 'Overdue' : `${order.daysUntilDelivery}d`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {order.customer_name}
                </p>
              </div>
              
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </div>
            
            <div className="flex flex-wrap gap-1 mt-2">
              {order.blockers.slice(0, 3).map((blocker, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-[10px] py-0 px-1.5 border-destructive/30 text-destructive"
                >
                  {blocker}
                </Badge>
              ))}
              {order.blockers.length > 3 && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                  +{order.blockers.length - 3} more
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1 mt-2 text-xs text-primary">
              <ArrowRight className="h-3 w-3" />
              {order.nextAction}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
