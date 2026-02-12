/**
 * OpsBookingSummary - Refactored booking summary panel for ops workflow
 * Shows customer, vehicle, payment, and status information
 * Updated: Now includes delivery status section for delivery bookings
 */
const DEBUG_BOOKING_SUMMARY = false;
import { useState, useCallback, useMemo } from "react";
import { useDriverFeeSettings } from "@/hooks/use-driver-fee-settings";
import { displayName, formatPhone } from "@/lib/format-customer";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  User, 
  Car, 
  MapPin, 
  Calendar, 
  DollarSign,
  Phone,
  Mail,
  AlertTriangle,
  Clock,
  FileText,
  Eye,
  Copy,
  MessageSquare,
  ChevronsUpDown,
  ArrowUpCircle,
  Info,
  Bell,
  Truck,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { StepCompletion } from "@/lib/ops-steps";
import { DELIVERY_STATUS_MAP } from "@/lib/ops-steps";
import { UnifiedVehicleManager } from "@/components/admin/UnifiedVehicleManager";
import { PVRT_DAILY_FEE, ACSRCH_DAILY_FEE } from "@/lib/pricing";
import { getProtectionRateForCategory } from "@/lib/protection-groups";
import { CollapsibleSection } from "./sections/CollapsibleSection";
import { CardInfoSection } from "./sections/CardInfoSection";
import { OpsActivityTimeline } from "./OpsActivityTimeline";

interface OpsBookingSummaryProps {
  booking: any;
  completion?: StepCompletion;
  onOpenAgreement?: () => void;
  onOpenWalkaround?: () => void;
  isDelivery?: boolean;
  driverName?: string | null;
}

export function OpsBookingSummary({ 
  booking, 
  completion,
  onOpenAgreement,
  onOpenWalkaround,
  isDelivery = false,
  driverName,
}: OpsBookingSummaryProps) {
  const [allExpanded, setAllExpanded] = useState(true);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  
  // Track section states for controlled expand/collapse
  const [sectionStates, setSectionStates] = useState({
    customer: true,
    vehicle: true,
    rental: true,
    location: true,
    payment: true,
    status: true,
    delivery: true,
    notifications: true,
  });
  
  const vehicleName = booking.vehicles
    ? `${booking.vehicles.year} ${booking.vehicles.make} ${booking.vehicles.model}`
    : "No vehicle assigned";
  
  // Calculate red flags/alerts
  const alerts: { type: "error" | "warning"; message: string }[] = [];
  
  if (!completion?.payment.paymentComplete) {
    alerts.push({ type: "warning", message: "Payment pending" });
  }
  if (!completion?.payment.depositCollected) {
    alerts.push({ type: "warning", message: "Deposit not collected" });
  }
  if (!completion?.agreement.agreementSigned) {
    alerts.push({ type: "warning", message: "Agreement unsigned" });
  }
  if (!completion?.walkaround.inspectionComplete) {
    alerts.push({ type: "warning", message: "Walkaround not complete" });
  }
  
  const handleCopyBookingId = () => {
    navigator.clipboard.writeText(booking.booking_code);
    toast.success("Booking code copied");
  };
  
  const handleCallCustomer = () => {
    if (booking.profiles?.phone) {
      window.location.href = `tel:${booking.profiles.phone}`;
    }
  };
  
  const handleMessageCustomer = () => {
    if (booking.profiles?.email) {
      window.location.href = `mailto:${booking.profiles.email}`;
    }
  };
  
  const toggleAllSections = useCallback(() => {
    const newState = !allExpanded;
    setAllExpanded(newState);
    setSectionStates({
      customer: newState,
      vehicle: newState,
      rental: newState,
      location: newState,
      payment: newState,
      status: newState,
      delivery: newState,
      notifications: newState,
    });
  }, [allExpanded]);
  
  const updateSectionState = (section: keyof typeof sectionStates, value: boolean) => {
    setSectionStates(prev => ({ ...prev, [section]: value }));
  };
    
  return (
    <div className="h-full flex flex-col">
      {/* Header with expand/collapse all */}
      <div className="p-4 border-b shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            Booking Summary
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAllSections}
            className="h-7 text-xs"
          >
            <ChevronsUpDown className="h-3 w-3 mr-1" />
            {allExpanded ? "Collapse" : "Expand"}
          </Button>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-1 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleCopyBookingId}
          >
            <Copy className="h-3 w-3 mr-1" />
            {booking.booking_code}
          </Button>
          {booking.profiles?.phone && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleCallCustomer}
            >
              <Phone className="h-3 w-3" />
            </Button>
          )}
          {booking.profiles?.email && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleMessageCustomer}
            >
              <MessageSquare className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Red Flags / Alerts Strip */}
      {alerts.length > 0 && (
        <div className="p-3 border-b bg-amber-50 dark:bg-amber-950/20 shrink-0">
          <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            Attention Needed
          </div>
          <div className="space-y-1">
            {alerts.slice(0, 3).map((alert, i) => (
              <div 
                key={i}
                className={cn(
                  "text-xs px-2 py-1 rounded",
                  alert.type === "error" 
                    ? "bg-destructive/10 text-destructive" 
                    : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                )}
              >
                {alert.message}
              </div>
            ))}
            {alerts.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{alerts.length - 3} more issues
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Delivery Section - Only for delivery bookings (shown first) */}
          {isDelivery && (
            <>
              <CollapsibleSection
                title="Delivery Status"
                icon={<Truck className="h-4 w-4 text-blue-500" />}
                isOpen={sectionStates.delivery}
                onOpenChange={(open) => updateSectionState('delivery', open)}
                badge={
                  booking.delivery_statuses?.status && (
                    <Badge className={cn(
                      "text-[10px] px-1.5 py-0",
                      DELIVERY_STATUS_MAP[booking.delivery_statuses.status]?.color || "bg-muted"
                    )}>
                      {DELIVERY_STATUS_MAP[booking.delivery_statuses.status]?.label || booking.delivery_statuses.status}
                    </Badge>
                  )
                }
              >
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Deliver To</p>
                    <p className="font-medium text-xs break-words">{booking.pickup_address}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Driver</p>
                      <p className="font-medium text-xs">
                        {driverName || (booking.assigned_driver_id ? "Assigned" : "Unassigned")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] gap-1"
                      asChild
                    >
                      <Link to={`/delivery/${booking.id}`} target="_blank">
                        <ExternalLink className="h-3 w-3" />
                        Portal
                      </Link>
                    </Button>
                  </div>
                </div>
              </CollapsibleSection>
              
              <Separator />
            </>
          )}
          
          {/* Customer Section */}
          <CollapsibleSection
            title="Customer"
            icon={<User className="h-4 w-4 text-muted-foreground" />}
            isOpen={sectionStates.customer}
            onOpenChange={(open) => updateSectionState('customer', open)}
          >
            <div className="space-y-2 text-sm">
              <p className="font-medium">{displayName(booking.profiles?.full_name)}</p>
              {booking.profiles?.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate text-xs">{booking.profiles.email}</span>
                </div>
              )}
              {booking.profiles?.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span className="text-xs">{formatPhone(booking.profiles.phone)}</span>
                </div>
              )}
              {booking.driver_age_band && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Driver Age</span>
                  <Badge variant="outline" className="text-[10px]">{booking.driver_age_band}</Badge>
                </div>
              )}
              {booking.profiles?.driver_license_status && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">License</span>
                  <Badge 
                    variant="outline" 
                    className={cn("text-[10px]",
                      booking.profiles.driver_license_status === "verified" && "border-emerald-500 text-emerald-600",
                      booking.profiles.driver_license_status === "pending" && "border-amber-500 text-amber-600",
                      booking.profiles.driver_license_status === "rejected" && "border-destructive text-destructive",
                    )}
                  >
                    {booking.profiles.driver_license_status}
                  </Badge>
                </div>
              )}
              {booking.booking_source && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Source</span>
                  <span className="capitalize">{booking.booking_source}</span>
                </div>
              )}
            </div>
          </CollapsibleSection>
          
          <Separator />
          
          {/* Vehicle Section */}
          <CollapsibleSection
            title="Vehicle"
            icon={<Car className="h-4 w-4 text-muted-foreground" />}
            isOpen={sectionStates.vehicle}
            onOpenChange={(open) => updateSectionState('vehicle', open)}
          >
            <div className="space-y-2 text-sm">
              <p className="font-medium">{vehicleName}</p>
              {booking.vehicles?.category && (
                <Badge variant="outline" className="text-xs">
                  {booking.vehicles.category}
                </Badge>
              )}
              
              {/* Category Upgrade Button - only if not yet handed over */}
              {booking.status !== "active" && booking.status !== "completed" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 gap-2 text-xs"
                  onClick={() => setShowUpgradeDialog(true)}
                >
                  <ArrowUpCircle className="h-3.5 w-3.5" />
                  Change/Upgrade Category
                </Button>
              )}
              
              {/* Show upgrade indicator if upgraded */}
              {booking.original_vehicle_id && booking.original_vehicle_id !== booking.vehicle_id && (
                <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  Upgraded
                </Badge>
              )}
              
              {/* Show assigned VIN and Plate for admin */}
              {booking.vehicle_units && (
                <div className="mt-2 p-2 bg-muted rounded-md space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">VIN:</span>
                    <span className="font-mono font-medium">{booking.vehicle_units.vin}</span>
                  </div>
                  {booking.vehicle_units.license_plate && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Plate:</span>
                      <span className="font-mono font-medium">{booking.vehicle_units.license_plate}</span>
                    </div>
                  )}
                </div>
              )}
              {!booking.vehicle_units && booking.assigned_unit_id && (
                <p className="text-xs text-muted-foreground">
                  Unit ID: {booking.assigned_unit_id.slice(0, 8)}...
                </p>
              )}
              {!booking.assigned_unit_id && (
                <p className="text-xs text-amber-600">
                  No unit assigned yet
                </p>
              )}
            </div>
          </CollapsibleSection>
          
          <Separator />
          
          {/* Rental Period Section */}
          <CollapsibleSection
            title="Rental Period"
            icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
            isOpen={sectionStates.rental}
            onOpenChange={(open) => updateSectionState('rental', open)}
          >
            <div className="space-y-2 text-sm">
              <div className="p-2 rounded-md bg-muted/50 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Pickup</span>
                  <span className="font-semibold">{format(new Date(booking.start_at), "EEE, MMM d, yyyy")}</span>
                </div>
                <div className="flex justify-end text-[10px] text-muted-foreground">
                  {format(new Date(booking.start_at), "h:mm a")}
                </div>
              </div>
              <div className="p-2 rounded-md bg-muted/50 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Return</span>
                  <span className="font-semibold">{format(new Date(booking.end_at), "EEE, MMM d, yyyy")}</span>
                </div>
                <div className="flex justify-end text-[10px] text-muted-foreground">
                  {format(new Date(booking.end_at), "h:mm a")}
                </div>
              </div>
              <div className="flex justify-between text-xs pt-1">
                <span className="text-muted-foreground">Duration</span>
                <Badge variant="outline" className="text-[10px]">{booking.total_days} days</Badge>
              </div>
              {booking.protection_plan && booking.protection_plan !== "none" && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Protection</span>
                  <span>{PROTECTION_PLAN_LABELS[booking.protection_plan] || booking.protection_plan}</span>
                </div>
              )}
            </div>
          </CollapsibleSection>
          
          <Separator />
          
          {/* Location Section */}
          <CollapsibleSection
            title={booking.pickup_address ? "Delivery" : "Pickup Location"}
            icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
            isOpen={sectionStates.location}
            onOpenChange={(open) => updateSectionState('location', open)}
          >
            <div className="space-y-2 text-sm">
              {booking.pickup_address ? (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Delivery Address</p>
                    <p className="font-medium text-xs break-words">{booking.pickup_address}</p>
                  </div>
                  {booking.locations?.name && (
                    <p className="text-muted-foreground text-xs italic">
                      Dispatched from: {booking.locations.name}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="font-medium text-xs">{booking.locations?.name || "Unknown"}</p>
                  {booking.locations?.address && (
                    <p className="text-muted-foreground text-xs">
                      {booking.locations.address}
                    </p>
                  )}
                </>
              )}
            </div>
          </CollapsibleSection>
          
          <Separator />
          
          {/* Financials Section */}
          <CollapsibleSection
            title="Payment"
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            isOpen={sectionStates.payment}
            onOpenChange={(open) => updateSectionState('payment', open)}
            badge={
              !completion?.payment.paymentComplete && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500 text-amber-600">
                  Unpaid
                </Badge>
              )
            }
          >
            <div className="space-y-3">
              {/* Card on File - Prominent Display */}
              <CardInfoSection 
                cardLastFour={booking.card_last_four}
                cardType={booking.card_type}
                cardHolderName={booking.card_holder_name}
              />
              
              {/* Full Itemized Financial Breakdown */}
              <FinancialBreakdown booking={booking} />
            </div>
          </CollapsibleSection>
          
          <Separator />
          
          {/* Status Section */}
          <CollapsibleSection
            title="Status"
            icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            isOpen={sectionStates.status}
            onOpenChange={(open) => updateSectionState('status', open)}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge 
                  className={cn(
                    "text-xs",
                    booking.status === "active" && "bg-emerald-500",
                    booking.status === "confirmed" && "bg-blue-500",
                    booking.status === "cancelled" && "bg-destructive",
                    booking.status === "pending" && "bg-amber-500"
                  )}
                >
                  {booking.status}
                </Badge>
              </div>
              
              {/* Quick status indicators */}
              <div className="grid grid-cols-2 gap-1 text-xs">
                <StatusIndicator 
                  label="Payment" 
                  done={completion?.payment.paymentComplete} 
                />
                <StatusIndicator 
                  label="Deposit" 
                  done={completion?.payment.depositCollected} 
                />
                <StatusIndicator 
                  label="Agreement" 
                  done={completion?.agreement.agreementSigned} 
                />
                <StatusIndicator 
                  label="Walkaround" 
                  done={completion?.walkaround.inspectionComplete} 
                />
              </div>
            </div>
          </CollapsibleSection>
          
          {/* Notifications Section */}
          <Separator />
          <CollapsibleSection
            title="Notifications"
            icon={<Bell className="h-4 w-4 text-muted-foreground" />}
            isOpen={sectionStates.notifications}
            onOpenChange={(open) => updateSectionState('notifications', open)}
            badge={
              booking.notifications?.length > 0 ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {booking.notifications.length} sent
                </Badge>
              ) : null
            }
          >
            <NotificationStatusList notifications={booking.notifications || []} />
          </CollapsibleSection>
          
          {/* Quick Links */}
          <Separator />
          <div className="p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase">Quick Links</p>
            <div className="flex flex-col gap-1">
              {onOpenAgreement && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start h-7 text-xs"
                  onClick={onOpenAgreement}
                >
                  <FileText className="h-3 w-3 mr-2" />
                  Open Agreement
                </Button>
              )}
              {onOpenWalkaround && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start h-7 text-xs"
                  onClick={onOpenWalkaround}
                >
                  <Eye className="h-3 w-3 mr-2" />
                  Open Walkaround
                </Button>
              )}
            </div>
          </div>
          
          {/* Activity Timeline */}
          <Separator />
          <div className="p-2">
            <OpsActivityTimeline bookingId={booking.id} />
          </div>
        </div>
      </ScrollArea>
      
      {/* Vehicle Change Dialog */}
      <UnifiedVehicleManager
        bookingId={booking.id}
        booking={booking}
        dialogOnly
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
      />
    </div>
  );
}

// Protection plan display labels
const PROTECTION_PLAN_LABELS: Record<string, string> = {
  premium: "All Inclusive Coverage",
  smart: "Smart Coverage",
  basic: "Basic Coverage",
  none: "No Coverage",
};

// Bookings created after this date MUST have all charges as explicit DB rows.
// Any remaining delta for post-fix bookings is logged as an error.
const FIX_DEPLOY_DATE = "2026-02-12T00:00:00Z";

// ========== Cents-based helpers ==========
function toCents(n: number | string | null | undefined): number {
  return Math.round(Number(n || 0) * 100);
}
function fromCents(c: number): string {
  return (c / 100).toFixed(2);
}

function FinancialBreakdown({ booking }: { booking: any }) {
  const { data: driverFeeSettings } = useDriverFeeSettings();
  const driverDailyRate = driverFeeSettings?.additionalDriverDailyRate ?? 14.99;
  const youngDriverDailyRate = driverFeeSettings?.youngAdditionalDriverDailyRate ?? 19.99;
  const totalDays = booking.total_days ?? 0;

  // --- Normalize data (snake_case from DB) ---
  const bookingAddOns: any[] = booking.addOns ?? booking.booking_add_ons ?? [];
  const additionalDrivers: any[] = booking.additionalDrivers ?? booking.booking_additional_drivers ?? [];

  // --- All math in integer cents ---
  const vehicleCents = toCents(booking.daily_rate) * totalDays;

  const vehicleCat = booking.vehicles?.category || "";
  const plan = booking.protection_plan && booking.protection_plan !== "none"
    ? getProtectionRateForCategory(booking.protection_plan, vehicleCat)
    : null;
  const protectionCents = plan ? toCents(plan.rate) * totalDays : 0;

  const addOnsCents = bookingAddOns.reduce((sum: number, a: any) => {
    const qty = Number(a.quantity) || 1;
    return sum + toCents(a.price) * qty;
  }, 0);

  const driversCents = additionalDrivers.reduce((sum: number, d: any) => {
    // Use stored young_driver_fee if present on the driver row, else compute from rate
    const fee = Number(d.young_driver_fee);
    if (fee > 0) return sum + toCents(fee);
    const rate = d.driver_age_band === "20_24" ? youngDriverDailyRate : driverDailyRate;
    return sum + toCents(rate) * totalDays;
  }, 0);

  const youngRenterCents = toCents(booking.young_driver_fee);
  const dropoffCents = toCents(booking.different_dropoff_fee);
  const upgradeDailyCents = toCents(booking.upgrade_daily_fee);
  const upgradeCents = upgradeDailyCents > 0 ? upgradeDailyCents * totalDays : 0;
  const pvrtCents = toCents(PVRT_DAILY_FEE) * totalDays;
  const acsrchCents = toCents(ACSRCH_DAILY_FEE) * totalDays;

  const itemizedCents = vehicleCents + protectionCents + addOnsCents + driversCents
    + youngRenterCents + dropoffCents + upgradeCents + pvrtCents + acsrchCents;

  const dbSubtotalCents = toCents(booking.subtotal);
  const deltaCents = dbSubtotalCents - itemizedCents;

  // --- Strict inference: only if no driver rows exist ---
  let inferredRow: { label: string; cents: number } | null = null;
  let manualAdjustmentCents = 0;

  const isPostFix = booking.created_at && new Date(booking.created_at).getTime() >= new Date(FIX_DEPLOY_DATE).getTime();

  if (deltaCents > 0 && additionalDrivers.length === 0) {
    // Try standard rate then young rate, for N in [1..4]
    let matched = false;
    for (const { rate, label } of [
      { rate: driverDailyRate, label: "Standard" },
      { rate: youngDriverDailyRate, label: "Young" },
    ]) {
      const perDriverCents = toCents(rate) * totalDays;
      if (perDriverCents <= 0) continue;
      for (let n = 1; n <= 4; n++) {
        const expected = perDriverCents * n;
        if (Math.abs(deltaCents - expected) <= 1) {
          inferredRow = {
            label: `Additional Driver${n > 1 ? "s" : ""} – ${label} (${n} × $${rate.toFixed(2)}/day × ${totalDays}d)`,
            cents: expected,
          };
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
    if (!matched) {
      if (isPostFix) {
        // Post-fix: log error, never show Manual Adjustment
        console.error(`[OPS_BREAKDOWN_ERROR] Post-fix booking ${booking.booking_code} has unresolved delta: ${deltaCents} cents`);
      } else {
        manualAdjustmentCents = deltaCents;
      }
    }
  } else if (deltaCents > 0) {
    if (isPostFix) {
      console.error(`[OPS_BREAKDOWN_ERROR] Post-fix booking ${booking.booking_code} has unresolved delta: ${deltaCents} cents`);
    } else {
      manualAdjustmentCents = deltaCents;
    }
  }

  // Tax from DB
  const dbTaxCents = toCents(booking.tax_amount);
  const dbTotalCents = toCents(booking.total_amount);

  if (DEBUG_BOOKING_SUMMARY) {
    console.log("OPS_BREAKDOWN", {
      code: booking.booking_code,
      vehicleCents, protectionCents, addOnsCents, driversCents,
      youngRenterCents, dropoffCents, upgradeCents, pvrtCents, acsrchCents,
      itemizedCents, dbSubtotalCents, deltaCents,
      inferredRow, manualAdjustmentCents,
      dbTaxCents, dbTotalCents,
      rawAddOns: bookingAddOns,
      rawDrivers: additionalDrivers,
    });
  }

  return (
    <div className="space-y-1.5 text-xs">
      {/* Vehicle */}
      <div className="flex justify-between">
        <span className="text-muted-foreground">
          Vehicle ({totalDays}d × ${Number(booking.daily_rate).toFixed(2)}/day)
        </span>
        <span>${fromCents(vehicleCents)}</span>
      </div>

      {/* Protection */}
      {plan && protectionCents > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {PROTECTION_PLAN_LABELS[booking.protection_plan] || plan.name} (${plan.rate.toFixed(2)}/day × {totalDays}d)
          </span>
          <span>${fromCents(protectionCents)}</span>
        </div>
      )}

      {/* Add-ons from DB rows */}
      {bookingAddOns.map((addon: any) => {
        const qty = Number(addon.quantity) || 1;
        const total = toCents(addon.price) * qty;
        return (
          <div key={addon.id} className="flex justify-between">
            <span className="text-muted-foreground">
              {addon.add_ons?.name || "Add-on"}{qty > 1 ? ` ×${qty}` : ""}
            </span>
            <span>${fromCents(total)}</span>
          </div>
        );
      })}

      {/* Additional Drivers from DB rows */}
      {additionalDrivers.map((d: any, i: number) => {
        const isYoung = d.driver_age_band === "20_24";
        const fee = Number(d.young_driver_fee);
        const rate = isYoung ? youngDriverDailyRate : driverDailyRate;
        const displayCents = fee > 0 ? toCents(fee) : toCents(rate) * totalDays;
        return (
          <div key={d.id || i} className="flex justify-between">
            <span className="text-muted-foreground">
              {d.driver_name || `Driver ${i + 1}`} ({isYoung ? "Young" : "Standard"}, ${rate.toFixed(2)}/day × {totalDays}d)
            </span>
            <span>${fromCents(displayCents)}</span>
          </div>
        );
      })}

      {/* Young Renter Fee (primary renter) */}
      {youngRenterCents > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Young Renter Fee{totalDays > 0 ? ` (~$${fromCents(Math.round(youngRenterCents / totalDays))}/day × ${totalDays}d)` : ""}
          </span>
          <span>${fromCents(youngRenterCents)}</span>
        </div>
      )}

      {/* Different Drop-off */}
      {dropoffCents > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Different Drop-off Fee</span>
          <span>${fromCents(dropoffCents)}</span>
        </div>
      )}

      {/* Upgrade */}
      {upgradeCents > 0 && (
        <div className="flex justify-between text-emerald-600">
          <span>Upgrade (${Number(booking.upgrade_daily_fee).toFixed(2)}/day × {totalDays}d)</span>
          <span>${fromCents(upgradeCents)}</span>
        </div>
      )}

      {/* Regulatory fees */}
      <div className="flex justify-between">
        <span className="text-muted-foreground flex items-center gap-1">
          PVRT <span className="text-[10px]">(${PVRT_DAILY_FEE.toFixed(2)}/day)</span>
        </span>
        <span>${fromCents(pvrtCents)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground flex items-center gap-1">
          ACSRCH <span className="text-[10px]">(${ACSRCH_DAILY_FEE.toFixed(2)}/day)</span>
        </span>
        <span>${fromCents(acsrchCents)}</span>
      </div>

      {/* Inferred Additional Driver (strict match only) */}
      {inferredRow && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">{inferredRow.label}</span>
          <span>${fromCents(inferredRow.cents)}</span>
        </div>
      )}

      {/* Manual Adjustment (admin-only fallback) */}
      {manualAdjustmentCents > 0 && (
        <div className="flex justify-between text-amber-600">
          <span className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            Manual Adjustment
          </span>
          <span>${fromCents(manualAdjustmentCents)}</span>
        </div>
      )}

      <Separator className="my-1" />

      {/* Subtotal */}
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span>${fromCents(dbSubtotalCents)}</span>
      </div>

      {/* Tax — single DB-driven line */}
      {dbTaxCents > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax (PST+GST)</span>
          <span>${fromCents(dbTaxCents)}</span>
        </div>
      )}

      <Separator className="my-1" />

      {/* Total */}
      <div className="flex justify-between font-semibold text-sm">
        <span>Total</span>
        <span>${fromCents(dbTotalCents)}</span>
      </div>

      {/* Deposit */}
      {toCents(booking.deposit_amount) > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>Deposit</span>
          <span>${fromCents(toCents(booking.deposit_amount))}</span>
        </div>
      )}

      {/* Late Return Fee */}
      {toCents(booking.late_return_fee) > 0 && (
        <div className="flex justify-between text-destructive">
          <span>Late Return Fee</span>
          <span>${fromCents(toCents(booking.late_return_fee))}</span>
        </div>
      )}
    </div>
  );
}

function StatusIndicator({ label, done }: { label: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <div className={cn(
        "w-2 h-2 rounded-full",
        done ? "bg-emerald-500" : "bg-muted-foreground/30"
      )} />
      <span className={done ? "text-foreground" : ""}>{label}</span>
    </div>
  );
}

// Notification type labels for human-readable display
const NOTIFICATION_LABELS: Record<string, string> = {
  payment_received: "Payment Received",
  license_approved: "License Approved",
  license_rejected: "License Rejected",
  vehicle_assigned: "Vehicle Assigned",
  agreement_generated: "Agreement Generated",
  agreement_signed: "Agreement Signed",
  checkin_complete: "Check-in Complete",
  prep_complete: "Prep Complete",
  walkaround_complete: "Walkaround Complete",
  rental_activated: "Rental Activated",
  return_initiated: "Return Initiated",
  rental_completed: "Rental Completed",
  deposit_released: "Deposit Released",
};

// All expected notification stages in order
const NOTIFICATION_STAGES = [
  "payment_received",
  "license_approved",
  "vehicle_assigned",
  "agreement_generated",
  "agreement_signed",
  "checkin_complete",
  "prep_complete",
  "walkaround_complete",
  "rental_activated",
  "return_initiated",
  "rental_completed",
  "deposit_released",
];

function NotificationStatusList({ notifications }: { notifications: any[] }) {
  const sentTypes = new Set(
    notifications
      .filter((n) => n.status === "sent" || n.status === "delivered")
      .map((n) => n.notification_type)
  );
  const failedTypes = new Set(
    notifications.filter((n) => n.status === "failed").map((n) => n.notification_type)
  );

  if (notifications.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-1">No notifications sent yet</p>
    );
  }

  return (
    <div className="space-y-1">
      {NOTIFICATION_STAGES.map((stage) => {
        const isSent = sentTypes.has(stage);
        const isFailed = failedTypes.has(stage);
        const log = notifications.find((n) => n.notification_type === stage);

        if (!isSent && !isFailed) return null;

        return (
          <div key={stage} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  isSent ? "bg-emerald-500" : "bg-destructive"
                )}
              />
              <span className={isSent ? "text-foreground" : "text-destructive"}>
                {NOTIFICATION_LABELS[stage] || stage}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {log?.channel === "sms" ? "SMS" : log?.channel === "email" ? "Email" : log?.channel || ""}
              {log?.sent_at ? ` · ${format(new Date(log.sent_at), "MMM d, h:mm a")}` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
