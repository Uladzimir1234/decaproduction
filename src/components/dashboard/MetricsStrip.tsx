import { AlertTriangle, Clock, Package, Truck, AlertCircle, Calendar, Pause, PlayCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { DashboardMetrics } from '@/hooks/useDashboardData';

interface MetricsStripProps {
  metrics: DashboardMetrics;
}

export function MetricsStrip({ metrics }: MetricsStripProps) {
  const items = [
    {
      label: 'Active Orders',
      value: metrics.totalActive,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'On Hold',
      value: metrics.onHoldCount,
      icon: Pause,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      highlight: metrics.onHoldCount > 0,
    },
    {
      label: 'Production Ready',
      value: metrics.productionReadyCount,
      icon: PlayCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Critical',
      value: metrics.criticalCount,
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      highlight: metrics.criticalCount > 0,
    },
    {
      label: 'At Risk',
      value: metrics.atRiskCount,
      icon: AlertCircle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      highlight: metrics.atRiskCount > 0,
    },
    {
      label: 'Ready to Ship',
      value: metrics.readyToShip,
      icon: Truck,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Avg Days',
      value: metrics.avgDaysToDelivery,
      icon: Calendar,
      color: 'text-info',
      bgColor: 'bg-info/10',
      suffix: 'd',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {items.map((item) => (
        <Card
          key={item.label}
          className={`${item.highlight ? 'border-destructive/30 animate-pulse-slow' : ''}`}
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
