import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  /** Eyebrow label rendered directly above the heading (11px uppercase) */
  eyebrow?: string;
  subtitle?: string;
  action?: ReactNode;
  centered?: boolean;
  className?: string;
}

export function SectionHeader({
  title,
  eyebrow,
  subtitle,
  action,
  centered = false,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 md:mb-14",
        centered && "items-center text-center md:flex-col",
        className
      )}
    >
      <div className={cn(centered && "text-center")}>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 className="heading-2 text-foreground">{title}</h2>
        {subtitle && (
          <p className="mt-4 text-[15px] text-muted-foreground prose-measure">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
