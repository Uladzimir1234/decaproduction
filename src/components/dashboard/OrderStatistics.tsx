import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertCircle, TrendingUp, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Order {
  id: string;
  order_date: string;
  fulfillment_percentage: number;
  delivery_complete: boolean;
}

interface OrderStatisticsProps {
  orders: Order[];
}

// Age buckets in days
const AGE_BUCKETS = [
  { label: "0-30 days", min: 0, max: 30 },
  { label: "31-40 days", min: 31, max: 40 },
  { label: "41-50 days", min: 41, max: 50 },
  { label: "51-60 days", min: 51, max: 60 },
  { label: "61-70 days", min: 61, max: 70 },
  { label: "70+ days", min: 70, max: Infinity },
];

// Completion buckets in percentage
const COMPLETION_BUCKETS = [
  { label: "0-20%", min: 0, max: 20 },
  { label: "20-40%", min: 20, max: 40 },
  { label: "40-60%", min: 40, max: 60 },
  { label: "60-80%", min: 60, max: 80 },
  { label: "80-90%", min: 80, max: 90 },
  { label: "90-100%", min: 90, max: 100 },
];

// Color progression for age (blue to red for urgency)
const AGE_COLORS = [
  "bg-blue-400",
  "bg-blue-500",
  "bg-amber-400",
  "bg-amber-500",
  "bg-orange-500",
  "bg-red-500",
];

// Color progression for completion (orange to green for progress)
const COMPLETION_COLORS = [
  "bg-orange-500",
  "bg-orange-400",
  "bg-amber-400",
  "bg-yellow-400",
  "bg-lime-400",
  "bg-green-500",
];

function getOrderAgeInDays(orderDate: string): number {
  const order = new Date(orderDate);
  const now = new Date();
  return Math.floor((now.getTime() - order.getTime()) / (1000 * 60 * 60 * 24));
}

export function OrderStatistics({ orders }: OrderStatisticsProps) {
  // Only count active orders (not delivery_complete)
  const activeOrders = orders.filter(o => !o.delivery_complete);
  const totalActive = activeOrders.length;
  
  // Calculate orders by age
  const ordersByAge = AGE_BUCKETS.map((bucket, index) => {
    const count = activeOrders.filter(order => {
      const age = getOrderAgeInDays(order.order_date);
      if (bucket.max === Infinity) {
        return age >= bucket.min;
      }
      return age >= bucket.min && age < bucket.max + 1;
    }).length;
    
    return {
      ...bucket,
      count,
      color: AGE_COLORS[index],
      percentage: totalActive > 0 ? (count / totalActive) * 100 : 0,
    };
  });
  
  // Calculate orders by completion
  const ordersByCompletion = COMPLETION_BUCKETS.map((bucket, index) => {
    const count = activeOrders.filter(order => {
      const completion = order.fulfillment_percentage || 0;
      if (bucket.max === 100) {
        return completion >= bucket.min && completion <= bucket.max;
      }
      return completion >= bucket.min && completion < bucket.max;
    }).length;
    
    return {
      ...bucket,
      count,
      color: COMPLETION_COLORS[index],
      percentage: totalActive > 0 ? (count / totalActive) * 100 : 0,
    };
  });
  
  // Calculate summary metrics
  const urgentOrders = activeOrders.filter(o => getOrderAgeInDays(o.order_date) >= 70).length;
  const nearCompletion = activeOrders.filter(o => (o.fulfillment_percentage || 0) >= 80).length;
  const inProgress = activeOrders.filter(o => {
    const completion = o.fulfillment_percentage || 0;
    return completion > 0 && completion < 80;
  }).length;

  const summaryMetrics = [
    {
      label: "Total Orders",
      value: totalActive,
      icon: Package,
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-500",
    },
    {
      label: "Urgent (70+ days)",
      value: urgentOrders,
      icon: AlertCircle,
      bgColor: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-500",
    },
    {
      label: "Near Completion",
      value: nearCompletion,
      icon: TrendingUp,
      bgColor: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-500",
    },
    {
      label: "In Progress",
      value: inProgress,
      icon: Clock,
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryMetrics.map((metric) => (
          <Card key={metric.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-3xl font-bold mt-1">{metric.value}</p>
                </div>
                <div className={`p-2 rounded-full ${metric.bgColor}`}>
                  <metric.icon className={`h-5 w-5 ${metric.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Orders by Age and Completion */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Orders by Age */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Orders by Age</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ordersByAge.map((bucket, index) => (
              <div key={bucket.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{bucket.label}</span>
                  <span className={bucket.count > 0 ? "font-medium text-primary" : "text-muted-foreground"}>
                    {bucket.count} orders
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${bucket.color} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(bucket.percentage, bucket.count > 0 ? 5 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Orders by Completion */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Orders by Completion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ordersByCompletion.map((bucket, index) => (
              <div key={bucket.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{bucket.label}</span>
                  <span className={bucket.count > 0 ? "font-medium text-primary" : "text-muted-foreground"}>
                    {bucket.count} orders
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${bucket.color} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(bucket.percentage, bucket.count > 0 ? 5 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
