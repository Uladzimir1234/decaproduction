import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, AlertTriangle, Clock, CheckCircle2, ArrowRight } from "lucide-react";

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  delivery_date: string;
  order_date: string;
  fulfillment_percentage: number;
}

interface DashboardData {
  urgentOrders: Order[];
  inProgressOrders: Order[];
  nearCompleteOrders: Order[];
  completedOrders: Order[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({
    urgentOrders: [],
    inProgressOrders: [],
    nearCompleteOrders: [],
    completedOrders: [],
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
      const urgent: Order[] = [];
      const inProgress: Order[] = [];
      const nearComplete: Order[] = [];
      const completed: Order[] = [];

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
        };

        // Categorize by urgency and fulfillment
        if (fulfillment >= 100) {
          completed.push(mappedOrder);
        } else if (daysUntil <= 7 && fulfillment < 80) {
          urgent.push(mappedOrder);
        } else if (fulfillment >= 80) {
          nearComplete.push(mappedOrder);
        } else {
          inProgress.push(mappedOrder);
        }
      });

      setData({
        urgentOrders: urgent,
        inProgressOrders: inProgress,
        nearCompleteOrders: nearComplete,
        completedOrders: completed,
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

  const OrderCard = ({ order, showUrgency = false }: { order: Order; showUrgency?: boolean }) => {
    const daysUntil = getDaysUntilDelivery(order.delivery_date);
    const isOverdue = daysUntil < 0;

    return (
      <Link
        to={`/orders/${order.id}`}
        className="block group"
      >
        <div className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
          showUrgency 
            ? "border-destructive/30 bg-destructive/5 hover:border-destructive/50" 
            : "bg-card hover:border-primary/30"
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-semibold">
                  #{order.order_number}
                </span>
                {showUrgency && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">
                    {isOverdue ? "Overdue" : `${daysUntil}d left`}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {order.customer_name}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold">{order.fulfillment_percentage}%</p>
              <p className="text-xs text-muted-foreground">
                Due {formatDate(order.delivery_date)}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <Progress 
              value={order.fulfillment_percentage} 
              className="h-2"
            />
          </div>
        </div>
      </Link>
    );
  };

  const totalActive = data.urgentOrders.length + data.inProgressOrders.length + data.nearCompleteOrders.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fulfillment Overview</h1>
          <p className="text-muted-foreground">
            {totalActive} active order{totalActive !== 1 ? "s" : ""} in progress
          </p>
        </div>
        <Link to="/orders/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Order
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className={data.urgentOrders.length > 0 ? "border-destructive/30 bg-destructive/5" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${data.urgentOrders.length > 0 ? "bg-destructive/10" : "bg-muted"}`}>
                <AlertTriangle className={`h-5 w-5 ${data.urgentOrders.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.urgentOrders.length}</p>
                <p className="text-xs text-muted-foreground">Needs Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.inProgressOrders.length}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <ArrowRight className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.nearCompleteOrders.length}</p>
                <p className="text-xs text-muted-foreground">Near Complete</p>
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
                <p className="text-2xl font-bold">{data.completedOrders.length}</p>
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
              <CardTitle className="text-lg">Needs Attention</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Orders due within 7 days with less than 80% fulfillment
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.urgentOrders.map((order) => (
                <OrderCard key={order.id} order={order} showUrgency />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* In Progress & Near Complete */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* In Progress */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                In Progress
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {data.inProgressOrders.length} order{data.inProgressOrders.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link to="/orders">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.inProgressOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No orders in progress
              </p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {data.inProgressOrders.slice(0, 5).map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
                {data.inProgressOrders.length > 5 && (
                  <Link to="/orders" className="block text-center py-2 text-sm text-primary hover:underline">
                    +{data.inProgressOrders.length - 5} more orders
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Near Complete */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-info" />
                Near Complete
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                80%+ fulfillment
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {data.nearCompleteOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No orders near completion
              </p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {data.nearCompleteOrders.slice(0, 5).map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
                {data.nearCompleteOrders.length > 5 && (
                  <Link to="/orders" className="block text-center py-2 text-sm text-primary hover:underline">
                    +{data.nearCompleteOrders.length - 5} more orders
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {totalActive === 0 && data.completedOrders.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
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
