import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ChevronDown, ChevronUp, Package, Clock, CheckCircle2 } from 'lucide-react';
import type { ComponentSummary } from '@/hooks/useDashboardData';

interface ComponentProcurementProps {
  summary: ComponentSummary[];
}

export function ComponentProcurement({ summary }: ComponentProcurementProps) {
  const [expandedComponent, setExpandedComponent] = useState<string | null>(null);

  const toggleExpand = (field: string) => {
    setExpandedComponent(expandedComponent === field ? null : field);
  };

  // Filter to only show components with pending items
  const pendingComponents = summary.filter(c => c.notOrdered > 0 || c.ordered > 0);
  const totalNotOrdered = summary.reduce((sum, c) => sum + c.notOrdered, 0);
  const totalOrdered = summary.reduce((sum, c) => sum + c.ordered, 0);

  if (pendingComponents.length === 0) {
    return (
      <Card className="border-success/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-success">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">All components available across all orders</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">Component Procurement</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {totalNotOrdered > 0 && (
              <Badge variant="destructive" className="text-xs">
                {totalNotOrdered} to order
              </Badge>
            )}
            {totalOrdered > 0 && (
              <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400">
                {totalOrdered} pending
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Aggregate component needs across all active orders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {summary.map((component) => {
          const isExpanded = expandedComponent === component.field;
          const hasPending = component.notOrdered > 0 || component.ordered > 0;
          
          return (
            <div
              key={component.field}
              className={`rounded-lg border p-3 transition-colors ${
                hasPending ? 'bg-card' : 'bg-muted/30 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${
                    component.notOrdered > 0 ? 'bg-destructive' :
                    component.ordered > 0 ? 'bg-warning' :
                    'bg-success'
                  }`} />
                  <span className="font-medium text-sm">{component.name}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    {component.notOrdered > 0 && (
                      <span className="flex items-center gap-1 text-destructive">
                        <Package className="h-3 w-3" />
                        {component.notOrdered}
                      </span>
                    )}
                    {component.ordered > 0 && (
                      <span className="flex items-center gap-1 text-amber-500">
                        <Clock className="h-3 w-3" />
                        {component.ordered}
                      </span>
                    )}
                    {!hasPending && (
                      <span className="flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-3 w-3" />
                        All ready
                      </span>
                    )}
                  </div>
                  
                  {hasPending && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => toggleExpand(component.field)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
              
              {isExpanded && component.affectedOrders.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Affected orders:</p>
                  <div className="flex flex-wrap gap-1">
                    {component.affectedOrders.map((order) => (
                      <Link key={order.id} to={`/orders/${order.id}`}>
                        <Badge
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-primary/10"
                        >
                          #{order.order_number}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
