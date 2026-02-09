import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DeliveryShell } from "@/components/delivery/DeliveryShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// New feature imports
import { 
  useDeliveryList, 
  useDeliveryCounts,
  useRealtimeDelivery,
  DeliveryGrid,
  type PortalStatus,
} from "@/features/delivery";

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY DASHBOARD PAGE
// Shows ALL deliveries for admin/staff, filters by status via top pills
// ─────────────────────────────────────────────────────────────────────────────

export default function DeliveryDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const initialStatus = (searchParams.get("status") as PortalStatus) || null;
  const [statusFilter, setStatusFilter] = useState<PortalStatus | null>(initialStatus);

  // Setup realtime subscription (single subscription for the page)
  useRealtimeDelivery({ enabled: true });

  // Fetch ALL deliveries - not scoped to current driver
  const { 
    data: deliveries = [], 
    isLoading, 
    isRefetching,
    refetch 
  } = useDeliveryList({ scope: 'all', statusFilter });

  // Fetch counts for badges (all deliveries)
  const { data: counts } = useDeliveryCounts();

  // Persist status filter to URL
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    if (statusFilter) {
      newParams.set("status", statusFilter);
    } else {
      newParams.delete("status");
    }
    setSearchParams(newParams, { replace: true });
  }, [statusFilter, setSearchParams, searchParams]);

  const handleStatusFilter = (status: PortalStatus | null) => {
    setStatusFilter(status);
  };

  const totalAll = (counts?.pending || 0) + (counts?.enRoute || 0) + (counts?.completed || 0) + (counts?.issue || 0);

  return (
    <DeliveryShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Deliveries</h1>
            <p className="text-sm text-muted-foreground">
              View and manage all delivery tasks
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap gap-2">
          <StatusPill 
            label="All" 
            count={totalAll}
            isActive={!statusFilter}
            onClick={() => handleStatusFilter(null)}
          />
          <StatusPill 
            label="Pending" 
            count={counts?.pending}
            isActive={statusFilter === 'pending'}
            onClick={() => handleStatusFilter('pending')}
            colorClass="bg-amber-100 text-amber-700"
          />
          <StatusPill 
            label="En Route" 
            count={counts?.enRoute}
            isActive={statusFilter === 'en_route'}
            onClick={() => handleStatusFilter('en_route')}
            colorClass="bg-blue-100 text-blue-700"
          />
          <StatusPill 
            label="Completed" 
            count={counts?.completed}
            isActive={statusFilter === 'completed'}
            onClick={() => handleStatusFilter('completed')}
            colorClass="bg-green-100 text-green-700"
          />
          <StatusPill 
            label="Issues" 
            count={counts?.issue}
            isActive={statusFilter === 'issue'}
            onClick={() => handleStatusFilter('issue')}
            colorClass="bg-red-100 text-red-700"
          />
        </div>

        {/* Deliveries Grid */}
        <DeliveryGrid
          deliveries={deliveries}
          isLoading={isLoading}
          emptyMessage="No deliveries found."
        />
      </div>
    </DeliveryShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS PILL COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface StatusPillProps {
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
  colorClass?: string;
}

function StatusPill({ label, count, isActive, onClick, colorClass }: StatusPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
        isActive 
          ? "bg-primary text-primary-foreground" 
          : colorClass || "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={cn(
          "ml-1.5 px-1.5 py-0.5 rounded-full text-xs",
          isActive ? "bg-primary-foreground/20" : "bg-background"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}
