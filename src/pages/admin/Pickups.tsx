import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { 
  KeyRound, 
  Search, 
  CheckCircle, 
  Clock,
  Car,
  User,
  MapPin,
  Phone,
  Calendar,
  Loader2,
  AlertCircle,
  Play,
  Flag,
  RefreshCw,
  CreditCard,
  FileCheck,
  Sparkles,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useHandovers, type HandoverBooking } from "@/hooks/use-handovers";
import { useLocations } from "@/hooks/use-locations";
import { useUpdateBookingStatus } from "@/hooks/use-bookings";
import { useCreateAlert } from "@/hooks/use-alerts";

type DateFilter = "today" | "next24h" | "week";

// Readiness badge component
const ReadinessBadge = ({ ok, label, icon: Icon }: { ok: boolean; label: string; icon: any }) => (
  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
    ok ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
  }`}>
    <Icon className="h-3 w-3" />
    {label}
  </div>
);

export default function AdminPickups() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  
  // Handover checklist dialog state
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistBooking, setChecklistBooking] = useState<HandoverBooking | null>(null);
  const [checklistState, setChecklistState] = useState({
    verificationConfirmed: false,
    paymentConfirmed: false,
    inspectionConfirmed: false,
    notes: "",
  });

  // Queries
  const { data: handovers = [], isLoading, refetch } = useHandovers(
    dateFilter,
    locationFilter !== "all" ? locationFilter : undefined
  );
  const { data: locations } = useLocations();
  const updateStatus = useUpdateBookingStatus();
  const createAlert = useCreateAlert();

  // Filter by search
  const filteredBookings = handovers.filter((booking) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      booking.bookingCode?.toLowerCase().includes(searchLower) ||
      booking.profile?.fullName?.toLowerCase().includes(searchLower) ||
      booking.profile?.email?.toLowerCase().includes(searchLower) ||
      booking.vehicle?.make?.toLowerCase().includes(searchLower) ||
      booking.vehicle?.model?.toLowerCase().includes(searchLower)
    );
  });

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM d");
  };

  // Group bookings by date
  const groupedBookings = filteredBookings.reduce((acc, booking) => {
    const dateKey = format(parseISO(booking.startAt), "yyyy-MM-dd");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(booking);
    return acc;
  }, {} as Record<string, HandoverBooking[]>);

  const getReadinessScore = (booking: HandoverBooking) => {
    let score = 0;
    if (booking.paymentStatus === "paid") score++;
    if (booking.verificationStatus === "verified") score++;
    if (booking.vehicleReady) score++;
    if (booking.bufferCleared) score++;
    return score;
  };

  const handleStartHandover = (booking: HandoverBooking) => {
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
    if (checklistBooking) {
      updateStatus.mutate({
        bookingId: checklistBooking.id,
        newStatus: "active",
        notes: checklistState.notes || undefined,
      }, {
        onSuccess: () => {
          toast({ title: "Handover complete", description: "Booking is now active" });
          setChecklistOpen(false);
          setChecklistBooking(null);
          refetch();
        },
        onError: (error: any) => {
          toast({ title: "Handover failed", description: error.message, variant: "destructive" });
        },
      });
    }
  };

  const handleFlagIssue = async (booking: HandoverBooking) => {
    await createAlert.mutateAsync({
      alertType: "verification_pending",
      title: `Handover issue: ${booking.bookingCode}`,
      message: `Handover flagged for booking ${booking.bookingCode}. Vehicle: ${booking.vehicle?.year} ${booking.vehicle?.make} ${booking.vehicle?.model}`,
      bookingId: booking.id,
      vehicleId: booking.vehicleId,
    });
    toast({ title: "Issue flagged", description: "Alert created for this booking" });
  };

  // Stats
  const readyCount = filteredBookings.filter(h => getReadinessScore(h) === 4).length;
  const needsAttentionCount = filteredBookings.filter(h => getReadinessScore(h) < 4).length;

  return (
    <AdminShell>
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
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="next24h">Next 24 Hours</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
            </SelectContent>
          </Select>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[180px]">
              <MapPin className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations?.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bookings List */}
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
                  {getDateLabel(dateBookings[0].startAt)} - {format(parseISO(dateKey), "EEEE, MMMM d")}
                </h3>
                <div className="grid gap-4">
                  {dateBookings.map((booking) => {
                    const readiness = getReadinessScore(booking);
                    const allReady = readiness === 4;

                    return (
                      <Card key={booking.id} className={`${!allReady ? "border-amber-500/50" : ""}`}>
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
                                <Badge variant="outline" className="font-mono text-sm mb-1">
                                  {booking.bookingCode}
                                </Badge>
                                <p className="text-sm text-muted-foreground">
                                  {booking.profile?.fullName || booking.profile?.email || "Unknown"}
                                </p>
                              </div>
                            </div>

                            {/* Vehicle & Location */}
                            <div className="flex-1 flex flex-wrap gap-4">
                              <div className="flex items-center gap-2 min-w-[180px]">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {booking.vehicle?.year} {booking.vehicle?.make} {booking.vehicle?.model}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{booking.location?.name}</span>
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
                                onClick={() => navigate(`/admin/bookings/${booking.id}/ops?returnTo=/admin/pickups`)}
                              >
                                Open Ops
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
                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-700">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Payment {booking.paymentStatus}
                                </Badge>
                              )}
                              {booking.verificationStatus !== "verified" && (
                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-700">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Verification {booking.verificationStatus}
                                </Badge>
                              )}
                              {!booking.vehicleReady && (
                                <Badge variant="secondary" className="bg-red-500/10 text-red-700">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Vehicle not available
                                </Badge>
                              )}
                              {!booking.bufferCleared && (
                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-700">
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

        {/* Stats Footer */}
        {filteredBookings.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredBookings.length} pickup{filteredBookings.length !== 1 ? "s" : ""} scheduled</span>
            <span>
              {readyCount} ready, {needsAttentionCount} need attention
            </span>
          </div>
        )}

        {/* Handover Checklist Dialog */}
        <Dialog open={checklistOpen} onOpenChange={setChecklistOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Handover Checklist</DialogTitle>
              <DialogDescription>
                Confirm all items before completing handover for booking{" "}
                <span className="font-mono font-medium">{checklistBooking?.bookingCode}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="verification"
                  checked={checklistState.verificationConfirmed}
                  onCheckedChange={(checked) =>
                    setChecklistState((s) => ({ ...s, verificationConfirmed: !!checked }))
                  }
                />
                <div className="grid gap-1.5">
                  <Label htmlFor="verification" className="font-medium">
                    Identity Verified
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Customer ID matches booking details
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="payment"
                  checked={checklistState.paymentConfirmed}
                  onCheckedChange={(checked) =>
                    setChecklistState((s) => ({ ...s, paymentConfirmed: !!checked }))
                  }
                />
                <div className="grid gap-1.5">
                  <Label htmlFor="payment" className="font-medium">
                    Payment Confirmed
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Full payment received or deposit collected
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="inspection"
                  checked={checklistState.inspectionConfirmed}
                  onCheckedChange={(checked) =>
                    setChecklistState((s) => ({ ...s, inspectionConfirmed: !!checked }))
                  }
                />
                <div className="grid gap-1.5">
                  <Label htmlFor="inspection" className="font-medium">
                    Pickup Inspection Complete
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Photos taken and fuel/odometer recorded
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Staff Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any notes about the handover..."
                  value={checklistState.notes}
                  onChange={(e) =>
                    setChecklistState((s) => ({ ...s, notes: e.target.value }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setChecklistOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCompleteHandover}
                disabled={
                  !checklistState.verificationConfirmed ||
                  !checklistState.paymentConfirmed ||
                  !checklistState.inspectionConfirmed ||
                  updateStatus.isPending
                }
              >
                {updateStatus.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Complete Handover
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminShell>
  );
}
