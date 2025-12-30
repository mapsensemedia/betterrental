import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = 
  | "pending" 
  | "confirmed" 
  | "active" 
  | "completed" 
  | "cancelled"
  | "verified"
  | "rejected"
  | "open"
  | "in_progress"
  | "resolved"
  | "closed"
  | "draft"
  | "issued"
  | "voided";

const statusConfig: Record<StatusType, { label: string; variant: "pending" | "active" | "confirmed" | "completed" | "cancelled" | "success" | "warning" | "destructive" | "secondary" | "default" }> = {
  pending: { label: "Pending", variant: "pending" },
  confirmed: { label: "Confirmed", variant: "confirmed" },
  active: { label: "Active", variant: "active" },
  completed: { label: "Completed", variant: "completed" },
  cancelled: { label: "Cancelled", variant: "cancelled" },
  verified: { label: "Verified", variant: "success" },
  rejected: { label: "Rejected", variant: "cancelled" },
  open: { label: "Open", variant: "warning" },
  in_progress: { label: "In Progress", variant: "confirmed" },
  resolved: { label: "Resolved", variant: "success" },
  closed: { label: "Closed", variant: "completed" },
  draft: { label: "Draft", variant: "secondary" },
  issued: { label: "Issued", variant: "success" },
  voided: { label: "Voided", variant: "cancelled" },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "secondary" as const };
  
  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  );
}
