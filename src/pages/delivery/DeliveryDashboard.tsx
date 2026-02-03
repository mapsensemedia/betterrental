import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DeliveryShell } from "@/components/delivery/DeliveryShell";
import { AssignDriverDialog } from "@/components/delivery/AssignDriverDialog";
import { DeliveryGrid } from "@/components/delivery/DeliveryGrid";
import { useMyDeliveries, type DeliveryStatus, type DeliveryBooking } from "@/hooks/use-my-deliveries";
import { useClaimDelivery } from "@/hooks/use-claim-delivery";
import { useRealtimeDeliveries } from "@/hooks/use-realtime-subscriptions";
import { useIsAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Truck, MapPin, List, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  countByPortalStatus,
  getDeliveryPortalStatus,
  normalizeDeliveryPortalTab,
  type DeliveryPortalStatus,
} from "@/lib/delivery-portal";

export default function DeliveryDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("status");
  const normalizedTab = normalizeDeliveryPortalTab(rawTab);
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  
  // State for assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryBooking | null>(null);
  
  // Enable real-time updates for deliveries
  useRealtimeDeliveries();
  
  // Admin/staff see all deliveries, drivers see assigned ones
  const { data: deliveries, isLoading, error } = useMyDeliveries(undefined, (isAdmin ?? false) ? "all" : "assigned");
  const { data: poolDeliveries } = useMyDeliveries(undefined, "pool");
  const claimDelivery = useClaimDelivery();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const portalCounts = useMemo(() => countByPortalStatus(deliveries), [deliveries]);

  const unassigned = useMemo(
    () => (deliveries || []).filter((d) => d.deliveryStatus === "unassigned"),
    [deliveries]
  );

  const myDeliveries = useMemo(
    () => (deliveries || []).filter((d) => d.assignedDriverId === user?.id),
    [deliveries, user?.id]
  );

  const pending = useMemo(
    () => (deliveries || []).filter((d) => getDeliveryPortalStatus({ bookingStatus: d.status, deliveryStatus: d.deliveryStatus }) === "pending"),
    [deliveries]
  );
  const pendingUnassigned = useMemo(
    () => pending.filter((d) => d.deliveryStatus === "unassigned"),
    [pending]
  );
  const pendingAssigned = useMemo(
    () => pending.filter((d) => d.deliveryStatus !== "unassigned"),
    [pending]
  );

  const enRoute = useMemo(
    () => (deliveries || []).filter((d) => getDeliveryPortalStatus({ bookingStatus: d.status, deliveryStatus: d.deliveryStatus }) === "en_route"),
    [deliveries]
  );
  const completed = useMemo(
    () => (deliveries || []).filter((d) => getDeliveryPortalStatus({ bookingStatus: d.status, deliveryStatus: d.deliveryStatus }) === "completed"),
    [deliveries]
  );
  const issues = useMemo(
    () => (deliveries || []).filter((d) => getDeliveryPortalStatus({ bookingStatus: d.status, deliveryStatus: d.deliveryStatus }) === "issue"),
    [deliveries]
  );

  const availableToClaim = useMemo(() => {
    if (isAdmin) return [];
    return (poolDeliveries || []).filter(
      (d) => getDeliveryPortalStatus({ bookingStatus: d.status, deliveryStatus: d.deliveryStatus }) === "pending"
    );
  }, [isAdmin, poolDeliveries]);

  const handleTabChange = (value: string) => {
    if (value === "all") {
      searchParams.delete("status");
    } else {
      searchParams.set("status", value);
    }
    setSearchParams(searchParams);
  };

  const handleAssignDriver = (delivery: DeliveryBooking) => {
    setSelectedDelivery(delivery);
    setAssignDialogOpen(true);
  };

  const handleClaim = async (delivery: DeliveryBooking) => {
    setClaimingId(delivery.id);
    try {
      await claimDelivery.mutateAsync(delivery.id);
    } finally {
      setClaimingId(null);
    }
  };

  const defaultTab: DeliveryPortalStatus | "all" | "my" | "available" = isAdmin ? "pending" : "my";
  const currentTab = (normalizedTab || defaultTab) as any;

  return (
    <DeliveryShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">
            {isAdmin ? "Delivery Management" : "My Deliveries"}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin 
              ? "Manage all delivery bookings and driver assignments" 
              : "View and manage your assigned deliveries"
            }
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12 text-destructive">
            <p>Failed to load deliveries. Please try again.</p>
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && (
          <Tabs value={currentTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-auto lg:grid-cols-none lg:inline-flex">
              {/* Drivers see "My Deliveries" first */}
              {!isAdmin && (
                <TabsTrigger value="my" className="gap-2">
                  <Truck className="h-4 w-4" />
                  My Deliveries
                  <Badge variant="secondary" className="ml-1">
                    {myDeliveries.length}
                  </Badge>
                </TabsTrigger>
              )}

              {!isAdmin && (
                <TabsTrigger value="available" className="gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Available
                  <Badge variant={availableToClaim.length > 0 ? "destructive" : "secondary"} className="ml-1">
                    {availableToClaim.length}
                  </Badge>
                </TabsTrigger>
              )}
              
              <TabsTrigger value="pending" className="gap-2">
                <Truck className="h-4 w-4" />
                Pending
                <Badge variant={portalCounts.pending > 0 ? "secondary" : "secondary"} className="ml-1">
                  {portalCounts.pending}
                </Badge>
              </TabsTrigger>
              
              <TabsTrigger value="en_route" className="gap-2">
                <MapPin className="h-4 w-4" />
                En Route
                <Badge variant="secondary" className="ml-1">
                  {portalCounts.en_route}
                </Badge>
              </TabsTrigger>

              <TabsTrigger value="completed" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Completed
                <Badge variant="secondary" className="ml-1">
                  {portalCounts.completed}
                </Badge>
              </TabsTrigger>

              <TabsTrigger value="issue" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Issue
                <Badge variant={portalCounts.issue > 0 ? "destructive" : "secondary"} className="ml-1">
                  {portalCounts.issue}
                </Badge>
              </TabsTrigger>

              {isAdmin && (
                <TabsTrigger value="all" className="gap-2">
                  <List className="h-4 w-4" />
                  All
                  <Badge variant="secondary" className="ml-1">
                    {deliveries?.length || 0}
                  </Badge>
                </TabsTrigger>
              )}
            </TabsList>

            {/* My Deliveries Tab (Drivers) */}
            {!isAdmin && (
              <TabsContent value="my" className="mt-6">
                <DeliveryGrid deliveries={myDeliveries} emptyMessage="No deliveries assigned to you" />
              </TabsContent>
            )}

            {!isAdmin && (
              <TabsContent value="available" className="mt-6">
                <DeliveryGrid
                  deliveries={availableToClaim}
                  emptyMessage="No unassigned deliveries available"
                  showClaimButton
                  onClaimDelivery={handleClaim}
                  claimingId={claimingId}
                />
              </TabsContent>
            )}

            <TabsContent value="pending" className="mt-6 space-y-6">
              {isAdmin && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Unassigned</h2>
                    <Badge variant={unassigned.length > 0 ? "destructive" : "secondary"}>{unassigned.length}</Badge>
                  </div>
                  <DeliveryGrid
                    deliveries={pendingUnassigned}
                    emptyMessage="No unassigned pending deliveries"
                    showAssignButton
                    onAssignDriver={handleAssignDriver}
                  />
                </section>
              )}

              <section className="space-y-3">
                {isAdmin && (
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Assigned</h2>
                    <Badge variant="secondary">{pendingAssigned.length}</Badge>
                  </div>
                )}
                <DeliveryGrid deliveries={isAdmin ? pendingAssigned : pending} emptyMessage="No pending deliveries" />
              </section>
            </TabsContent>

            <TabsContent value="en_route" className="mt-6">
              <DeliveryGrid deliveries={enRoute} emptyMessage="No en-route deliveries" />
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              <DeliveryGrid deliveries={completed} emptyMessage="No completed deliveries" />
            </TabsContent>

            <TabsContent value="issue" className="mt-6">
              <DeliveryGrid deliveries={issues} emptyMessage="No deliveries with issues" />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="all" className="mt-6">
                <DeliveryGrid
                  deliveries={deliveries || []}
                  emptyMessage="No deliveries found"
                  showAssignButton
                  onAssignDriver={handleAssignDriver}
                />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>

      {/* Assign Driver Dialog */}
      {selectedDelivery && (
        <AssignDriverDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          bookingId={selectedDelivery.id}
          bookingCode={selectedDelivery.bookingCode}
          customerName={selectedDelivery.customer?.fullName || "Unknown Customer"}
        />
      )}
    </DeliveryShell>
  );
}
