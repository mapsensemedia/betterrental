import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DeliveryShell } from "@/components/delivery/DeliveryShell";
import { DeliveryCard } from "@/components/delivery/DeliveryCard";
import { AssignDriverDialog } from "@/components/delivery/AssignDriverDialog";
import { useMyDeliveries, type DeliveryStatus, type DeliveryBooking } from "@/hooks/use-my-deliveries";
import { useRealtimeDeliveries } from "@/hooks/use-realtime-subscriptions";
import { useIsAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Truck, Clock, MapPin, Users, List } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function DeliveryDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") as DeliveryStatus | null;
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  
  // State for assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryBooking | null>(null);
  
  // Enable real-time updates for deliveries
  useRealtimeDeliveries();
  
  // Admin/staff see all deliveries, drivers see assigned ones
  const { data: deliveries, isLoading, error } = useMyDeliveries(undefined, isAdmin ?? false);

  // Group deliveries by status and assignment
  const unassigned = deliveries?.filter(d => d.deliveryStatus === "unassigned") || [];
  const myDeliveries = deliveries?.filter(d => 
    d.assignedDriverId === user?.id && 
    d.deliveryStatus !== "delivered" && 
    d.deliveryStatus !== "cancelled"
  ) || [];
  const pending = deliveries?.filter(d => 
    d.deliveryStatus === "assigned" && d.assignedDriverId
  ) || [];
  const inProgress = deliveries?.filter(d => 
    d.deliveryStatus === "picked_up" || d.deliveryStatus === "en_route"
  ) || [];
  const completed = deliveries?.filter(d => d.deliveryStatus === "delivered") || [];

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

  const currentTab = statusFilter || (isAdmin ? "all" : "my");

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
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-none lg:inline-flex">
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
              
              {/* Admin sees Unassigned queue */}
              {isAdmin && (
                <TabsTrigger value="unassigned" className="gap-2">
                  <Users className="h-4 w-4" />
                  Unassigned
                  <Badge variant={unassigned.length > 0 ? "destructive" : "secondary"} className="ml-1">
                    {unassigned.length}
                  </Badge>
                </TabsTrigger>
              )}
              
              <TabsTrigger value="all" className="gap-2">
                <List className="h-4 w-4" />
                All
                <Badge variant="secondary" className="ml-1">
                  {deliveries?.length || 0}
                </Badge>
              </TabsTrigger>
              
              <TabsTrigger value="active" className="gap-2">
                <MapPin className="h-4 w-4" />
                Active
                <Badge variant="secondary" className="ml-1">
                  {inProgress.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* My Deliveries Tab (Drivers) */}
            {!isAdmin && (
              <TabsContent value="my" className="mt-6">
                <DeliveryGrid 
                  deliveries={myDeliveries} 
                  emptyMessage="No deliveries assigned to you"
                  showAssignButton={false}
                />
              </TabsContent>
            )}

            {/* Unassigned Queue (Admin/Staff only) */}
            {isAdmin && (
              <TabsContent value="unassigned" className="mt-6">
                <DeliveryGrid 
                  deliveries={unassigned} 
                  emptyMessage="No unassigned deliveries"
                  showAssignButton={true}
                  onAssignDriver={handleAssignDriver}
                />
              </TabsContent>
            )}

            <TabsContent value="all" className="mt-6">
              <DeliveryGrid 
                deliveries={deliveries || []} 
                showAssignButton={isAdmin ?? false}
                onAssignDriver={handleAssignDriver}
              />
            </TabsContent>

            <TabsContent value="active" className="mt-6">
              <DeliveryGrid 
                deliveries={inProgress} 
                emptyMessage="No active deliveries"
                showAssignButton={isAdmin ?? false}
                onAssignDriver={handleAssignDriver}
              />
            </TabsContent>
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

function DeliveryGrid({ 
  deliveries, 
  emptyMessage = "No deliveries found",
  showAssignButton = false,
  onAssignDriver,
}: { 
  deliveries: DeliveryBooking[];
  emptyMessage?: string;
  showAssignButton?: boolean;
  onAssignDriver?: (delivery: DeliveryBooking) => void;
}) {
  if (!deliveries || deliveries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {deliveries.map((delivery) => (
        <DeliveryCard 
          key={delivery.id} 
          delivery={delivery} 
          showAssignButton={showAssignButton && delivery.deliveryStatus === "unassigned"}
          onAssignDriver={onAssignDriver ? () => onAssignDriver(delivery) : undefined}
        />
      ))}
    </div>
  );
}
