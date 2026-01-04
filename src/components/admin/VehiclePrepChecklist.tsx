import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Wrench, CheckCircle2 } from 'lucide-react';
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

  const handleToggle = (itemKey: PrepChecklistKey, checked: boolean) => {
    updatePrep.mutate({
      bookingId,
      itemKey,
      checked,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!prepStatus) return null;

  const progressPercent = (prepStatus.completedCount / prepStatus.totalCount) * 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Vehicle Prep Checklist
          </CardTitle>
          {prepStatus.allComplete ? (
            <Badge className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          ) : (
            <Badge variant="secondary">
              {prepStatus.completedCount}/{prepStatus.totalCount}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progressPercent} className="h-2" />
        
        <div className="space-y-3">
          {prepStatus.items.map((item) => (
            <div
              key={item.id}
              className={`
                flex items-center gap-3 p-3 rounded-lg border transition-colors
                ${item.checked ? 'bg-green-500/5 border-green-500/30' : 'border-border'}
              `}
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
                className={`
                  flex-1 text-sm cursor-pointer
                  ${item.checked ? 'text-green-700 line-through' : ''}
                `}
              >
                {item.label}
              </label>
              {item.checked && (
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
