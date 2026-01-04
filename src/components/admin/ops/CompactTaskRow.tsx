import { CheckCircle2, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompactTaskRowProps {
  title: string;
  isComplete: boolean;
  summary?: string;
  onClick?: () => void;
  className?: string;
}

export function CompactTaskRow({ title, isComplete, summary, onClick, className }: CompactTaskRowProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-left",
        "hover:bg-muted/50",
        isComplete 
          ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-950/20" 
          : "border-border",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {isComplete ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <div>
          <p className={cn(
            "text-sm font-medium",
            isComplete && "text-emerald-700 dark:text-emerald-400"
          )}>
            {title}
          </p>
          {summary && (
            <p className="text-xs text-muted-foreground">{summary}</p>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}
