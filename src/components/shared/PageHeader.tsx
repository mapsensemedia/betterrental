import { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  backTo?: string;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function PageHeader({
  title,
  description,
  backTo,
  actions,
  className,
  children,
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className={cn("mb-6", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {backTo && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(backTo)}
              className="mt-0.5 -ml-2"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
