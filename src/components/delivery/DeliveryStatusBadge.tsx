import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DeliveryStatus } from "@/hooks/use-my-deliveries";

interface DeliveryStatusBadgeProps {
  status: DeliveryStatus;
  className?: string;
}

const statusConfig: Record<DeliveryStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  assigned: { label: "Assigned", variant: "outline", className: "border-amber-500 text-amber-600" },
  picked_up: { label: "Picked Up", variant: "secondary", className: "bg-blue-100 text-blue-700" },
  en_route: { label: "En Route", variant: "secondary", className: "bg-blue-100 text-blue-700" },
  delivered: { label: "Delivered", variant: "default", className: "bg-green-100 text-green-700" },
  issue: { label: "Issue", variant: "destructive", className: "" },
  cancelled: { label: "Cancelled", variant: "secondary", className: "bg-muted text-muted-foreground" },
};

export function DeliveryStatusBadge({ status, className }: DeliveryStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "secondary" as const, className: "" };
  
  return (
    <Badge 
      variant={config.variant} 
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
