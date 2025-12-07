import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wrench } from 'lucide-react';
import type { ManufacturingWorkload as WorkloadType } from '@/hooks/useDashboardData';

interface ManufacturingWorkloadProps {
  workload: WorkloadType[];
}

export function ManufacturingWorkload({ workload }: ManufacturingWorkloadProps) {
  const maxTotal = Math.max(...workload.map(w => w.notStarted + w.partial + w.complete), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-info" />
          <CardTitle className="text-lg">Manufacturing Workload</CardTitle>
        </div>
        <CardDescription>
          Orders at each manufacturing stage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {workload.map((stage) => {
          const total = stage.notStarted + stage.partial + stage.complete;
          if (total === 0) return null;
          
          const notStartedWidth = (stage.notStarted / maxTotal) * 100;
          const partialWidth = (stage.partial / maxTotal) * 100;
          const completeWidth = (stage.complete / maxTotal) * 100;

          return (
            <div key={stage.stage} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium truncate">{stage.stage}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {stage.notStarted > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                      {stage.notStarted}
                    </span>
                  )}
                  {stage.partial > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-warning" />
                      {stage.partial}
                    </span>
                  )}
                  {stage.complete > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-success" />
                      {stage.complete}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex h-3 rounded-full overflow-hidden bg-muted/50">
                {stage.notStarted > 0 && (
                  <div
                    className="bg-muted-foreground/30 transition-all duration-300"
                    style={{ width: `${notStartedWidth}%` }}
                  />
                )}
                {stage.partial > 0 && (
                  <div
                    className="bg-warning transition-all duration-300"
                    style={{ width: `${partialWidth}%` }}
                  />
                )}
                {stage.complete > 0 && (
                  <div
                    className="bg-success transition-all duration-300"
                    style={{ width: `${completeWidth}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
        
        {/* Legend */}
        <div className="flex items-center gap-4 pt-2 border-t border-border text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
            Not Started
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-warning" />
            In Progress
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-success" />
            Complete
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
