import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function PageContainer({ children, className, noPadding = false }: PageContainerProps) {
  return (
    <div className={cn(
      "container-page",
      !noPadding && "py-8 md:py-12",
      className
    )}>
      {children}
    </div>
  );
}
