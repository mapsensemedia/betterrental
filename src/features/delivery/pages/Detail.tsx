import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DeliveryShell } from "@/components/delivery/DeliveryShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RentalAgreementPanel } from "@/components/admin/RentalAgreementPanel";
import { RentalAgreementSign } from "@/components/booking/RentalAgreementSign";
import { StepWalkaround } from "@/components/admin/ops/steps/StepWalkaround";
import { StepPhotos } from "@/components/admin/ops/steps/StepPhotos";
import { displayName } from "@/lib/format-customer";
import { DELIVERY_PORTAL_STEPS, type OpsStep } from "@/lib/ops-steps";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Clock,
  Building2,
  Navigation,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Feature imports
import {
  useDeliveryDetail,
  useHandoverChecklist,
  useRealtimeDeliveryDetail,
  StatusBadge,
  DeliveryActions,
  HandoverChecklist,
  type DeliveryStatus,
} from "@/features/delivery";

// ─────────────────────────────────────────────────────────────────────────────
// STEP COMPLETION LOGIC
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_ORDER: DeliveryStatus[] = [
  "unassigned", "assigned", "picked_up", "en_route", "arrived", "delivered",
];

function isStatusAtOrPast(current: DeliveryStatus | null | undefined, target: DeliveryStatus): boolean {
  if (!current) return false;
  const ci = STATUS_ORDER.indexOf(current);
  const ti = STATUS_ORDER.indexOf(target);
  if (ci === -1 || ti === -1) return false;
  return ci >= ti;
}

interface PortalStepState {
  stepId: string;
  complete: boolean;
  active: boolean;
}

function computePortalSteps(
  deliveryStatus: DeliveryStatus | null | undefined,
  agreementSigned: boolean,
  walkaroundDone: boolean,
  photosUploaded: boolean,
  handoverDone: boolean,
): PortalStepState[] {
  const steps = DELIVERY_PORTAL_STEPS.map((step) => {
    let complete = false;
    switch (step.id) {
      case "en_route":
        complete = isStatusAtOrPast(deliveryStatus, "en_route");
        break;
      case "arrived":
        complete = isStatusAtOrPast(deliveryStatus, "arrived");
        break;
      case "agreement":
        complete = agreementSigned;
        break;
      case "walkaround":
        complete = walkaroundDone;
        break;
      case "photos":
        complete = photosUploaded;
        break;
      case "handover":
        complete = handoverDone;
        break;
    }
    return { stepId: step.id, complete, active: false };
  });

  // First incomplete step is active
  const firstIncomplete = steps.findIndex((s) => !s.complete);
  if (firstIncomplete >= 0) {
    steps[firstIncomplete].active = true;
  }

  return steps;
}

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY DETAIL PAGE (SEQUENTIAL STEP WIZARD)
// ─────────────────────────────────────────────────────────────────────────────

export default function DeliveryDetail() {
  const { id: bookingId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [manualStepOverride, setManualStepOverride] = useState<string | null>(null);

  // Realtime
  useRealtimeDeliveryDetail(bookingId);

  // Fetch delivery detail
  const { data: delivery, isLoading, error } = useDeliveryDetail(bookingId);
  const checklist = useHandoverChecklist(delivery);

  // Check if agreement is signed
  const { data: agreementData } = useQuery({
    queryKey: ["rental-agreement-status", bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      const { data } = await supabase
        .from("rental_agreements")
        .select("id, status, customer_signed_at")
        .eq("booking_id", bookingId)
        .neq("status", "voided")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!bookingId,
  });

  // Check walkaround/inspection
  const { data: inspectionData } = useQuery({
    queryKey: ["delivery-inspection", bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      const { data } = await supabase
        .from("inspection_metrics")
        .select("id")
        .eq("booking_id", bookingId)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!bookingId,
  });

  // Check handover photos count
  const { data: photoCount = 0 } = useQuery({
    queryKey: ["delivery-handover-photos", bookingId],
    queryFn: async () => {
      if (!bookingId) return 0;
      const { count } = await supabase
        .from("condition_photos")
        .select("id", { count: "exact", head: true })
        .eq("booking_id", bookingId)
        .eq("phase", "delivery");
      return count || 0;
    },
    enabled: !!bookingId,
  });

  const agreementSigned = !!agreementData?.customer_signed_at;
  const walkaroundDone = !!inspectionData;
  const photosUploaded = photoCount >= 1;
  const handoverDone = delivery?.deliveryStatus === "delivered";

  const portalSteps = useMemo(
    () =>
      computePortalSteps(
        delivery?.deliveryStatus,
        agreementSigned,
        walkaroundDone,
        photosUploaded,
        handoverDone,
      ),
    [delivery?.deliveryStatus, agreementSigned, walkaroundDone, photosUploaded, handoverDone],
  );

  const activeStepId =
    manualStepOverride || portalSteps.find((s) => s.active)?.stepId || portalSteps[0]?.stepId;

  if (isLoading) {
    return (
      <DeliveryShell>
        <DeliveryDetailSkeleton />
      </DeliveryShell>
    );
  }

  if (error || !delivery) {
    return (
      <DeliveryShell>
        <div className="flex flex-col items-center justify-center py-16">
          <h2 className="text-lg font-medium mb-2">Delivery Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This delivery may have been cancelled or doesn't exist.
          </p>
          <Button variant="outline" onClick={() => navigate("/delivery")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deliveries
          </Button>
        </div>
      </DeliveryShell>
    );
  }

  const isToday = new Date(delivery.startAt).toDateString() === new Date().toDateString();

  return (
    <DeliveryShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/delivery")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">{delivery.bookingCode}</h1>
              <StatusBadge status={delivery.deliveryStatus} showIcon />
            </div>
            <p className="text-sm text-muted-foreground">
              {delivery.customer?.fullName || "Customer"} •{" "}
              {isToday ? "Today" : format(new Date(delivery.startAt), "MMM d")}{" "}
              {format(new Date(delivery.startAt), "h:mm a")}
            </p>
          </div>
        </div>

        {/* Step Progress Bar */}
        <Card>
          <CardContent className="py-4">
            <PortalStepProgress
              steps={DELIVERY_PORTAL_STEPS}
              stepStates={portalSteps}
              activeStepId={activeStepId}
              onStepClick={(id) => setManualStepOverride(id)}
            />
          </CardContent>
        </Card>

        {/* Active Step Content */}
        <div className="min-h-[300px]">
          {activeStepId === "en_route" && (
            <StepEnRouteContent delivery={delivery} />
          )}
          {activeStepId === "arrived" && (
            <StepArrivedContent delivery={delivery} />
          )}
          {activeStepId === "agreement" && bookingId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rental Agreement</CardTitle>
              </CardHeader>
              <CardContent>
                {agreementSigned ? (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Check className="h-5 w-5" />
                    <span className="font-medium">Agreement signed by customer</span>
                  </div>
                ) : (
                  <RentalAgreementSign bookingId={bookingId} />
                )}
              </CardContent>
            </Card>
          )}
          {activeStepId === "walkaround" && bookingId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vehicle Walkaround</CardTitle>
              </CardHeader>
              <CardContent>
                <StepWalkaround
                  bookingId={bookingId}
                  completion={{
                    inspectionComplete: walkaroundDone,
                    fuelRecorded: false,
                    odometerRecorded: false,
                  }}
                />
              </CardContent>
            </Card>
          )}
          {activeStepId === "photos" && bookingId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Handover Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <StepPhotos
                  bookingId={bookingId}
                  completion={{ photosComplete: photosUploaded }}
                />
              </CardContent>
            </Card>
          )}
          {activeStepId === "handover" && (
            <div className="space-y-4">
              <HandoverChecklist checklist={checklist} />
              <DeliveryActions
                bookingId={delivery.id}
                currentStatus={delivery.deliveryStatus}
                onComplete={() => navigate("/delivery")}
              />
            </div>
          )}
        </div>

        {/* Quick Info Cards (collapsible context) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Delivery Address */}
          {delivery.pickupAddress && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Deliver To
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">{delivery.pickupAddress}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    const dest =
                      delivery.pickupLat && delivery.pickupLng
                        ? `${delivery.pickupLat},${delivery.pickupLng}`
                        : encodeURIComponent(delivery.pickupAddress || "");
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${dest}`,
                      "_blank",
                    );
                  }}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Navigate
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Customer Contact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium text-sm">
                {delivery.pickupContactName || delivery.customer?.fullName || "Customer"}
              </p>
              {delivery.pickupContactPhone && (
                <a
                  href={`tel:${delivery.pickupContactPhone}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Phone className="h-3 w-3" />
                  {delivery.pickupContactPhone}
                </a>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Special Instructions */}
        {delivery.specialInstructions && (
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30">
            <CardContent className="py-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Special Instructions</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">{delivery.specialInstructions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DeliveryShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTAL STEP PROGRESS
// ─────────────────────────────────────────────────────────────────────────────

function PortalStepProgress({
  steps,
  stepStates,
  activeStepId,
  onStepClick,
}: {
  steps: OpsStep[];
  stepStates: PortalStepState[];
  activeStepId: string;
  onStepClick: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, index) => {
        const state = stepStates[index];
        const isActive = step.id === activeStepId;
        return (
          <button
            key={step.id}
            onClick={() => onStepClick(step.id)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1.5 py-2 px-1 rounded-lg transition-colors cursor-pointer",
              isActive && "bg-primary/5",
            )}
          >
            {/* Circle */}
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                state?.complete
                  ? "bg-primary text-primary-foreground"
                  : isActive
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {state?.complete ? <Check className="h-4 w-4" /> : step.number}
            </div>
            {/* Label */}
            <span
              className={cn(
                "text-[10px] leading-tight text-center font-medium",
                isActive ? "text-primary" : state?.complete ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EN ROUTE STEP CONTENT
// ─────────────────────────────────────────────────────────────────────────────

function StepEnRouteContent({ delivery }: { delivery: any }) {
  const isEnRoute = isStatusAtOrPast(delivery.deliveryStatus, "en_route");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Navigation className="h-4 w-4" />
          En Route to Customer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEnRoute ? (
          <div className="flex items-center gap-2 text-emerald-600">
            <Check className="h-5 w-5" />
            <span className="font-medium">Marked En Route</span>
          </div>
        ) : (
          <>
            {delivery.pickupAddress && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">Destination</p>
                <p className="text-sm text-muted-foreground">{delivery.pickupAddress}</p>
              </div>
            )}
            <DeliveryActions
              bookingId={delivery.id}
              currentStatus={delivery.deliveryStatus}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ARRIVED STEP CONTENT
// ─────────────────────────────────────────────────────────────────────────────

function StepArrivedContent({ delivery }: { delivery: any }) {
  const isArrived = isStatusAtOrPast(delivery.deliveryStatus, "arrived");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Arrived at Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isArrived ? (
          <div className="flex items-center gap-2 text-emerald-600">
            <Check className="h-5 w-5" />
            <span className="font-medium">Arrived — ready for handover</span>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Mark yourself as arrived when you reach the customer's location.
            </p>
            <DeliveryActions
              bookingId={delivery.id}
              currentStatus={delivery.deliveryStatus}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOADING SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function DeliveryDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-lg" />
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-32 w-full rounded-lg" />
      ))}
    </div>
  );
}
