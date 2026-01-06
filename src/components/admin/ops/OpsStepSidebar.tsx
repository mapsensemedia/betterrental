import { cn } from "@/lib/utils";
import { 
  OPS_STEPS, 
  type OpsStepId, 
  type StepCompletion,
  getStepStatus,
  checkStepComplete,
} from "@/lib/ops-steps";
import { 
  ClipboardCheck, 
  Wrench, 
  UserCheck, 
  CreditCard, 
  FileText, 
  Eye,
  Key,
  Check,
  Lock,
  AlertCircle,
  Circle,
} from "lucide-react";

interface OpsStepSidebarProps {
  steps: typeof OPS_STEPS;
  activeStep: OpsStepId;
  completion: StepCompletion;
  currentStepIndex: number;
  onStepClick: (stepId: OpsStepId) => void;
  isRentalActive: boolean;
}

const stepIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "clipboard-check": ClipboardCheck,
  "wrench": Wrench,
  "user-check": UserCheck,
  "credit-card": CreditCard,
  "file-text": FileText,
  "eye": Eye,
  "key": Key,
};

export function OpsStepSidebar({ 
  steps, 
  activeStep, 
  completion, 
  currentStepIndex,
  onStepClick,
  isRentalActive,
}: OpsStepSidebarProps) {
  return (
    <div className="w-72 border-r bg-muted/20 shrink-0 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Operations Steps
        </h2>
        <div className="space-y-1">
          {steps.map((step, index) => {
            const Icon = stepIcons[step.icon] || Circle;
            const { status, reason, missingCount } = getStepStatus(step.id, completion, currentStepIndex);
            const isActive = activeStep === step.id;
            const isComplete = checkStepComplete(step.id, completion);
            const isLocked = status === "locked";
            
            // Override status if rental is active - all steps are complete
            const displayStatus = isRentalActive ? "complete" : status;
            const displayComplete = isRentalActive || isComplete;
            
            // Allow clicking on any step if all steps are complete or rental is active
            const allStepsComplete = Object.values(completion).every(step => {
              if (typeof step === 'object') {
                return Object.values(step).every(v => v === true);
              }
              return step;
            });
            const canNavigate = isRentalActive || allStepsComplete || !isLocked;
            
            return (
              <button
                key={step.id}
                onClick={() => canNavigate && onStepClick(step.id)}
                disabled={!canNavigate}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-all",
                  "hover:bg-muted/50",
                  isActive && "bg-primary/10 border border-primary/20",
                  !canNavigate && "opacity-60 cursor-not-allowed"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Step Number/Status Indicator */}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold",
                    displayComplete && "bg-emerald-500 text-white",
                    !displayComplete && isActive && "bg-primary text-primary-foreground",
                    !displayComplete && !isActive && !isLocked && "bg-muted text-muted-foreground",
                    isLocked && !isRentalActive && "bg-muted text-muted-foreground"
                  )}>
                    {displayComplete ? (
                      <Check className="w-4 h-4" />
                    ) : isLocked && !isRentalActive ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      step.number
                    )}
                  </div>
                  
                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-medium truncate",
                        isActive && "text-primary"
                      )}>
                        {step.title}
                      </span>
                      {!displayComplete && missingCount && missingCount > 0 && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded dark:bg-amber-950/30">
                          {missingCount}
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      "text-xs mt-0.5 truncate",
                      displayComplete ? "text-emerald-600 dark:text-emerald-400" :
                      isLocked && !isRentalActive ? "text-muted-foreground" :
                      "text-muted-foreground"
                    )}>
                      {displayComplete ? "Complete" : 
                       isLocked && !isRentalActive ? reason : 
                       step.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Progress Summary */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">
            {isRentalActive ? steps.length : steps.filter(s => checkStepComplete(s.id, completion)).length}/{steps.length}
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ 
              width: `${isRentalActive ? 100 : (steps.filter(s => checkStepComplete(s.id, completion)).length / steps.length) * 100}%` 
            }}
          />
        </div>
      </div>
    </div>
  );
}
