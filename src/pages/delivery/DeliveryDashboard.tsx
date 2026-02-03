import { useSearchParams } from "react-router-dom";
import { DeliveryShell } from "@/components/delivery/DeliveryShell";
import { DeliveryCard } from "@/components/delivery/DeliveryCard";
import { useMyDeliveries, type DeliveryStatus } from "@/hooks/use-my-deliveries";
import { useRealtimeDeliveries } from "@/hooks/use-realtime-subscriptions";
import { Loader2, Truck, Clock, MapPin } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function DeliveryDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") as DeliveryStatus | null;
  
  // Enable real-time updates for deliveries
  useRealtimeDeliveries();
  
  const { data: deliveries, isLoading, error } = useMyDeliveries();

  // Group deliveries by status
  const pending = deliveries?.filter(d => d.deliveryStatus === "assigned") || [];
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

  const currentTab = statusFilter || "all";

  return (
    <DeliveryShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">My Deliveries</h1>
          <p className="text-muted-foreground">
            Manage your assigned vehicle deliveries
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
              <TabsTrigger value="all" className="gap-2">
                <Truck className="h-4 w-4" />
                All
                <Badge variant="secondary" className="ml-1">
                  {deliveries?.length || 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="assigned" className="gap-2">
                <Clock className="h-4 w-4" />
                Pending
                <Badge variant="secondary" className="ml-1">
                  {pending.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="en_route" className="gap-2">
                <MapPin className="h-4 w-4" />
                Active
                <Badge variant="secondary" className="ml-1">
                  {inProgress.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <DeliveryGrid deliveries={deliveries || []} />
            </TabsContent>

            <TabsContent value="assigned" className="mt-6">
              <DeliveryGrid deliveries={pending} emptyMessage="No pending deliveries" />
            </TabsContent>

            <TabsContent value="en_route" className="mt-6">
              <DeliveryGrid deliveries={inProgress} emptyMessage="No active deliveries" />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DeliveryShell>
  );
}

function DeliveryGrid({ 
  deliveries, 
  emptyMessage = "No deliveries found" 
}: { 
  deliveries: ReturnType<typeof useMyDeliveries>["data"];
  emptyMessage?: string;
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
        <DeliveryCard key={delivery.id} delivery={delivery} />
      ))}
    </div>
  );
}
