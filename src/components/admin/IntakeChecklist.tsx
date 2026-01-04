import { CheckCircle2, Circle, Clock, AlertTriangle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { type IntakeStatus, type IntakeItem } from "@/hooks/use-intake-status";
import { useState } from "react";

interface IntakeChecklistProps {
  intakeStatus: IntakeStatus;
  onConfirmItem?: (itemId: string) => void;
  className?: string;
}

function StatusIcon({ status }: { status: IntakeItem["status"] }) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case "pending":
      return <Clock className="w-4 h-4 text-amber-500" />;
    case "incomplete":
      return <Circle className="w-4 h-4 text-muted-foreground" />;
  }
}

export function IntakeChecklist({ intakeStatus, onConfirmItem, className }: IntakeChecklistProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { items, isComplete, completedCount, totalRequired, missingRequired } = intakeStatus;

  const progress = totalRequired > 0 ? (completedCount / totalRequired) * 100 : 0;

  return (
    <Card className={cn("border-border", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : missingRequired.length > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                Intake Checklist
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={isComplete ? "default" : "secondary"} className="text-xs">
                  {completedCount}/{totalRequired}
                </Badge>
                <ChevronDown className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  isOpen && "rotate-180"
                )} />
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  isComplete ? "bg-emerald-500" : "bg-primary"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                  item.status === "complete" 
                    ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
                    : item.status === "pending"
                      ? "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20"
                      : "border-border bg-muted/30"
                )}
              >
                <div className="mt-0.5">
                  <StatusIcon status={item.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "text-sm font-medium",
                      item.status === "complete" && "text-emerald-700 dark:text-emerald-400"
                    )}>
                      {item.label}
                    </p>
                    {item.required && item.status !== "complete" && (
                      <Badge variant="outline" className="text-xs py-0 px-1.5">
                        Required
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                </div>
                {onConfirmItem && item.status !== "complete" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    onClick={() => onConfirmItem(item.id)}
                  >
                    Confirm
                  </Button>
                )}
              </div>
            ))}

            {/* Alert for missing required items */}
            {missingRequired.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800 mt-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                    {missingRequired.length} required item{missingRequired.length > 1 ? "s" : ""} incomplete
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                    Complete all required items before handover
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
