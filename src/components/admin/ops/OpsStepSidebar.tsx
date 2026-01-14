import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  OPS_STEPS, 
  type OpsStepId, 
  type StepCompletion,
  getStepStatus,
  checkStepComplete,
  getBlockingIssues,
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
  Circle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface OpsStepSidebarProps {
  steps: typeof OPS_STEPS;
  activeStep: OpsStepId;
  completion: StepCompletion;
  currentStepIndex: number;
  onStepClick: (stepId: OpsStepId) => void;
  isRentalActive: boolean;
  stepTimestamps?: Record<OpsStepId, Date | null>; // NEW: track when each step was last updated
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

// Map status to visual styling
function getStatusStyling(status: string, isActive: boolean) {
  switch (status) {
    case "complete":
      return {
        bgClass: "bg-emerald-500 text-white",
        textClass: "text-emerald-600 dark:text-emerald-400",
        chipBg: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
      };
    case "blocked":
      return {
        bgClass: "bg-destructive text-white",
        textClass: "text-destructive",
        chipBg: "bg-destructive/10 text-destructive",
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
      return {
        bgClass: isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        textClass: "",
        chipBg: "",
      };
    case "locked":
    default:
      return {
        bgClass: "bg-muted text-muted-foreground",
        textClass: "text-muted-foreground",
        chipBg: "",
      };
  }
}

function getStatusLabel(status: string): string | null {
  switch (status) {
    case "complete":
      return "Complete";
    case "blocked":
      return "Blocked";
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
  stepTimestamps,
}: OpsStepSidebarProps) {
  const [mobileExpanded, setMobileExpanded] = useState(false);
  
  const completedCount = isRentalActive 
    ? steps.length 
    : steps.filter(s => checkStepComplete(s.id, completion)).length;
  
  const blockedCount = steps.filter(s => {
    const issues = getBlockingIssues(s.id, completion);
    return issues.length > 0;
  }).length;
  
  const currentStep = steps.find(s => s.id === activeStep);

  return (
    <>
      {/* Mobile Header - Collapsible */}
      <div className="lg:hidden border-b bg-muted/20 shrink-0">
        <button
          onClick={() => setMobileExpanded(!mobileExpanded)}
          className="w-full p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
              {currentStep?.number || 1}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">{currentStep?.title || "Step"}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {completedCount}/{steps.length} complete
                </p>
                {blockedCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1 py-0">
                    {blockedCount} blocked
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {mobileExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
        
        {/* Mobile Expanded Steps */}
        {mobileExpanded && (
          <div className="px-4 pb-4 space-y-1 animate-fade-in">
            {steps.map((step) => {
              const { status, missingCount } = getStepStatus(step.id, completion, currentStepIndex);
              const displayStatus = isRentalActive ? "complete" : status;
              const isComplete = isRentalActive || checkStepComplete(step.id, completion);
              const isActive = activeStep === step.id;
              const styling = getStatusStyling(displayStatus, isActive);
              
              return (
                <button
                  key={step.id}
                  onClick={() => {
                    onStepClick(step.id);
                    setMobileExpanded(false);
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors",
                    isActive && "bg-primary/10"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                    styling.bgClass
                  )}>
                    {isComplete ? <Check className="w-3.5 h-3.5" /> : 
                     displayStatus === "blocked" ? <AlertTriangle className="w-3.5 h-3.5" /> :
                     step.number}
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <span className={cn(
                      "text-sm",
                      isActive && "font-medium text-primary"
                    )}>
                      {step.title}
                    </span>
                    {!isComplete && missingCount && missingCount > 0 && (
                      <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">
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
      <div className="hidden lg:block w-72 border-r bg-muted/20 shrink-0 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Operations Steps
            </h2>
            {blockedCount > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {blockedCount} blocked
              </Badge>
            )}
          </div>
          
          <div className="space-y-1">
            {steps.map((step, index) => {
              const Icon = stepIcons[step.icon] || Circle;
              const { status, reason, missingCount } = getStepStatus(step.id, completion, currentStepIndex);
              const isActive = activeStep === step.id;
              const isComplete = checkStepComplete(step.id, completion);
              
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
                      ) : displayStatus === "blocked" ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : displayStatus === "locked" ? (
                        <Lock className="w-4 h-4" />
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
                          {step.title}
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
