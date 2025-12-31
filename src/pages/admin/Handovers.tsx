import { useState } from "react";
import { format } from "date-fns";
import { AdminShell } from "@/components/layout/AdminShell";
import { BookingOpsDrawer } from "@/components/admin/BookingOpsDrawer";
import { useHandovers } from "@/hooks/use-handovers";
import { useUpdateBookingStatus } from "@/hooks/use-bookings";
import { useLocations } from "@/hooks/use-locations";
import { useCreateAlert } from "@/hooks/use-alerts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Car,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Play,
  Flag,
  RefreshCw,
  MapPin,
  CreditCard,
  FileCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

type DateFilter = "today" | "next24h" | "week";

export default function AdminHandovers() {
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistBooking, setChecklistBooking] = useState<any>(null);
  const [checklistState, setChecklistState] = useState({
    verificationConfirmed: false,
    paymentConfirmed: false,
    inspectionConfirmed: false,
    notes: "",
  });

  const { data: handovers, isLoading, refetch } = useHandovers(
    dateFilter,
    locationFilter !== "all" ? locationFilter : undefined
  );
  const { data: locations } = useLocations();
  const updateStatus = useUpdateBookingStatus();
  const createAlert = useCreateAlert();

  const handleOpenBooking = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setDrawerOpen(true);
  };

  const handleStartHandover = (booking: any) => {
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
      });
      setChecklistOpen(false);
      setChecklistBooking(null);
    }
  };

  const handleFlagIssue = async (booking: any) => {
    await createAlert.mutateAsync({
      alertType: "verification_pending",
      title: `Handover issue: ${booking.bookingCode}`,
      message: `Handover flagged for booking ${booking.bookingCode}. Vehicle: ${booking.vehicle?.year} ${booking.vehicle?.make} ${booking.vehicle?.model}`,
      bookingId: booking.id,
      vehicleId: booking.vehicleId,
    });
    toast.success("Issue flagged and alert created");
  };

  const getReadinessScore = (booking: any) => {
    let score = 0;
    if (booking.paymentStatus === "paid") score++;
    if (booking.verificationStatus === "verified") score++;
    if (booking.vehicleReady) score++;
    if (booking.bufferCleared) score++;
    return score;
  };

  const ReadinessBadge = ({ ok, label, icon: Icon }: { ok: boolean; label: string; icon: any }) => (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
      ok ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
    }`}>
      <Icon className="h-3 w-3" />
      {label}
    </div>
  );

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="heading-2">Handovers</h1>
            <p className="text-muted-foreground mt-1">
              Manage upcoming vehicle pickups and readiness
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="next24h">Next 24 Hours</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                </SelectContent>
              </Select>

              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[200px]">
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
          </CardContent>
        </Card>

        {/* Handovers List */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading handovers...
              </div>
            </CardContent>
          </Card>
        ) : handovers?.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No handovers scheduled</p>
                <p className="text-sm">No pickups for the selected time period</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {handovers?.map((booking) => {
              const readiness = getReadinessScore(booking);
              const allReady = readiness === 4;

              return (
                <Card key={booking.id} className={`${!allReady ? "border-amber-500/50" : ""}`}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Time & Code */}
                      <div className="flex items-center gap-4 min-w-[200px]">
                        <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-primary/10">
                          <span className="text-lg font-bold text-primary">
                            {format(new Date(booking.startAt), "HH:mm")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(booking.startAt), "MMM d")}
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
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenBooking(booking.id)}
                        >
                          <Eye className="h-4 w-4" />
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
        )}

        {/* Stats */}
        {handovers && handovers.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{handovers.length} handover{handovers.length !== 1 ? "s" : ""} scheduled</span>
            <span>
              {handovers.filter(h => getReadinessScore(h) === 4).length} ready,{" "}
              {handovers.filter(h => getReadinessScore(h) < 4).length} need attention
            </span>
          </div>
        )}
      </div>

      {/* Booking Ops Drawer */}
      <BookingOpsDrawer
        bookingId={selectedBookingId}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedBookingId(null);
        }}
      />

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
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Handover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
