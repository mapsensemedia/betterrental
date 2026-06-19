import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "warning" | "danger" | "info";

const toneStyles: Record<Tone, { chip: string; value?: string }> = {
  default: { chip: "bg-muted text-muted-foreground" },
  success: { chip: "bg-emerald-50 text-emerald-600", value: "text-emerald-600" },
  warning: { chip: "bg-amber-50 text-amber-600", value: "text-amber-600" },
  danger: { chip: "bg-rose-50 text-rose-600", value: "text-rose-600" },
  info: { chip: "bg-sky-50 text-sky-600" },
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  sublabel?: ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  sublabel,
  className,
}: StatCardProps) {
  const t = toneStyles[tone];
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 flex flex-col gap-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <div
            className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
              t.chip,
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className={cn("text-3xl font-bold leading-none", t.value)}>
        {value}
      </div>
      {sublabel && (
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      )}
    </div>
  );
}
