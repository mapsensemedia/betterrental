/**
 * OpsPickups - Pickup/Handover list for ops staff
 * Mirrors the admin Pickups UI (icons, layout, badges, copy) so the two panels
 * are visually consistent. Reuses the same `useHandovers` data source so
 * readiness signals (payment, verification, vehicle, buffer) match admin.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import {
  KeyRound,
  Search,
  Clock,
  Car,
  MapPin,
  Calendar,
  Play,
  Flag,
  RefreshCw,
  CreditCard,
  FileCheck,
  Sparkles,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { OpsShell } from "@/components/ops/OpsShell";
import {
  DeliveryBadge,
} from "@/components/admin/DeliveryDetailsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useHandovers, type HandoverBooking } from "@/hooks/use-handovers";
import { useUpdateBookingStatus } from "@/hooks/use-bookings";
import { useCreateAlert } from "@/hooks/use-alerts";
import {
  OpsLocationFilter,
  useOpsLocationFilter,
} from "@/components/ops/OpsLocationFilter";

type DateFilter = "today" | "next24h" | "week" | "month" | "all";

const ReadinessBadge = ({
  ok,
  label,
  icon: Icon,
}: {
  ok: boolean;
  label: string;
  icon: any;
}) => (
  <div
    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
      ok
        ? "bg-emerald-500/10 text-emerald-600"
        : "bg-destructive/10 text-destructive"
    }`}
  >
    <Icon className="h-3 w-3" />
    {label}
  </div>
);

export default function OpsPickups() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("month");
  const locationFilter = useOpsLocationFilter();

  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistBooking, setChecklistBooking] =
    useState<HandoverBooking | null>(null);
  const [checklistState, setChecklistState] = useState({
    verificationConfirmed: false,
    paymentConfirmed: false,
    inspectionConfirmed: false,
    notes: "",
  });

  const { data: handovers = [], isLoading, refetch } = useHandovers(
    dateFilter,
    locationFilter || undefined,
  );
  const updateStatus = useUpdateBookingStatus();
  const createAlert = useCreateAlert();

  const filteredBookings = handovers.filter((booking) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      booking.bookingCode?.toLowerCase().includes(s) ||
      booking.profile?.fullName?.toLowerCase().includes(s) ||
      booking.profile?.email?.toLowerCase().includes(s) ||
      booking.vehicle?.make?.toLowerCase().includes(s) ||
      booking.vehicle?.model?.toLowerCase().includes(s)
    );
  });

  const getDateLabel = (dateStr: string) => {
    const d = parseISO(dateStr);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    return format(d, "MMM d");
  };

  const groupedBookings = filteredBookings.reduce(
    (acc, booking) => {
      const key = format(parseISO(booking.startAt), "yyyy-MM-dd");
      if (!acc[key]) acc[key] = [];
      acc[key].push(booking);
      return acc;
    },
    {} as Record<string, HandoverBooking[]>,
  );

  const getReadinessScore = (b: HandoverBooking) => {
    let s = 0;
    if (b.paymentStatus === "paid") s++;
    if (b.verificationStatus === "verified") s++;
    if (b.vehicleReady) s++;
    if (b.bufferCleared) s++;
    return s;
  };

  const handleStartHandover = (booking: HandoverBooking) => {
    // Direct path to the wizard — no intermediate detail page
    navigate(`/ops/booking/${booking.id}/handover`);
  };

  const handleOpenChecklist = (booking: HandoverBooking) => {
    setChecklistBooking(booking);
    setChecklistState({
      verificationConfirmed: booking.verificationStatus === "verified",
      paymentConfirmed: booking.paymentStatus === "paid",
      inspectionConfirmed: false,
      notes: "",
    });
    setChecklistOpen(true);
  };

  const handleCompleteHandover = () => {
    if (!checklistBooking) return;
    updateStatus.mutate(
      {
        bookingId: checklistBooking.id,
        newStatus: "active",
        notes: checklistState.notes || undefined,
      },
      {
        onSuccess: () => {
          toast({
            title: "Handover complete",
            description: "Booking is now active",
          });
          setChecklistOpen(false);
          setChecklistBooking(null);
          refetch();
        },
        onError: (error: any) => {
          toast({
            title: "Handover failed",
            description: error.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleFlagIssue = async (booking: HandoverBooking) => {
    await createAlert.mutateAsync({
      alertType: "verification_pending",
      title: `Handover issue: ${booking.bookingCode}`,
      message: `Handover flagged for booking ${booking.bookingCode}. Vehicle: ${booking.vehicle?.year} ${booking.vehicle?.make} ${booking.vehicle?.model}`,
      bookingId: booking.id,
      vehicleId: booking.vehicleId,
    });
    toast({
      title: "Issue flagged",
      description: "Alert created for this booking",
    });
  };

  const readyCount = filteredBookings.filter(
    (h) => getReadinessScore(h) === 4,
  ).length;
  const needsAttentionCount = filteredBookings.filter(
    (h) => getReadinessScore(h) < 4,
  ).length;

  const allChecked =
    checklistState.verificationConfirmed &&
    checklistState.paymentConfirmed &&
    checklistState.inspectionConfirmed;

  return (
    <OpsShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="heading-2 flex items-center gap-3">
              <KeyRound className="w-8 h-8 text-primary" />
              Pickups & Handovers
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage scheduled pickups and complete handovers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-lg px-4 py-2">
              {filteredBookings.length} Scheduled
            </Badge>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by code, name, or vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={dateFilter}
            onValueChange={(v) => setDateFilter(v as DateFilter)}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="next24h">Next 24 Hours</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
            </SelectContent>
          </Select>
          <OpsLocationFilter />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : Object.keys(groupedBookings).length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-2xl">
            <KeyRound className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No pickups scheduled</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedBookings).map(([dateKey, dateBookings]) => (
              <div key={dateKey}>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  {getDateLabel(dateBookings[0].startAt)} -{" "}
                  {format(parseISO(dateKey), "EEEE, MMMM d")}
                </h3>
                <div className="grid gap-4">
                  {dateBookings.map((booking) => {
                    const readiness = getReadinessScore(booking);
                    const allReady = readiness === 4;

                    return (
                      <Card
                        key={booking.id}
                        className={`${!allReady ? "border-amber-500/50" : ""}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                            {/* Time & Code */}
                            <div className="flex items-center gap-4 min-w-[200px]">
                              <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-primary/10">
                                <span className="text-lg font-bold text-primary">
                                  {format(parseISO(booking.startAt), "HH:mm")}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(parseISO(booking.startAt), "MMM d")}
                                </span>
                              </div>
                              <div>
                                <Badge
                                  variant="outline"
                                  className="font-mono text-sm mb-1"
                                >
                                  {booking.bookingCode}
                                </Badge>
                                <p className="text-sm text-muted-foreground">
                                  {booking.profile?.fullName ||
                                    booking.profile?.email ||
                                    "Unknown"}
                                </p>
                              </div>
                            </div>

                            {/* Vehicle & Location */}
                            <div className="flex-1 flex flex-wrap gap-4">
                              <div className="flex items-center gap-2 min-w-[180px]">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {booking.vehicle?.year}{" "}
                                  {booking.vehicle?.make}{" "}
                                  {booking.vehicle?.model}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {booking.location?.name}
                                </span>
                                {booking.pickupAddress && (
                                  <DeliveryBadge hasDelivery={true} />
                                )}
                              </div>
                            </div>

                            {/* Readiness Badges */}
                            <div className="flex flex-wrap gap-2">
                              <ReadinessBadge
                                ok={booking.paymentStatus === "paid"}
                                label="Payment"
                                icon={CreditCard}
                              />
                              <ReadinessBadge
                                ok={booking.verificationStatus === "verified"}
                                label="Verified"
                                icon={FileCheck}
                              />
                              <ReadinessBadge
                                ok={booking.vehicleReady}
                                label="Vehicle"
                                icon={Car}
                              />
                              <ReadinessBadge
                                ok={booking.bufferCleared}
                                label="Buffer"
                                icon={Sparkles}
                              />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  navigate(
                                    `/ops/booking/${booking.id}?returnTo=/ops/pickups`,
                                  )
                                }
                              >
                                Open Booking
                              </Button>
                              <Button
                                variant={allReady ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleStartHandover(booking)}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Handover
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                onClick={() => handleFlagIssue(booking)}
                              >
                                <Flag className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Warnings */}
                          {!allReady && (
                            <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                              {booking.paymentStatus !== "paid" && (
                                <Badge
                                  variant="secondary"
                                  className="bg-amber-500/10 text-amber-700"
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Payment {booking.paymentStatus}
                                </Badge>
                              )}
                              {booking.verificationStatus !== "verified" && (
                                <Badge
                                  variant="secondary"
                                  className="bg-amber-500/10 text-amber-700"
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Verification {booking.verificationStatus}
                                </Badge>
                              )}
                              {!booking.vehicleReady && (
                                <Badge
                                  variant="secondary"
                                  className="bg-red-500/10 text-red-700"
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Vehicle not available
                                </Badge>
                              )}
                              {!booking.bufferCleared && (
                                <Badge
                                  variant="secondary"
                                  className="bg-amber-500/10 text-amber-700"
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  Cleaning buffer not cleared
                                </Badge>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer stats */}
        {filteredBookings.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {filteredBookings.length} pickup
              {filteredBookings.length !== 1 ? "s" : ""} scheduled
            </span>
            <span>
              {readyCount} ready, {needsAttentionCount} need attention
            </span>
          </div>
        )}

        {/* Handover Checklist Dialog (kept for parity; opened from external triggers if needed) */}
        <Dialog open={checklistOpen} onOpenChange={setChecklistOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Handover Checklist</DialogTitle>
              <DialogDescription>
                Confirm all items before completing handover for booking{" "}
                <span className="font-mono font-medium">
                  {checklistBooking?.bookingCode}
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="verification"
                  checked={checklistState.verificationConfirmed}
                  onCheckedChange={(c) =>
                    setChecklistState((s) => ({
                      ...s,
                      verificationConfirmed: !!c,
                    }))
                  }
                />
                <Label htmlFor="verification" className="leading-tight">
                  Identity and license verified
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="payment"
                  checked={checklistState.paymentConfirmed}
                  onCheckedChange={(c) =>
                    setChecklistState((s) => ({
                      ...s,
                      paymentConfirmed: !!c,
                    }))
                  }
                />
                <Label htmlFor="payment" className="leading-tight">
                  Payment and deposit confirmed
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="inspection"
                  checked={checklistState.inspectionConfirmed}
                  onCheckedChange={(c) =>
                    setChecklistState((s) => ({
                      ...s,
                      inspectionConfirmed: !!c,
                    }))
                  }
                />
                <Label htmlFor="inspection" className="leading-tight">
                  Walk-around inspection completed
                </Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={checklistState.notes}
                  onChange={(e) =>
                    setChecklistState((s) => ({ ...s, notes: e.target.value }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setChecklistOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCompleteHandover}
                disabled={!allChecked || updateStatus.isPending}
              >
                Complete Handover
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </OpsShell>
  );
}
