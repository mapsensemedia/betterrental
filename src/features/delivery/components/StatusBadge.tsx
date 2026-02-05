import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG, type DeliveryStatus } from "../constants/delivery-status";

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: DeliveryStatus | null | undefined;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

export function StatusBadge({ 
  status, 
  className,
  showIcon = false,
  size = 'default',
}: StatusBadgeProps) {
  const normalizedStatus = status || 'unassigned';
  const config = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.unassigned;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    default: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <Badge
      variant={config.badgeVariant}
      className={cn(
        config.bgClass,
        config.textClass,
        config.borderClass,
        'border font-medium',
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={cn("mr-1", size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
      {config.label}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS DOT (For compact views)
// ─────────────────────────────────────────────────────────────────────────────

interface StatusDotProps {
  status: DeliveryStatus | null | undefined;
  className?: string;
  pulse?: boolean;
}

export function StatusDot({ status, className, pulse = false }: StatusDotProps) {
  const normalizedStatus = status || 'unassigned';
  const config = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.unassigned;

  const colorClasses: Record<typeof config.color, string> = {
    orange: 'bg-orange-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    gray: 'bg-gray-400',
  };

  return (
    <span className={cn("relative flex h-3 w-3", className)}>
      {pulse && (
        <span className={cn(
          "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
          colorClasses[config.color]
        )} />
      )}
      <span className={cn(
        "relative inline-flex rounded-full h-3 w-3",
        colorClasses[config.color]
      )} />
    </span>
  );
}
