import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDeliveryList, useDeliveryCounts } from "../hooks/use-delivery-list";
import { useRealtimeDelivery } from "../hooks/use-realtime-delivery";
import type { DeliveryBooking, DeliveryScope } from "../api/types";
import type { PortalStatus } from "../constants/delivery-status";

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface DeliveryContextValue {
  // Current user
  userId: string | null;
  isDriver: boolean;
  
  // Active filters
  currentScope: DeliveryScope;
  currentStatusFilter: PortalStatus | null;
  setScope: (scope: DeliveryScope) => void;
  setStatusFilter: (status: PortalStatus | null) => void;
  
  // Data
  deliveries: DeliveryBooking[];
  counts: {
    my: number;
    available: number;
    pending: number;
    enRoute: number;
    completed: number;
    issue: number;
  };
  
  // Loading states
  isLoading: boolean;
  isRefetching: boolean;
  
  // Actions
  refetch: () => void;
}

const DeliveryContext = createContext<DeliveryContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

interface DeliveryProviderProps {
  children: ReactNode;
  initialScope?: DeliveryScope;
  initialStatusFilter?: PortalStatus | null;
}

export function DeliveryProvider({ 
  children,
  initialScope = 'my',
  initialStatusFilter = null,
}: DeliveryProviderProps) {
  const { user } = useAuth();
  const [scope, setScope] = useState<DeliveryScope>(initialScope);
  const [statusFilter, setStatusFilter] = useState<PortalStatus | null>(initialStatusFilter);

  // Setup realtime subscription (single subscription for the whole context)
  useRealtimeDelivery({ enabled: !!user?.id });

  // Fetch deliveries based on current filters
  const { 
    data: deliveries = [], 
    isLoading,
    isRefetching,
    refetch,
  } = useDeliveryList({ scope, statusFilter });

  // Fetch counts for badges
  const { data: countsData } = useDeliveryCounts();

  const counts = countsData || {
    my: 0,
    available: 0,
    pending: 0,
    enRoute: 0,
    completed: 0,
    issue: 0,
  };

  const value: DeliveryContextValue = useMemo(() => ({
    userId: user?.id || null,
    isDriver: true, // Would check user roles
    currentScope: scope,
    currentStatusFilter: statusFilter,
    setScope,
    setStatusFilter,
    deliveries,
    counts,
    isLoading,
    isRefetching,
    refetch,
  }), [user?.id, scope, statusFilter, deliveries, counts, isLoading, isRefetching, refetch]);

  return (
    <DeliveryContext.Provider value={value}>
      {children}
    </DeliveryContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useDeliveryContext() {
  const context = useContext(DeliveryContext);
  if (!context) {
    throw new Error("useDeliveryContext must be used within a DeliveryProvider");
  }
  return context;
}

// Import useState (was missing) - moved to top
