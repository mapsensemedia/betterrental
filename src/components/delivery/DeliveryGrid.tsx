import { Truck } from "lucide-react";
import { DeliveryCard } from "@/components/delivery/DeliveryCard";
import type { DeliveryBooking } from "@/hooks/use-my-deliveries";

export function DeliveryGrid({
  deliveries,
  emptyMessage = "No deliveries found",
  showAssignButton = false,
  onAssignDriver,
  showClaimButton = false,
  onClaimDelivery,
  claimingId,
}: {
  deliveries: DeliveryBooking[];
  emptyMessage?: string;
  showAssignButton?: boolean;
  onAssignDriver?: (delivery: DeliveryBooking) => void;
  showClaimButton?: boolean;
  onClaimDelivery?: (delivery: DeliveryBooking) => void;
  claimingId?: string | null;
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
          showClaimButton={showClaimButton && delivery.deliveryStatus === "unassigned"}
          onClaimDelivery={onClaimDelivery ? () => onClaimDelivery(delivery) : undefined}
          claimLoading={!!claimingId && claimingId === delivery.id}
        />
      ))}
    </div>
  );
}
