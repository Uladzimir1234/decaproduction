import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressCircle } from "@/components/ui/progress-circle";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, ClipboardList, Users, Clock, TrendingUp } from "lucide-react";

interface DashboardStats {
  totalOrders: number;
  totalCustomers: number;
  ordersByAge: { [key: string]: number };
  ordersByFulfillment: { [key: string]: number };
  recentOrders: Array<{
    id: string;
    order_number: string;
    customer_name: string;
    delivery_date: string;
    fulfillment_percentage: number;
  }>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalCustomers: 0,
    ordersByAge: {},
    ordersByFulfillment: {},
    recentOrders: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch customers
      const { data: customers, error: customersError } = await supabase
        .from("customers")
        .select("id");

      if (customersError) throw customersError;

      const now = new Date();
      const ordersByAge: { [key: string]: number } = {
        "30": 0,
        "40": 0,
        "50": 0,
        "60": 0,
        "70": 0,
        "80+": 0,
      };

      const ordersByFulfillment: { [key: string]: number } = {
        "20-40": 0,
        "40-60": 0,
        "60-80": 0,
        "80-90": 0,
        "90+": 0,
      };

      orders?.forEach((order) => {
        const orderDate = new Date(order.order_date);
        const daysOld = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysOld >= 80) ordersByAge["80+"]++;
        else if (daysOld >= 70) ordersByAge["70"]++;
        else if (daysOld >= 60) ordersByAge["60"]++;
        else if (daysOld >= 50) ordersByAge["50"]++;
        else if (daysOld >= 40) ordersByAge["40"]++;
        else if (daysOld >= 30) ordersByAge["30"]++;

        const fulfillment = order.fulfillment_percentage || 0;
        if (fulfillment >= 90) ordersByFulfillment["90+"]++;
        else if (fulfillment >= 80) ordersByFulfillment["80-90"]++;
        else if (fulfillment >= 60) ordersByFulfillment["60-80"]++;
        else if (fulfillment >= 40) ordersByFulfillment["40-60"]++;
        else if (fulfillment >= 20) ordersByFulfillment["20-40"]++;
      });

      setStats({
        totalOrders: orders?.length || 0,
        totalCustomers: customers?.length || 0,
        ordersByAge,
        ordersByFulfillment,
        recentOrders: orders?.slice(0, 5).map((order) => ({
          id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          delivery_date: order.delivery_date,
          fulfillment_percentage: order.fulfillment_percentage || 0,
        })) || [],
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilDelivery = (deliveryDate: string) => {
    const delivery = new Date(deliveryDate);
    const now = new Date();
    const diff = Math.ceil((delivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getDeliveryStatus = (days: number) => {
    if (days < 0) return "complete";
    if (days <= 7) return "partial";
    return "not_started";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Manufacturing order overview</p>
        </div>
        <Link to="/orders/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Order
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.ordersByFulfillment["20-40"] + stats.ordersByFulfillment["40-60"] + stats.ordersByFulfillment["60-80"]}
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Near Complete</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.ordersByFulfillment["80-90"] + stats.ordersByFulfillment["90+"]}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Orders by Age */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Orders by Age (Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap justify-center gap-6">
              {Object.entries(stats.ordersByAge).map(([days, count]) => (
                <ProgressCircle
                  key={days}
                  value={stats.totalOrders > 0 ? (count / stats.totalOrders) * 100 : 0}
                  size="md"
                  label={`${days} days`}
                  colorVariant={parseInt(days) >= 60 ? "danger" : parseInt(days) >= 40 ? "warning" : "success"}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Orders by Fulfillment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Orders by Fulfillment %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap justify-center gap-6">
              {Object.entries(stats.ordersByFulfillment).map(([range, count]) => (
                <ProgressCircle
                  key={range}
                  value={stats.totalOrders > 0 ? (count / stats.totalOrders) * 100 : 0}
                  size="md"
                  label={`${range}%`}
                  colorVariant={
                    range === "90+" || range === "80-90" ? "success" :
                    range === "60-80" ? "info" :
                    "warning"
                  }
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Orders</CardTitle>
          <Link to="/orders">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {stats.recentOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No orders yet.</p>
              <Link to="/orders/new">
                <Button variant="link" className="mt-2">Create your first order</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentOrders.map((order) => {
                const daysUntil = getDaysUntilDelivery(order.delivery_date);
                return (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-medium">
                          #{order.order_number}
                        </span>
                        <span className="text-muted-foreground truncate">
                          {order.customer_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge
                          status={getDeliveryStatus(daysUntil)}
                          label={daysUntil < 0 ? "Overdue" : `${daysUntil} days`}
                        />
                      </div>
                    </div>
                    <ProgressCircle
                      value={order.fulfillment_percentage}
                      size="sm"
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
