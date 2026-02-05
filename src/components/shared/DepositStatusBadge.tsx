import { Badge } from "@/components/ui/badge";
import { DollarSign, Shield, Clock, CheckCircle, AlertCircle } from "lucide-react";

export type DepositStatus = "not_required" | "pending" | "due" | "held" | "partially_released" | "released" | "deducted";

interface DepositStatusBadgeProps {
  status: DepositStatus;
  amount?: number;
  showAmount?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<DepositStatus, { label: string; className: string; icon: typeof Shield }> = {
  not_required: { 
    label: "Pending Authorization", 
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    icon: Clock 
  },
  pending: { 
    label: "Pending Authorization", 
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    icon: Clock 
  },
  due: { 
    label: "Due", 
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    icon: Clock
  },
  held: { 
    label: "Held", 
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: Shield 
  },
  partially_released: { 
    label: "Partial Release", 
    className: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    icon: AlertCircle 
  },
  released: { 
    label: "Released", 
    className: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: CheckCircle 
  },
  deducted: { 
    label: "Deducted", 
    className: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: AlertCircle 
  },
};

export function DepositStatusBadge({ status, amount, showAmount = true, className }: DepositStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_required;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} ${className || ""}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
      {showAmount && amount != null && amount > 0 && (
        <span className="ml-1 font-mono">${amount.toFixed(0)}</span>
      )}
    </Badge>
  );
}
