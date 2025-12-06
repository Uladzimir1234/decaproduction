import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Truck, 
  ShoppingCart, 
  Wrench,
  Package,
  AlertCircle
} from "lucide-react";

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  delivery_date: string;
  order_date: string;
  fulfillment_percentage: number;
  windows_count: number;
  doors_count: number;
  // Component status
  reinforcement_status: string | null;
  windows_profile_status: string | null;
  glass_status: string | null;
  screens_status: string | null;
  plisse_screens_status: string | null;
  nail_fins_status: string | null;
  hardware_status: string | null;
}

interface DashboardData {
  orderingStage: Order[];
  manufacturingStage: Order[];
  readyToDeliver: Order[];
  completed: Order[];
  urgentOrders: Order[];
}

const getNotOrderedCount = (order: Order) => {
  let count = 0;
  if (order.reinforcement_status === 'not_ordered') count++;
  if (order.windows_profile_status === 'not_ordered') count++;
  if (order.glass_status === 'not_ordered') count++;
  if (order.screens_status === 'not_ordered') count++;
  if (order.plisse_screens_status === 'not_ordered') count++;
  if (order.nail_fins_status === 'not_ordered') count++;
  if (order.hardware_status === 'not_ordered') count++;
  return count;
};

const getOrderedCount = (order: Order) => {
  let count = 0;
  if (order.reinforcement_status === 'ordered') count++;
  if (order.windows_profile_status === 'ordered') count++;
  if (order.glass_status === 'ordered') count++;
  if (order.screens_status === 'ordered') count++;
  if (order.plisse_screens_status === 'ordered') count++;
  if (order.nail_fins_status === 'ordered') count++;
  if (order.hardware_status === 'ordered') count++;
  return count;
};

const getAvailableCount = (order: Order) => {
  let count = 0;
  if (order.reinforcement_status === 'available') count++;
  if (order.windows_profile_status === 'available') count++;
  if (order.glass_status === 'available') count++;
  if (order.screens_status === 'available') count++;
  if (order.plisse_screens_status === 'available') count++;
  if (order.nail_fins_status === 'available') count++;
  if (order.hardware_status === 'available') count++;
  return count;
};

const allComponentsAvailable = (order: Order) => {
  return getAvailableCount(order) === 7;
};

const hasComponentsToOrder = (order: Order) => {
  return getNotOrderedCount(order) > 0 || getOrderedCount(order) > 0;
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({
    orderingStage: [],
    manufacturingStage: [],
    readyToDeliver: [],
    completed: [],
    urgentOrders: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .order("delivery_date", { ascending: true });

      if (error) throw error;

      const now = new Date();
      const ordering: Order[] = [];
      const manufacturing: Order[] = [];
      const ready: Order[] = [];
      const completed: Order[] = [];
      const urgent: Order[] = [];

      orders?.forEach((order) => {
        const deliveryDate = new Date(order.delivery_date);
        const daysUntil = Math.ceil(
          (deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        const fulfillment = order.fulfillment_percentage || 0;

        const mappedOrder: Order = {
          id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          delivery_date: order.delivery_date,
          order_date: order.order_date,
          fulfillment_percentage: fulfillment,
          windows_count: order.windows_count || 0,
          doors_count: order.doors_count || 0,
          reinforcement_status: order.reinforcement_status,
          windows_profile_status: order.windows_profile_status,
          glass_status: order.glass_status,
          screens_status: order.screens_status,
          plisse_screens_status: order.plisse_screens_status,
          nail_fins_status: order.nail_fins_status,
          hardware_status: order.hardware_status,
        };

        // Check if urgent (due within 7 days and not complete)
        if (daysUntil <= 7 && fulfillment < 100) {
          urgent.push(mappedOrder);
        }

        // Categorize by stage
        if (fulfillment >= 100) {
          completed.push(mappedOrder);
        } else if (fulfillment >= 90 && allComponentsAvailable(mappedOrder)) {
          ready.push(mappedOrder);
        } else if (hasComponentsToOrder(mappedOrder)) {
          ordering.push(mappedOrder);
        } else {
          manufacturing.push(mappedOrder);
        }
      });

      setData({
        orderingStage: ordering,
        manufacturingStage: manufacturing,
        readyToDeliver: ready,
        completed: completed,
        urgentOrders: urgent,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilDelivery = (deliveryDate: string) => {
    const delivery = new Date(deliveryDate);
    const now = new Date();
    return Math.ceil((delivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const OrderCard = ({ order, variant = "default" }: { order: Order; variant?: "default" | "urgent" | "ordering" | "ready" }) => {
    const daysUntil = getDaysUntilDelivery(order.delivery_date);
    const isOverdue = daysUntil < 0;
    const notOrderedCount = getNotOrderedCount(order);
    const orderedCount = getOrderedCount(order);

    const borderClass = {
      default: "bg-card hover:border-primary/30",
      urgent: "border-destructive/30 bg-destructive/5 hover:border-destructive/50",
      ordering: "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50",
      ready: "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50",
    }[variant];

    return (
      <Link to={`/orders/${order.id}`} className="block group">
        <div className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${borderClass}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-semibold">#{order.order_number}</span>
                {variant === "urgent" && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">
                    {isOverdue ? "Overdue" : `${daysUntil}d left`}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{order.customer_name}</p>
              {variant === "ordering" && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {notOrderedCount > 0 && (
                    <Badge variant="destructive" className="text-xs py-0 px-1.5">
                      {notOrderedCount} not ordered
                    </Badge>
                  )}
                  {orderedCount > 0 && (
                    <Badge variant="outline" className="text-xs py-0 px-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400">
                      {orderedCount} ordered
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold">{order.fulfillment_percentage}%</p>
              <p className="text-xs text-muted-foreground">Due {formatDate(order.delivery_date)}</p>
            </div>
          </div>
          <div className="mt-3">
            <Progress value={order.fulfillment_percentage} className="h-2" />
          </div>
        </div>
      </Link>
    );
  };

  const totalActive = data.orderingStage.length + data.manufacturingStage.length + data.readyToDeliver.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manufacturing Dashboard</h1>
          <p className="text-muted-foreground">
            {totalActive} active order{totalActive !== 1 ? "s" : ""} across all stages
          </p>
        </div>
        <Link to="/orders/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Order
          </Button>
        </Link>
      </div>

      {/* Stage Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className={data.urgentOrders.length > 0 ? "border-destructive/30 bg-destructive/5" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${data.urgentOrders.length > 0 ? "bg-destructive/10" : "bg-muted"}`}>
                <AlertTriangle className={`h-5 w-5 ${data.urgentOrders.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.urgentOrders.length}</p>
                <p className="text-xs text-muted-foreground">Urgent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={data.orderingStage.length > 0 ? "border-amber-500/30 bg-amber-500/5" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${data.orderingStage.length > 0 ? "bg-amber-500/10" : "bg-muted"}`}>
                <ShoppingCart className={`h-5 w-5 ${data.orderingStage.length > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.orderingStage.length}</p>
                <p className="text-xs text-muted-foreground">Ordering</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500/10">
                <Wrench className="h-5 w-5 text-sky-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.manufacturingStage.length}</p>
                <p className="text-xs text-muted-foreground">Manufacturing</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={data.readyToDeliver.length > 0 ? "border-emerald-500/30 bg-emerald-500/5" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${data.readyToDeliver.length > 0 ? "bg-emerald-500/10" : "bg-muted"}`}>
                <Truck className={`h-5 w-5 ${data.readyToDeliver.length > 0 ? "text-emerald-500" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.readyToDeliver.length}</p>
                <p className="text-xs text-muted-foreground">Ready to Ship</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.completed.length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Orders */}
      {data.urgentOrders.length > 0 && (
        <Card className="border-destructive/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-lg">Urgent - Needs Immediate Attention</CardTitle>
            </div>
            <CardDescription>Orders due within 7 days that are not yet complete</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.urgentOrders.map((order) => (
                <OrderCard key={order.id} order={order} variant="urgent" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Stages Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ordering Stage */}
        <Card className="border-amber-500/20">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-amber-500" />
                Ordering Stage
              </CardTitle>
              <CardDescription className="mt-1">
                Components need to be ordered or are waiting
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
              {data.orderingStage.length}
            </Badge>
          </CardHeader>
          <CardContent>
            {data.orderingStage.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No orders waiting for components</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {data.orderingStage.slice(0, 5).map((order) => (
                  <OrderCard key={order.id} order={order} variant="ordering" />
                ))}
                {data.orderingStage.length > 5 && (
                  <Link to="/orders" className="block text-center py-2 text-sm text-primary hover:underline">
                    +{data.orderingStage.length - 5} more orders
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manufacturing Stage */}
        <Card className="border-sky-500/20">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="h-5 w-5 text-sky-500" />
                Manufacturing Stage
              </CardTitle>
              <CardDescription className="mt-1">
                All components available, manufacturing in progress
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-sky-500/50 text-sky-600 dark:text-sky-400">
              {data.manufacturingStage.length}
            </Badge>
          </CardHeader>
          <CardContent>
            {data.manufacturingStage.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No orders in manufacturing</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {data.manufacturingStage.slice(0, 5).map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
                {data.manufacturingStage.length > 5 && (
                  <Link to="/orders" className="block text-center py-2 text-sm text-primary hover:underline">
                    +{data.manufacturingStage.length - 5} more orders
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ready to Deliver */}
      <Card className="border-emerald-500/20">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-500" />
              Ready to Deliver
            </CardTitle>
            <CardDescription className="mt-1">
              Orders with 90%+ fulfillment, ready for shipping
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400">
            {data.readyToDeliver.length}
          </Badge>
        </CardHeader>
        <CardContent>
          {data.readyToDeliver.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No orders ready to deliver</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.readyToDeliver.map((order) => (
                <OrderCard key={order.id} order={order} variant="ready" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Orders */}
      {data.completed.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Recently Completed
              </CardTitle>
              <CardDescription className="mt-1">
                Orders with 100% fulfillment
              </CardDescription>
            </div>
            <Link to="/orders">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.completed.slice(0, 4).map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
            {data.completed.length > 4 && (
              <Link to="/orders" className="block text-center py-2 text-sm text-primary hover:underline mt-2">
                +{data.completed.length - 4} more completed orders
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {totalActive === 0 && data.completed.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">No orders yet. Create your first order to get started.</p>
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
