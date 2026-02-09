import { DeliveryCard } from "./DeliveryCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";
import type { DeliveryBooking } from "../api/types";

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY GRID COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface DeliveryGridProps {
  deliveries: DeliveryBooking[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function DeliveryGrid({
  deliveries,
  isLoading,
  emptyMessage = "No deliveries found",
  className,
}: DeliveryGridProps) {
  if (isLoading) {
    return <DeliveryGridSkeleton />;
  }

  if (deliveries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">No Deliveries</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "grid gap-4",
      "grid-cols-1",
      "md:grid-cols-2",
      "xl:grid-cols-3",
      className
    )}>
      {deliveries.map((delivery) => (
        <DeliveryCard
          key={delivery.id}
          delivery={delivery}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOADING SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function DeliveryGridSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <DeliveryCardSkeleton key={i} />
      ))}
    </div>
  );
}

function DeliveryCardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Step progress */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-1.5 flex-1 rounded-full" />
        ))}
      </div>

      {/* Content */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-16 w-full rounded" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-9 flex-1 rounded" />
        <Skeleton className="h-9 flex-1 rounded" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPACT LIST VIEW
// ─────────────────────────────────────────────────────────────────────────────

interface DeliveryListProps {
  deliveries: DeliveryBooking[];
  isLoading?: boolean;
  className?: string;
}

export function DeliveryList({ deliveries, isLoading, className }: DeliveryListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No deliveries
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {deliveries.map((delivery) => (
        <DeliveryCard 
          key={delivery.id} 
          delivery={delivery} 
        />
      ))}
    </div>
  );
}
