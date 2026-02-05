import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { 
  DELIVERY_WORKFLOW_STEPS, 
  getCurrentStepIndex,
  isStepCompleted,
  type DeliveryStatus 
} from "../constants/delivery-status";

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY STEPS INDICATOR
// ─────────────────────────────────────────────────────────────────────────────

interface DeliveryStepsProps {
  currentStatus: DeliveryStatus | null | undefined;
  className?: string;
  compact?: boolean;
}

export function DeliverySteps({ 
  currentStatus, 
  className,
  compact = false,
}: DeliveryStepsProps) {
  const currentIndex = getCurrentStepIndex(currentStatus || 'unassigned');

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {DELIVERY_WORKFLOW_STEPS.map((step, index) => {
          const isCompleted = currentStatus ? isStepCompleted(step.id, currentStatus) : false;
          const isCurrent = step.id === currentStatus;
          const Icon = step.icon;

          return (
            <div 
              key={step.id}
              className={cn(
                "flex flex-col items-center relative",
                compact ? "flex-1" : "flex-1"
              )}
            >
              {/* Connector line */}
              {index > 0 && (
                <div 
                  className={cn(
                    "absolute top-5 right-1/2 w-full h-0.5",
                    isCompleted || isCurrent ? "bg-primary" : "bg-muted"
                  )}
                  style={{ transform: 'translateX(-50%)' }}
                />
              )}

              {/* Step circle */}
              <div 
                className={cn(
                  "relative z-10 flex items-center justify-center rounded-full transition-all",
                  compact ? "h-8 w-8" : "h-10 w-10",
                  isCompleted 
                    ? "bg-primary text-primary-foreground" 
                    : isCurrent 
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20" 
                      : "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className={compact ? "h-4 w-4" : "h-5 w-5"} />
                ) : (
                  <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
                )}
              </div>

              {/* Step label */}
              {!compact && (
                <div className="mt-2 text-center">
                  <p className={cn(
                    "text-sm font-medium",
                    isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {step.description}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Compact labels */}
      {compact && (
        <div className="flex items-center justify-between mt-2">
          {DELIVERY_WORKFLOW_STEPS.map((step) => {
            const isCurrent = step.id === currentStatus;
            return (
              <div key={step.id} className="flex-1 text-center">
                <p className={cn(
                  "text-xs",
                  isCurrent ? "text-primary font-medium" : "text-muted-foreground"
                )}>
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MINIMAL STEP INDICATOR (For cards)
// ─────────────────────────────────────────────────────────────────────────────

interface StepProgressProps {
  currentStatus: DeliveryStatus | null | undefined;
  className?: string;
}

export function StepProgress({ currentStatus, className }: StepProgressProps) {
  const currentIndex = getCurrentStepIndex(currentStatus || 'unassigned');
  const totalSteps = DELIVERY_WORKFLOW_STEPS.length;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {DELIVERY_WORKFLOW_STEPS.map((step, index) => {
        const isCompleted = currentIndex > index;
        const isCurrent = currentIndex === index;

        return (
          <div
            key={step.id}
            className={cn(
              "h-1.5 rounded-full flex-1 transition-colors",
              isCompleted ? "bg-primary" : isCurrent ? "bg-primary/50" : "bg-muted"
            )}
          />
        );
      })}
    </div>
  );
}
