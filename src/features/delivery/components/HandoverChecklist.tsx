import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, FileSignature, Camera, Gauge, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HandoverChecklistState } from "../api/types";

// ─────────────────────────────────────────────────────────────────────────────
// HANDOVER CHECKLIST COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface HandoverChecklistProps {
  checklist: HandoverChecklistState;
  className?: string;
  compact?: boolean;
}

export function HandoverChecklist({ 
  checklist, 
  className,
  compact = false,
}: HandoverChecklistProps) {
  const items = [
    {
      key: 'agreementSigned',
      label: 'Rental Agreement Signed',
      description: 'Customer has reviewed and signed the rental agreement',
      icon: FileSignature,
      completed: checklist.agreementSigned,
      required: true,
    },
    {
      key: 'walkaroundComplete',
      label: 'Walkaround Inspection',
      description: 'Customer has acknowledged vehicle condition',
      icon: ClipboardCheck,
      completed: checklist.walkaroundComplete,
      required: true,
    },
    {
      key: 'photosUploaded',
      label: 'Handover Photos',
      description: 'Captured photos of vehicle at handover',
      icon: Camera,
      completed: checklist.photosUploaded,
      required: true,
    },
    {
      key: 'odometerRecorded',
      label: 'Odometer Reading',
      description: 'Recorded starting mileage',
      icon: Gauge,
      completed: checklist.odometerRecorded,
      required: false,
    },
  ];

  const completedCount = items.filter(i => i.completed).length;
  const requiredCount = items.filter(i => i.required).length;
  const requiredComplete = items.filter(i => i.required && i.completed).length;
  const allRequiredComplete = requiredComplete === requiredCount;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {items.filter(i => i.required).map((item) => {
          const Icon = item.icon;
          return (
            <div 
              key={item.key}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
                item.completed 
                  ? "bg-green-100 text-green-700" 
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="h-3 w-3" />
              {item.completed ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Handover Checklist</CardTitle>
          <span className={cn(
            "text-sm font-medium px-2 py-0.5 rounded-full",
            allRequiredComplete 
              ? "bg-green-100 text-green-700" 
              : "bg-amber-100 text-amber-700"
          )}>
            {requiredComplete}/{requiredCount} required
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div 
              key={item.key}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                item.completed 
                  ? "bg-green-50 border-green-200" 
                  : "bg-muted/30 border-muted"
              )}
            >
              <div className={cn(
                "flex items-center justify-center h-8 w-8 rounded-full shrink-0",
                item.completed ? "bg-green-100" : "bg-muted"
              )}>
                <Icon className={cn(
                  "h-4 w-4",
                  item.completed ? "text-green-600" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn(
                    "font-medium text-sm",
                    item.completed ? "text-green-700" : "text-foreground"
                  )}>
                    {item.label}
                  </p>
                  {!item.required && (
                    <span className="text-xs text-muted-foreground">(optional)</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.description}
                </p>
              </div>
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
            </div>
          );
        })}

        {!allRequiredComplete && (
          <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
            Complete all required items before marking delivery as complete.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INLINE CHECKLIST (For action area)
// ─────────────────────────────────────────────────────────────────────────────

interface InlineChecklistProps {
  checklist: HandoverChecklistState;
  className?: string;
}

export function InlineChecklist({ checklist, className }: InlineChecklistProps) {
  const items = [
    { label: 'Agreement', completed: checklist.agreementSigned },
    { label: 'Walkaround', completed: checklist.walkaroundComplete },
    { label: 'Photos', completed: checklist.photosUploaded },
  ];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {items.map((item) => (
        <div 
          key={item.label}
          className={cn(
            "flex items-center gap-1.5 text-xs",
            item.completed ? "text-green-600" : "text-muted-foreground"
          )}
        >
          {item.completed ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
          {item.label}
        </div>
      ))}
    </div>
  );
}
