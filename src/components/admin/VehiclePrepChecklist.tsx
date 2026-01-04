import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Wrench, CheckCircle2, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { 
  useVehiclePrepStatus, 
  useUpdateVehiclePrep,
  type PrepChecklistKey 
} from '@/hooks/use-vehicle-prep';

interface VehiclePrepChecklistProps {
  bookingId: string;
}

export function VehiclePrepChecklist({ bookingId }: VehiclePrepChecklistProps) {
  const { data: prepStatus, isLoading } = useVehiclePrepStatus(bookingId);
  const updatePrep = useUpdateVehiclePrep();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = (itemKey: PrepChecklistKey, checked: boolean) => {
    updatePrep.mutate({
      bookingId,
      itemKey,
      checked,
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!prepStatus) return null;

  const progressPercent = (prepStatus.completedCount / prepStatus.totalCount) * 100;

  // Compact summary view
  return (
    <div className="space-y-3">
      {/* Summary row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {prepStatus.allComplete ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <Wrench className="h-4 w-4 text-muted-foreground" />
          )}
          <span className={cn(
            "text-sm font-medium",
            prepStatus.allComplete && "text-emerald-600"
          )}>
            {prepStatus.allComplete ? "Prep complete" : `${prepStatus.completedCount}/${prepStatus.totalCount} items`}
          </span>
        </div>
        <Badge 
          variant={prepStatus.allComplete ? "default" : "secondary"}
          className={cn(prepStatus.allComplete && "bg-emerald-500")}
        >
          {prepStatus.allComplete ? "Ready" : "In Progress"}
        </Badge>
      </div>

      <Progress value={progressPercent} className="h-1.5" />

      {/* Expandable checklist */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
          {isExpanded ? "Hide checklist" : "View checklist"}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-2">
          {prepStatus.items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 p-2.5 rounded-lg border transition-colors",
                item.checked ? "bg-emerald-500/5 border-emerald-500/30" : "border-border"
              )}
            >
              <Checkbox
                id={item.id}
                checked={item.checked}
                onCheckedChange={(checked) => 
                  handleToggle(item.key as PrepChecklistKey, checked as boolean)
                }
                disabled={updatePrep.isPending}
              />
              <label
                htmlFor={item.id}
                className={cn(
                  "flex-1 text-sm cursor-pointer",
                  item.checked && "text-emerald-700 dark:text-emerald-400 line-through"
                )}
              >
                {item.label}
              </label>
              {item.checked && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              )}
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
