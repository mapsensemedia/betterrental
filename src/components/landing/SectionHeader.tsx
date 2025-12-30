import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  centered?: boolean;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  action,
  centered = false,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8",
        centered && "items-center text-center md:flex-col",
        className
      )}
    >
      <div className={cn(centered && "text-center")}>
        {subtitle && (
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">
            {subtitle}
          </p>
        )}
        <h2 className="heading-2">{title}</h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
