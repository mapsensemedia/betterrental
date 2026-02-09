import { ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface NextStep {
  id: string;
  title: string;
  description: string;
  action: string;
  variant: "default" | "warning" | "success";
  missingCount?: number;
  onAction?: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

interface NextStepCardProps {
  step: NextStep | null;
  isComplete?: boolean;
  className?: string;
}

export function NextStepCard({ step, isComplete, className }: NextStepCardProps) {
  if (isComplete) {
    return (
      <Card className={cn("border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-emerald-700 dark:text-emerald-400">Rental Active</p>
              <p className="text-sm text-emerald-600 dark:text-emerald-500">All pre-handover steps completed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!step) return null;

  return (
    <Card className={cn(
      "border-2 transition-all",
      step.variant === "warning" && "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30",
      step.variant === "success" && "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30",
      step.variant === "default" && "border-primary/50 bg-primary/5",
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            step.variant === "warning" && "bg-amber-500",
            step.variant === "success" && "bg-emerald-500",
            step.variant === "default" && "bg-primary"
          )}>
            {step.variant === "warning" ? (
              <AlertTriangle className="w-5 h-5 text-white" />
            ) : (
              <ArrowRight className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold">{step.title}</p>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
          </div>
          <Button 
            size="sm" 
            className="shrink-0"
            onClick={step.onAction}
            disabled={step.disabled}
            title={step.disabledReason}
          >
            {step.action}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
