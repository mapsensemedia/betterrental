import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DeliveryShell } from "@/components/delivery/DeliveryShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// New feature imports
import { 
  useDeliveryList, 
  useDeliveryCounts,
  useClaimDeliveryMutation,
  useRealtimeDelivery,
  DeliveryGrid,
  type DeliveryScope,
  type PortalStatus,
} from "@/features/delivery";

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY DASHBOARD PAGE (REBUILT)
// ─────────────────────────────────────────────────────────────────────────────

export default function DeliveryDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse initial values from URL or localStorage
  const initialScope = (searchParams.get("scope") as DeliveryScope) || 
    (localStorage.getItem("delivery-scope") as DeliveryScope) || "my";
  const initialStatus = (searchParams.get("status") as PortalStatus) || null;

  const [scope, setScope] = useState<DeliveryScope>(initialScope);
  const [statusFilter, setStatusFilter] = useState<PortalStatus | null>(initialStatus);

  // Setup realtime subscription (single subscription for the page)
  useRealtimeDelivery({ enabled: true });

  // Fetch deliveries based on current filters
  const { 
    data: deliveries = [], 
    isLoading, 
    isRefetching,
    refetch 
  } = useDeliveryList({ scope, statusFilter });

  // Fetch counts for badges
  const { data: counts } = useDeliveryCounts();

  // Claim mutation
  const claimMutation = useClaimDeliveryMutation();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const handleClaim = async (bookingId: string) => {
    setClaimingId(bookingId);
    try {
      await claimMutation.mutateAsync(bookingId);
    } finally {
      setClaimingId(null);
    }
  };

  // Persist scope to localStorage and URL
  useEffect(() => {
    localStorage.setItem("delivery-scope", scope);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("scope", scope);
    if (statusFilter) {
      newParams.set("status", statusFilter);
    } else {
      newParams.delete("status");
    }
    setSearchParams(newParams, { replace: true });
  }, [scope, statusFilter, setSearchParams, searchParams]);

  const handleScopeChange = (newScope: string) => {
    setScope(newScope as DeliveryScope);
    setStatusFilter(null); // Reset status filter when changing scope
  };

  const handleStatusFilter = (status: PortalStatus | null) => {
    setStatusFilter(status);
  };

  return (
    <DeliveryShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Deliveries</h1>
            <p className="text-sm text-muted-foreground">
              Manage your assigned deliveries and available tasks
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

        {/* Scope Tabs */}
        <Tabs value={scope} onValueChange={handleScopeChange}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="my" className="gap-2">
              My Deliveries
              {counts?.my ? (
                <Badge variant="secondary" className="ml-1">
                  {counts.my}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="available" className="gap-2">
              Available
              {counts?.available ? (
                <Badge variant="outline" className="ml-1 border-orange-300 text-orange-600">
                  {counts.available}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            <StatusPill 
              label="All" 
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

          {/* Content */}
          <TabsContent value="my" className="mt-6">
            <DeliveryGrid
              deliveries={deliveries}
              isLoading={isLoading}
              emptyMessage="No deliveries assigned to you. Check available deliveries to claim one."
            />
          </TabsContent>

          <TabsContent value="available" className="mt-6">
            <DeliveryGrid
              deliveries={deliveries}
              isLoading={isLoading}
              showClaimButton
              onClaim={handleClaim}
              claimLoadingId={claimingId}
              emptyMessage="No available deliveries at the moment."
            />
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            <DeliveryGrid
              deliveries={deliveries}
              isLoading={isLoading}
              emptyMessage="No deliveries found."
            />
          </TabsContent>
        </Tabs>
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
