import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Truck, 
  Package,
  TrendingUp,
  LayoutGrid
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { MetricsStrip } from "@/components/dashboard/MetricsStrip";
import { PriorityOrderCard } from "@/components/dashboard/PriorityOrderCard";
import { ComponentProcurement } from "@/components/dashboard/ComponentProcurement";
import { ManufacturingWorkload } from "@/components/dashboard/ManufacturingWorkload";
import { BlockersList } from "@/components/dashboard/BlockersList";
import { PendingDeliveries, type PendingDeliveryOrder } from "@/components/dashboard/PendingDeliveries";

export default function Dashboard() {
  const { orders, metrics, componentSummary, manufacturingWorkload, loading } = useDashboardData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Categorize orders
  const criticalOrders = orders.filter(o => o.healthStatus === 'critical');
  const atRiskOrders = orders.filter(o => o.healthStatus === 'at-risk');
  const readyToShip = orders.filter(o => o.manufacturingProgress >= 90 && o.healthStatus !== 'critical');
  const topPriorityOrders = orders.slice(0, 6);
  
  // Pending deliveries - orders with 90%+ manufacturing but items still to deliver
  const pendingDeliveryOrders: PendingDeliveryOrder[] = orders
    .filter(o => o.manufacturingProgress >= 90 && o.deliveryProgress.deliveredCount < o.deliveryProgress.totalItems)
    .map(o => ({
      id: o.id,
      order_number: o.order_number,
      customer_name: o.customer_name,
      daysUntilDelivery: o.daysUntilDelivery,
      deliveredCount: o.deliveryProgress.deliveredCount,
      totalItems: o.deliveryProgress.totalItems,
      pendingItems: o.deliveryProgress.pendingItems,
      manufacturingProgress: o.manufacturingProgress,
    }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manufacturing Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of {metrics.totalActive} active order{metrics.totalActive !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/orders">
            <Button variant="outline" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              All Orders
            </Button>
          </Link>
          <Link to="/orders/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Strip */}
      <MetricsStrip metrics={metrics} />

      {/* Critical Orders Alert */}
      {criticalOrders.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-lg text-destructive">Critical - Immediate Attention Required</CardTitle>
              </div>
              <Badge variant="destructive">{criticalOrders.length}</Badge>
            </div>
            <CardDescription>
              Orders overdue or due very soon with low progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {criticalOrders.map((order) => (
                <PriorityOrderCard key={order.id} order={order} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Top Priority Orders */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Priority Queue</CardTitle>
                </div>
                <Badge variant="outline">{orders.length} orders</Badge>
              </div>
              <CardDescription>
                Orders ranked by priority score (time, progress, complexity)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topPriorityOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No active orders</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {topPriorityOrders.map((order) => (
                    <PriorityOrderCard key={order.id} order={order} />
                  ))}
                  {orders.length > 6 && (
                    <Link to="/orders" className="block text-center py-2 text-sm text-primary hover:underline">
                      View all {orders.length} orders
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Blockers List */}
          <BlockersList orders={orders} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Component Procurement */}
          <ComponentProcurement summary={componentSummary} />

          {/* Manufacturing Workload */}
          <ManufacturingWorkload workload={manufacturingWorkload} />

          {/* Pending Deliveries */}
          <PendingDeliveries orders={pendingDeliveryOrders} />

          {/* Ready to Ship */}
          {readyToShip.length > 0 && (
            <Card className="border-success/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-success" />
                    <CardTitle className="text-lg">Ready to Ship</CardTitle>
                  </div>
                  <Badge variant="outline" className="border-success/50 text-success">
                    {readyToShip.length}
                  </Badge>
                </div>
                <CardDescription>
                  Orders with 90%+ manufacturing progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {readyToShip.slice(0, 3).map((order) => (
                    <Link
                      key={order.id}
                      to={`/orders/${order.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border bg-success/5 hover:bg-success/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <div>
                          <span className="font-mono text-sm font-semibold">#{order.order_number}</span>
                          <p className="text-xs text-muted-foreground">{order.customer_name}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-success/30 text-success">
                        {order.manufacturingProgress}%
                      </Badge>
                    </Link>
                  ))}
                  {readyToShip.length > 3 && (
                    <Link to="/orders" className="block text-center py-2 text-sm text-primary hover:underline">
                      +{readyToShip.length - 3} more ready
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* At Risk Section */}
      {atRiskOrders.length > 0 && criticalOrders.length === 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <CardTitle className="text-lg">At Risk Orders</CardTitle>
              </div>
              <Badge variant="outline" className="border-warning/50 text-warning">
                {atRiskOrders.length}
              </Badge>
            </div>
            <CardDescription>
              Orders that may miss their delivery date without attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {atRiskOrders.slice(0, 6).map((order) => (
                <PriorityOrderCard key={order.id} order={order} showDetails={false} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {orders.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">No active orders. Create your first order to get started.</p>
            <Link to="/orders/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Order
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
