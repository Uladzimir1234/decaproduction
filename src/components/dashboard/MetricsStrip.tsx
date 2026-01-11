import { AlertTriangle, Package, Truck, AlertCircle, Calendar, Pause, PlayCircle, PackageCheck, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import type { DashboardMetrics } from '@/hooks/useDashboardData';

interface MetricsStripProps {
  metrics: DashboardMetrics;
}

export function MetricsStrip({ metrics }: MetricsStripProps) {
  const navigate = useNavigate();
  
  const items = [
    {
      label: 'Active Orders',
      value: metrics.totalActive,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      filterKey: 'active',
    },
    {
      label: 'On Hold',
      value: metrics.onHoldCount,
      icon: Pause,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      highlight: metrics.onHoldCount > 0,
      filterKey: 'on_hold',
    },
    {
      label: 'Production Ready',
      value: metrics.productionReadyCount,
      icon: PlayCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
      filterKey: 'production_ready',
    },
    {
      label: 'Critical',
      value: metrics.criticalCount,
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      highlight: metrics.criticalCount > 0,
      filterKey: 'critical',
    },
    {
      label: 'At Risk',
      value: metrics.atRiskCount,
      icon: AlertCircle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      highlight: metrics.atRiskCount > 0,
      filterKey: 'at_risk',
    },
    {
      label: 'Batches Preparing',
      value: metrics.batchesPreparing,
      icon: PackageCheck,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      filterKey: 'batches_preparing',
    },
    {
      label: 'Batches Shipped',
      value: metrics.batchesShipped,
      icon: Send,
      color: 'text-info',
      bgColor: 'bg-info/10',
      filterKey: 'batches_shipped',
    },
    {
      label: 'Ready to Ship',
      value: metrics.readyToShip,
      icon: Truck,
      color: 'text-success',
      bgColor: 'bg-success/10',
      filterKey: 'ready_to_deliver',
    },
    {
      label: 'Avg Days',
      value: metrics.avgDaysToDelivery,
      icon: Calendar,
      color: 'text-info',
      bgColor: 'bg-info/10',
      suffix: 'd',
      filterKey: null, // Not clickable - it's an aggregate metric
    },
  ];

  const handleClick = (filterKey: string | null) => {
    if (filterKey) {
      navigate(`/orders?filter=${filterKey}`);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9 gap-3">
      {items.map((item) => (
        <Card
          key={item.label}
          className={`${item.highlight ? 'border-destructive/30 animate-pulse-slow' : ''} ${
            item.filterKey ? 'cursor-pointer hover:border-primary/50 hover:shadow-md transition-all' : ''
          }`}
          onClick={() => handleClick(item.filterKey)}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md ${item.bgColor}`}>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-none">
                  {item.value}{item.suffix || ''}
                </p>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {item.label}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
