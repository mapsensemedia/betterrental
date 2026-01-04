import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOOKING_STAGES, BookingStage, getStageProgress } from "@/lib/booking-stages";

interface StageProgressProps {
  currentStage: BookingStage;
  className?: string;
  compact?: boolean;
}

export function StageProgress({ currentStage, className, compact = false }: StageProgressProps) {
  const currentIndex = BOOKING_STAGES.findIndex(s => s.id === currentStage);
  const progress = getStageProgress(currentStage);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {progress}%
        </span>
      </div>
    );
  }

  // Show abbreviated stages for better UX
  const keyStages = [
    BOOKING_STAGES[0],  // Intake
    BOOKING_STAGES[3],  // Payment
    BOOKING_STAGES[6],  // Handover
    BOOKING_STAGES[9],  // Return
    BOOKING_STAGES[11], // Wrap-up
  ];

  return (
    <div className={cn("flex items-center justify-between", className)}>
      {keyStages.map((stage, index) => {
        const stageIndex = BOOKING_STAGES.findIndex(s => s.id === stage.id);
        const isCompleted = stageIndex < currentIndex;
        const isCurrent = stage.id === currentStage;
        
        return (
          <div key={stage.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                isCompleted && "bg-primary text-primary-foreground",
                isCurrent && "bg-primary/20 text-primary border-2 border-primary",
                !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
              )}>
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </div>
              <span className={cn(
                "text-xs mt-1.5 text-center",
                isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {stage.label}
              </span>
            </div>
            {index < keyStages.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-2",
                isCompleted ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
