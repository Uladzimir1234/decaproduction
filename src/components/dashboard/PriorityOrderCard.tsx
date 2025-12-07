import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { ProgressCircle } from '@/components/ui/progress-circle';
import { AlertTriangle, Clock, CheckCircle2, Ban, ArrowRight, Calendar } from 'lucide-react';
import type { PriorityOrder } from '@/hooks/useDashboardData';

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

  // Component status dots
  const componentStatuses = [
    order.reinforcement_status,
    order.windows_profile_status,
    order.glass_status,
    order.screens_status,
    order.plisse_screens_status,
    order.nail_fins_status,
    order.hardware_status,
  ];

  return (
    <Link to={`/orders/${order.id}`} className="block group">
      <div className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md bg-card ${
        order.healthStatus === 'critical' ? 'border-destructive/30' :
        order.healthStatus === 'at-risk' ? 'border-warning/30' :
        'hover:border-primary/30'
      }`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-semibold">#{order.order_number}</span>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${health.color}`}>
                <HealthIcon className="h-3 w-3 mr-1" />
                {health.label}
              </Badge>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                P{order.priorityScore}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate mt-1">{order.customer_name}</p>
          </div>
          
          {/* Priority Score Circle */}
          <div className="flex items-center gap-2">
            <ProgressCircle
              value={order.manufacturingProgress}
              size="sm"
              colorVariant="gradient"
            />
          </div>
        </div>

        {/* Component Status Dots */}
        <div className="flex items-center gap-1 mb-3">
          <span className="text-[10px] text-muted-foreground mr-1">Components:</span>
          {componentStatuses.map((status, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full ${
                status === 'available' ? 'bg-success' :
                status === 'ordered' ? 'bg-warning' :
                'bg-destructive'
              }`}
              title={['Reinforcement', 'Profile', 'Glass', 'Screens', 'Plisse', 'Nail Fins', 'Hardware'][i]}
            />
          ))}
          <span className="text-[10px] text-muted-foreground ml-1">
            {order.componentReadiness}%
          </span>
        </div>

        {/* Time & Units */}
        <div className="flex items-center justify-between text-xs mb-3">
          <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <ArrowRight className="h-3 w-3 text-primary" />
            <span className="text-xs text-primary font-medium truncate">
              {order.nextAction}
            </span>
          </div>
        )}

        {/* Blockers (if any) */}
        {showDetails && order.blockers.length > 0 && order.blockers.length <= 2 && (
          <div className="flex flex-wrap gap-1 mt-2">
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
