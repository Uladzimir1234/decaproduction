import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { ProgressCircle } from '@/components/ui/progress-circle';
import { AlertTriangle, Clock, CheckCircle2, Ban, ArrowRight, Calendar, Pause, PlayCircle } from 'lucide-react';
import type { PriorityOrder, OrderWithFulfillment } from '@/hooks/useDashboardData';

interface FileComponent {
  id: string;
  component_type: string;
  component_name: string | null;
  quantity: number;
  status: string;
}

interface PriorityOrderCardProps {
  order: PriorityOrder;
  showDetails?: boolean;
}

const healthConfig = {
  'on-track': {
    color: 'bg-success/10 text-success border-success/30',
    icon: CheckCircle2,
    label: 'On Track',
  },
  'at-risk': {
    color: 'bg-warning/10 text-warning border-warning/30',
    icon: AlertTriangle,
    label: 'At Risk',
  },
  'critical': {
    color: 'bg-destructive/10 text-destructive border-destructive/30',
    icon: AlertTriangle,
    label: 'Critical',
  },
  'blocked': {
    color: 'bg-muted text-muted-foreground border-muted-foreground/30',
    icon: Ban,
    label: 'Blocked',
  },
};

export function PriorityOrderCard({ order, showDetails = true }: PriorityOrderCardProps) {
  const health = healthConfig[order.healthStatus];
  const HealthIcon = health.icon;
  const isOverdue = order.daysUntilDelivery < 0;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysOnHold = (): number => {
    if (!order.hold_started_at) return 0;
    const holdDate = new Date(order.hold_started_at);
    const now = new Date();
    return Math.floor((now.getTime() - holdDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysOnHold = getDaysOnHold();

  // Helper to get actual component status (file components first, then legacy)
  const getActualComponentStatus = (field: string): string => {
    if (order.fileComponents && order.fileComponents.length > 0) {
      const typeMap: Record<string, string> = {
        reinforcement_status: 'reinforcement',
        windows_profile_status: 'profile',
        glass_status: 'glass',
        screens_status: 'screens',
        plisse_screens_status: 'plisse',
        nail_fins_status: 'nail_fins',
        hardware_status: 'hardware',
      };
      const componentType = typeMap[field];
      if (componentType) {
        const matching = order.fileComponents.filter(c => 
          c.component_type.toLowerCase() === componentType.toLowerCase()
        );
        if (matching.length > 0) {
          if (matching.some(c => c.status === 'not_ordered')) return 'not_ordered';
          if (matching.some(c => c.status === 'ordered')) return 'ordered';
          return 'available';
        }
      }
    }
    return (order as any)[field] || 'not_ordered';
  };

  // Component status dots - only show components that were actually sold
  const componentStatuses = [
    { name: 'Reinforcement', status: getActualComponentStatus('reinforcement_status') },
    { name: 'Profile', status: getActualComponentStatus('windows_profile_status') },
    { name: 'Glass', status: getActualComponentStatus('glass_status') },
    ...(order.screen_type ? [{ name: 'Screens', status: getActualComponentStatus('screens_status') }] : []),
    ...(order.has_plisse_screens ? [{ name: 'Plisse', status: getActualComponentStatus('plisse_screens_status') }] : []),
    ...(order.has_nailing_flanges ? [{ name: 'Nail Fins', status: getActualComponentStatus('nail_fins_status') }] : []),
    { name: 'Hardware', status: getActualComponentStatus('hardware_status') },
  ];

  return (
    <Link to={`/orders/${order.id}`} className="block group">
      <div className={`p-2.5 rounded-lg border transition-all duration-200 hover:shadow-md bg-card ${
        order.healthStatus === 'critical' ? 'border-destructive/30' :
        order.healthStatus === 'at-risk' ? 'border-warning/30' :
        'hover:border-primary/30'
      }`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-sm font-semibold">#{order.order_number}</span>
              {order.production_status === 'hold' ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 border-amber-500/50 text-amber-600 dark:text-amber-400">
                  <Pause className="h-2.5 w-2.5" />
                  Hold {daysOnHold > 0 && `(${daysOnHold}d)`}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 border-success/50 text-success">
                  <PlayCircle className="h-2.5 w-2.5" />
                  Ready
                </Badge>
              )}
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${health.color}`}>
                <HealthIcon className="h-3 w-3 mr-1" />
                {health.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate mt-0.5">{order.customer_name}</p>
          </div>
          
          {/* Priority Score Circle */}
          <div className="flex items-center gap-2">
            <ProgressCircle
              value={order.fulfillment_percentage || order.manufacturingProgress}
              size="sm"
              colorVariant="gradient"
            />
          </div>
        </div>

        {/* Component Status Dots */}
        <div className="flex items-center gap-1 mb-1.5">
          <span className="text-[10px] text-muted-foreground mr-1">Components:</span>
          {componentStatuses.map((component, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full ${
                component.status === 'available' ? 'bg-success' :
                component.status === 'ordered' ? 'bg-warning' :
                'bg-destructive'
              }`}
              title={component.name}
            />
          ))}
          <span className="text-[10px] text-muted-foreground ml-1">
            {order.componentReadiness}%
          </span>
        </div>

        {/* Time & Units */}
        <div className="flex items-center justify-between text-xs mb-1.5">
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
              <Calendar className="h-3 w-3" />
              {isOverdue ? 'Overdue' : `${order.daysUntilDelivery}d left`}
            </span>
            <span className="text-muted-foreground">
              Due {formatDate(order.delivery_date)}
            </span>
          </div>
          <span className="text-muted-foreground">
            {order.windows_count}W / {order.doors_count}D / {order.sliding_doors_count}S
          </span>
        </div>

        {/* Next Action */}
        {showDetails && (
          <div className="flex items-center gap-2 pt-1.5 border-t border-border">
            <ArrowRight className="h-3 w-3 text-primary" />
            <span className="text-xs text-primary font-medium truncate">
              {order.nextAction}
            </span>
          </div>
        )}

        {/* Blockers (if any) */}
        {showDetails && order.blockers.length > 0 && order.blockers.length <= 2 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {order.blockers.slice(0, 2).map((blocker, i) => (
              <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 border-destructive/30 text-destructive">
                {blocker}
              </Badge>
            ))}
            {order.blockers.length > 2 && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                +{order.blockers.length - 2} more
              </Badge>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
