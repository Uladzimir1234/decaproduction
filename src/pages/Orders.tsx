import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Search, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  order_date: string;
  delivery_date: string;
  fulfillment_percentage: number;
  windows_count: number;
  doors_count: number;
  sliding_doors_count: number;
}
export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  useEffect(() => {
    fetchOrders();
  }, []);
  const fetchOrders = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("orders").select("*").order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };
  const getDaysUntilDelivery = (deliveryDate: string) => {
    const delivery = new Date(deliveryDate);
    const now = new Date();
    return Math.ceil((delivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };
  const getTimePercentage = (orderDate: string, deliveryDate: string) => {
    const order = new Date(orderDate);
    const delivery = new Date(deliveryDate);
    const now = new Date();
    const total = delivery.getTime() - order.getTime();
    const elapsed = now.getTime() - order.getTime();
    const remaining = Math.max(0, Math.min(100, 100 - elapsed / total * 100));
    return remaining;
  };
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) || order.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "complete") return matchesSearch && order.fulfillment_percentage >= 90;
    if (statusFilter === "in_progress") return matchesSearch && order.fulfillment_percentage >= 20 && order.fulfillment_percentage < 90;
    if (statusFilter === "not_started") return matchesSearch && order.fulfillment_percentage < 20;
    return matchesSearch;
  });
  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading orders...</div>
      </div>;
  }
  return <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Manage manufacturing orders</p>
        </div>
        <Link to="/orders/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Order
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by order number or customer..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? <div className="text-center py-12 text-muted-foreground">
              <p>No orders found.</p>
              {orders.length === 0 && <Link to="/orders/new">
                  <Button variant="link" className="mt-2">Create your first order</Button>
                </Link>}
            </div> : <div className="space-y-3">
              {filteredOrders.map(order => {
            const daysUntil = getDaysUntilDelivery(order.delivery_date);
            const timeLeft = getTimePercentage(order.order_date, order.delivery_date);
            return <Link key={order.id} to={`/orders/${order.id}`} className="block p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-sm font-semibold bg-muted px-2 py-1 rounded">
                            #{order.order_number}
                          </span>
                          <span className="font-medium truncate">
                            {order.customer_name}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span>{order.windows_count} Windows</span>
                          <span>•</span>
                          <span>{order.doors_count} Doors</span>
                          {order.sliding_doors_count > 0 && <>
                              <span>•</span>
                              <span>{order.sliding_doors_count} Sliding</span>
                            </>}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 min-w-[120px]">
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Fulfillment</span>
                            <span className="font-medium">{order.fulfillment_percentage}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{
                        width: `${order.fulfillment_percentage}%`
                      }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Time Left</span>
                            <span className={`font-medium ${daysUntil < 0 ? 'text-destructive' : ''}`}>
                              {daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d`}
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${timeLeft < 20 ? 'bg-destructive' : timeLeft < 50 ? 'bg-amber-500' : 'bg-sky-500'}`} style={{
                        width: `${Math.max(0, timeLeft)}%`
                      }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>;
          })}
            </div>}
        </CardContent>
      </Card>
    </div>;
}