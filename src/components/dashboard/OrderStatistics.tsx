import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertCircle, TrendingUp, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  { label: "0-30 days", min: 0, max: 30, filterKey: "age_0_30" },
  { label: "31-40 days", min: 31, max: 40, filterKey: "age_31_40" },
  { label: "41-50 days", min: 41, max: 50, filterKey: "age_41_50" },
  { label: "51-60 days", min: 51, max: 60, filterKey: "age_51_60" },
  { label: "61-70 days", min: 61, max: 70, filterKey: "age_61_70" },
  { label: "70+ days", min: 70, max: Infinity, filterKey: "age_70_plus" },
];

// Completion buckets in percentage
const COMPLETION_BUCKETS = [
  { label: "0-20%", min: 0, max: 20, filterKey: "completion_0_20" },
  { label: "20-40%", min: 20, max: 40, filterKey: "completion_20_40" },
  { label: "40-60%", min: 40, max: 60, filterKey: "completion_40_60" },
  { label: "60-80%", min: 60, max: 80, filterKey: "completion_60_80" },
  { label: "80-90%", min: 80, max: 90, filterKey: "completion_80_90" },
  { label: "90-100%", min: 90, max: 100, filterKey: "completion_90_100" },
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
  const navigate = useNavigate();
  
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
      filterKey: "all",
    },
    {
      label: "Urgent (70+ days)",
      value: urgentOrders,
      icon: AlertCircle,
      bgColor: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-500",
      filterKey: "urgent_70_plus",
    },
    {
      label: "Near Completion",
      value: nearCompletion,
      icon: TrendingUp,
      bgColor: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-500",
      filterKey: "near_completion",
    },
    {
      label: "In Progress",
      value: inProgress,
      icon: Clock,
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-500",
      filterKey: "in_progress",
    },
  ];

  const handleNavigate = (filterKey: string) => {
    navigate(`/orders?filter=${filterKey}`);
  };

  return (
    <div className="space-y-6">
      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryMetrics.map((metric) => (
          <Card 
            key={metric.label} 
            className="border-0 shadow-sm cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
            onClick={() => handleNavigate(metric.filterKey)}
          >
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
            <CardTitle 
              className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors"
              onClick={() => handleNavigate("all")}
            >
              Orders by Age
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ordersByAge.map((bucket) => (
              <div 
                key={bucket.label} 
                className="space-y-1 cursor-pointer hover:bg-muted/50 rounded-md p-2 -mx-2 transition-colors"
                onClick={() => handleNavigate(bucket.filterKey)}
              >
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
            <CardTitle 
              className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors"
              onClick={() => handleNavigate("all")}
            >
              Orders by Completion
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Based on weighted manufacturing progress
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {ordersByCompletion.map((bucket) => (
              <div 
                key={bucket.label} 
                className="cursor-pointer hover:bg-muted/50 rounded-md p-2 -mx-2 transition-colors group"
                onClick={() => handleNavigate(bucket.filterKey)}
              >
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className={`font-medium ${bucket.count > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {bucket.label}
                  </span>
                  <span className={`font-semibold ${bucket.count > 0 ? 'text-primary group-hover:underline' : 'text-muted-foreground'}`}>
                    {bucket.count} order{bucket.count !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${bucket.color} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(bucket.percentage, bucket.count > 0 ? 8 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
            
            {/* Summary footer */}
            <div className="pt-3 mt-3 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Active Orders</span>
                <span className="font-bold text-foreground">{totalActive}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
