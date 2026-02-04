import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  type OpsStep,
  type OpsStepId, 
  type StepCompletion,
  getStepStatus,
  checkStepComplete,
  getBlockingIssues,
  getStepForDisplay,
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
  Circle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  Truck,
  Camera,
  Car,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface OpsStepSidebarProps {
  steps: OpsStep[];
  activeStep: OpsStepId;
  completion: StepCompletion;
  currentStepIndex: number;
  onStepClick: (stepId: OpsStepId) => void;
  isRentalActive: boolean;
  isDelivery?: boolean;
  stepTimestamps?: Record<OpsStepId, Date | null>;
}

const stepIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "clipboard-check": ClipboardCheck,
  "wrench": Wrench,
  "user-check": UserCheck,
  "credit-card": CreditCard,
  "file-text": FileText,
  "eye": Eye,
  "key": Key,
  "camera": Camera,
  "truck": Truck,
  "car": Car,
};

// Map status to visual styling - simplified without locked/blocked
function getStatusStyling(status: string, isActive: boolean) {
  switch (status) {
    case "complete":
      return {
        bgClass: "bg-emerald-500 text-white",
        textClass: "text-emerald-600 dark:text-emerald-400",
        chipBg: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
      };
    case "needs_attention":
      return {
        bgClass: "bg-amber-500 text-white",
        textClass: "text-amber-600 dark:text-amber-400",
        chipBg: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
      };
    case "in_progress":
      return {
        bgClass: isActive ? "bg-primary text-primary-foreground" : "bg-blue-500 text-white",
        textClass: "text-primary",
        chipBg: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
      };
    case "ready":
    default:
      return {
        bgClass: isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        textClass: "",
        chipBg: "",
      };
  }
}

function getStatusLabel(status: string): string | null {
  switch (status) {
    case "complete":
      return "Complete";
    case "needs_attention":
      return "Needs Review";
    case "in_progress":
      return "In Progress";
    default:
      return null;
  }
}

export function OpsStepSidebar({ 
  steps, 
  activeStep, 
  completion, 
  currentStepIndex,
  onStepClick,
  isRentalActive,
  isDelivery = false,
  stepTimestamps,
}: OpsStepSidebarProps) {
  const [mobileExpanded, setMobileExpanded] = useState(false);
  
  const completedCount = isRentalActive 
    ? steps.length 
    : steps.filter(s => checkStepComplete(s.id, completion, isDelivery)).length;
  
  const currentStep = steps.find(s => s.id === activeStep);
  const currentStepDisplay = currentStep ? getStepForDisplay(currentStep, isDelivery) : null;

  return (
    <>
      {/* Mobile Header - Collapsible */}
      <div className="lg:hidden border-b bg-muted/20 shrink-0">
        <button
          onClick={() => setMobileExpanded(!mobileExpanded)}
          className="w-full p-3 sm:p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-semibold">
              {currentStep?.number || 1}
            </div>
            <div className="text-left">
              <p className="text-xs sm:text-sm font-medium">{currentStepDisplay?.title || "Step"}</p>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {completedCount}/{steps.length} complete
                </p>
              </div>
            </div>
          </div>
          {mobileExpanded ? (
            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          )}
        </button>
        
        {/* Mobile Expanded Steps */}
        {mobileExpanded && (
          <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-1 animate-fade-in max-h-[50vh] overflow-y-auto">
            {steps.map((step) => {
              const { status, missingCount } = getStepStatus(step.id, completion, currentStepIndex, isDelivery);
              const displayStatus = isRentalActive ? "complete" : status;
              const isComplete = isRentalActive || checkStepComplete(step.id, completion, isDelivery);
              const isActive = activeStep === step.id;
              const styling = getStatusStyling(displayStatus, isActive);
              const stepDisplay = getStepForDisplay(step, isDelivery);
              
              return (
                <button
                  key={step.id}
                  onClick={() => {
                    onStepClick(step.id);
                    setMobileExpanded(false);
                  }}
                  className={cn(
                    "w-full text-left p-2.5 sm:p-3 rounded-lg flex items-center gap-2.5 sm:gap-3 transition-colors",
                    isActive && "bg-primary/10"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-medium shrink-0",
                    styling.bgClass
                  )}>
                    {isComplete ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : step.number}
                  </div>
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span className={cn(
                      "text-xs sm:text-sm truncate",
                      isActive && "font-medium text-primary"
                    )}>
                      {stepDisplay.title}
                    </span>
                    {!isComplete && missingCount && missingCount > 0 && (
                      <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded shrink-0 ml-2">
                        {missingCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 xl:w-72 border-r bg-muted/20 shrink-0 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Operations Steps
            </h2>
          </div>
          
          <div className="space-y-1">
            {steps.map((step, index) => {
              const Icon = stepIcons[step.icon] || Circle;
              const { status, reason, missingCount } = getStepStatus(step.id, completion, currentStepIndex, isDelivery);
              const isActive = activeStep === step.id;
              const isComplete = checkStepComplete(step.id, completion, isDelivery);
              const stepDisplay = getStepForDisplay(step, isDelivery);
              
              // Override status if rental is active - all steps are complete
              const displayStatus = isRentalActive ? "complete" : status;
              const displayComplete = isRentalActive || isComplete;
              const styling = getStatusStyling(displayStatus, isActive);
              const statusLabel = getStatusLabel(displayStatus);
              const timestamp = stepTimestamps?.[step.id];
              
              return (
                <button
                  key={step.id}
                  onClick={() => onStepClick(step.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-all",
                    "hover:bg-muted/50",
                    isActive && "bg-primary/10 border border-primary/20"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Step Number/Status Indicator */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold",
                      styling.bgClass
                    )}>
                      {displayComplete ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        step.number
                      )}
                    </div>
                    
                    {/* Step Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium truncate",
                          isActive && "text-primary",
                          styling.textClass
                        )}>
                          {stepDisplay.title}
                        </span>
                      </div>
                      
                      {/* Status chip and missing count */}
                      <div className="flex items-center gap-2 mt-1">
                        {statusLabel && (
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-medium",
                            styling.chipBg
                          )}>
                            {statusLabel}
                          </span>
                        )}
                        {!displayComplete && missingCount && missingCount > 0 && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">
                            {missingCount} missing
                          </span>
                        )}
                      </div>
                      
                      {/* Timestamp */}
                      {timestamp && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(timestamp, { addSuffix: true })}
                        </p>
                      )}
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
              {completedCount}/{steps.length}
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ 
                width: `${(completedCount / steps.length) * 100}%` 
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
