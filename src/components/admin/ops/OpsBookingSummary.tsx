/**
 * OpsBookingSummary - Refactored booking summary panel for ops workflow
 * Shows customer, vehicle, payment, and status information
 * Updated: Now includes delivery status section for delivery bookings
 */
import { useState, useCallback, useMemo } from "react";
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
import { PVRT_DAILY_FEE, ACSRCH_DAILY_FEE, PST_RATE, GST_RATE } from "@/lib/pricing";
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
                  <span className="capitalize">{booking.protection_plan.replace(/_/g, " ")}</span>
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

function FinancialBreakdown({ booking }: { booking: any }) {
  const vehicleTotal = Number(booking.daily_rate) * booking.total_days;
  
  const vehicleCat = booking.vehicles?.category || "";
  const plan = booking.protection_plan && booking.protection_plan !== "none"
    ? getProtectionRateForCategory(booking.protection_plan, vehicleCat)
    : null;
  const protectionTotal = plan ? plan.rate * booking.total_days : 0;

  const addOnsTotal = (booking.addOns || []).reduce((sum: number, a: any) => sum + Number(a.price), 0);

  const drivers = booking.additionalDrivers || [];
  const driverDailyRate = 15.99;
  const youngDriverDailyRate = 15.00;
  const additionalDriversTotal = drivers.reduce((sum: number, d: any) => {
    const rate = d.driver_age_band === "20_24" ? youngDriverDailyRate : driverDailyRate;
    return sum + rate * booking.total_days;
  }, 0);

  const youngDriverFee = Number(booking.young_driver_fee) || 0;
  const differentDropoffFee = Number(booking.different_dropoff_fee) || 0;
  const upgradeFee = Number(booking.upgrade_daily_fee) > 0 ? Number(booking.upgrade_daily_fee) * booking.total_days : 0;
  const pvrt = PVRT_DAILY_FEE * booking.total_days;
  const acsrch = ACSRCH_DAILY_FEE * booking.total_days;

  const calculatedSubtotal = vehicleTotal + protectionTotal + addOnsTotal + additionalDriversTotal + youngDriverFee + differentDropoffFee + upgradeFee + pvrt + acsrch;
  const dbSubtotal = Number(booking.subtotal);
  const unitemized = Math.round((dbSubtotal - calculatedSubtotal) * 100) / 100;

  // Infer what the unitemized charges are (legacy bookings without stored records)
  const inferredDriverCount = unitemized > 0 ? Math.round(unitemized / (driverDailyRate * booking.total_days)) : 0;
  const isLikelyAdditionalDrivers = inferredDriverCount > 0 && Math.abs(unitemized - (inferredDriverCount * driverDailyRate * booking.total_days)) < 0.02;

  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex justify-between">
        <span className="text-muted-foreground">
          Vehicle ({booking.total_days} days × ${Number(booking.daily_rate).toFixed(2)}/day)
        </span>
        <span>${vehicleTotal.toFixed(2)}</span>
      </div>

      {plan && protectionTotal > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Protection ({plan.name}) × {booking.total_days}d
          </span>
          <span>${protectionTotal.toFixed(2)}</span>
        </div>
      )}

      {booking.addOns && booking.addOns.length > 0 && booking.addOns.map((addon: any) => (
        <div key={addon.id} className="flex justify-between">
          <span className="text-muted-foreground">
            {addon.add_ons?.name || "Add-on"}{addon.quantity > 1 ? ` ×${addon.quantity}` : ""}
          </span>
          <span>${Number(addon.price).toFixed(2)}</span>
        </div>
      ))}

      {additionalDriversTotal > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Additional Drivers ({drivers.length}) × {booking.total_days}d
          </span>
          <span>${additionalDriversTotal.toFixed(2)}</span>
        </div>
      )}

      {youngDriverFee > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Young Driver ($15.00/day × {booking.total_days}d)
          </span>
          <span>${youngDriverFee.toFixed(2)}</span>
        </div>
      )}

      {differentDropoffFee > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Different Drop-off Fee</span>
          <span>${differentDropoffFee.toFixed(2)}</span>
        </div>
      )}

      {upgradeFee > 0 && (
        <div className="flex justify-between text-emerald-600">
          <span>
            Upgrade (${Number(booking.upgrade_daily_fee).toFixed(2)}/day × {booking.total_days}d)
          </span>
          <span>${upgradeFee.toFixed(2)}</span>
        </div>
      )}

      <div className="flex justify-between">
        <span className="text-muted-foreground flex items-center gap-1">
          PVRT
          <span className="text-[10px]">(${PVRT_DAILY_FEE.toFixed(2)}/day)</span>
        </span>
        <span>${pvrt.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground flex items-center gap-1">
          ACSRCH
          <span className="text-[10px]">(${ACSRCH_DAILY_FEE.toFixed(2)}/day)</span>
        </span>
        <span>${acsrch.toFixed(2)}</span>
      </div>

      {unitemized > 0.01 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {isLikelyAdditionalDrivers
              ? `Additional Drivers (${inferredDriverCount}) × ${booking.total_days}d`
              : `Additional charges`}
          </span>
          <span>${unitemized.toFixed(2)}</span>
        </div>
      )}

      <Separator className="my-1" />

      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span>${dbSubtotal.toFixed(2)}</span>
      </div>

      {Number(booking.tax_amount) > 0 && (
        <>
          <div className="flex justify-between">
            <span className="text-muted-foreground">PST (7%)</span>
            <span>${(dbSubtotal * PST_RATE).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">GST (5%)</span>
            <span>${(dbSubtotal * GST_RATE).toFixed(2)}</span>
          </div>
        </>
      )}

      <Separator className="my-1" />

      <div className="flex justify-between font-semibold text-sm">
        <span>Total</span>
        <span>${Number(booking.total_amount).toFixed(2)}</span>
      </div>

      {booking.deposit_amount && (
        <div className="flex justify-between text-muted-foreground">
          <span>Deposit</span>
          <span>${Number(booking.deposit_amount).toFixed(2)}</span>
        </div>
      )}

      {Number(booking.late_return_fee) > 0 && (
        <div className="flex justify-between text-destructive">
          <span>Late Return Fee</span>
          <span>${Number(booking.late_return_fee).toFixed(2)}</span>
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
