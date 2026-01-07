import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  RETURN_STEPS, 
  type ReturnStepId, 
  type ReturnCompletion,
  checkReturnStepComplete,
  getReturnMissingItems,
} from "@/lib/return-steps";
import { 
  ClipboardCheck, 
  Camera, 
  Flag,
  DollarSign,
  CheckCircle,
  Wallet,
  Check,
  Circle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ReturnStepSidebarProps {
  steps: typeof RETURN_STEPS;
  activeStep: ReturnStepId;
  completion: ReturnCompletion;
  currentStepIndex: number;
  onStepClick: (stepId: ReturnStepId) => void;
  isCompleted: boolean;
}

const stepIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "clipboard-check": ClipboardCheck,
  "camera": Camera,
  "flag": Flag,
  "dollar-sign": DollarSign,
  "check-circle": CheckCircle,
  "wallet": Wallet,
};

export function ReturnStepSidebar({ 
  steps, 
  activeStep, 
  completion, 
  currentStepIndex,
  onStepClick,
  isCompleted,
}: ReturnStepSidebarProps) {
  const [mobileExpanded, setMobileExpanded] = useState(false);
  
  const completedCount = isCompleted 
    ? steps.length 
    : steps.filter(s => checkReturnStepComplete(s.id, completion)).length;
  
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
              <p className="text-xs text-muted-foreground">
                {completedCount}/{steps.length} complete
              </p>
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
              const isComplete = isCompleted || checkReturnStepComplete(step.id, completion);
              const isActive = activeStep === step.id;
              
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
                    isComplete && "bg-emerald-500 text-white",
                    !isComplete && isActive && "bg-primary text-primary-foreground",
                    !isComplete && !isActive && "bg-muted text-muted-foreground"
                  )}>
                    {isComplete ? <Check className="w-3.5 h-3.5" /> : step.number}
                  </div>
                  <span className={cn(
                    "text-sm",
                    isActive && "font-medium text-primary"
                  )}>
                    {step.title}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-72 border-r bg-muted/20 shrink-0 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Return Steps
          </h2>
          <div className="space-y-1">
            {steps.map((step) => {
              const Icon = stepIcons[step.icon] || Circle;
              const isActive = activeStep === step.id;
              const isComplete = checkReturnStepComplete(step.id, completion);
              const missing = getReturnMissingItems(step.id, completion);
              
              const displayComplete = isCompleted || isComplete;
              
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
                      displayComplete && "bg-emerald-500 text-white",
                      !displayComplete && isActive && "bg-primary text-primary-foreground",
                      !displayComplete && !isActive && "bg-muted text-muted-foreground"
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
                          isActive && "text-primary"
                        )}>
                          {step.title}
                        </span>
                        {!displayComplete && missing.length > 0 && (
                          <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded dark:bg-amber-950/30">
                            {missing.length}
                          </span>
                        )}
                      </div>
                      <p className={cn(
                        "text-xs mt-0.5 truncate",
                        displayComplete ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                      )}>
                        {displayComplete ? "Complete" : step.description}
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
