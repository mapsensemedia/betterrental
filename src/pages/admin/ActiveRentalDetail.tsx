import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
import { useActiveRentalDetail, calculateDuration } from "@/hooks/use-active-rental-detail";
import { useCreateAlert } from "@/hooks/use-alerts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  Car,
  Clock,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Timer,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Shield,
  CreditCard,
  Camera,
  Flag,
  MessageSquare,
  ExternalLink,
  Send,
  Receipt,
  RotateCcw,
  Wrench,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { CreateIncidentDialog } from "@/components/admin/CreateIncidentDialog";

export default function ActiveRentalDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { data: rental, isLoading, error } = useActiveRentalDetail(bookingId || null);
  const createAlert = useCreateAlert();

  // Live timer state
  const [duration, setDuration] = useState<ReturnType<typeof calculateDuration> | null>(null);

  // Flag issue dialog
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagMessage, setFlagMessage] = useState("");
  const [flagging, setFlagging] = useState(false);
  
  // Incident dialog
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);

  // Update duration every second
  useEffect(() => {
    if (!rental) return;

    const updateDuration = () => {
      setDuration(calculateDuration(rental.startAt, rental.endAt));
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [rental?.startAt, rental?.endAt]);

  const handleFlagIssue = async () => {
    if (!rental || !flagMessage.trim()) return;

    setFlagging(true);
    try {
      await createAlert.mutateAsync({
        alertType: "emergency",
        title: `Issue flagged for ${rental.bookingCode}`,
        message: flagMessage,
        bookingId: rental.id,
        vehicleId: rental.vehicleId,
        userId: rental.userId,
      });
      toast.success("Issue flagged successfully");
      setFlagDialogOpen(false);
      setFlagMessage("");
    } catch (err) {
      toast.error("Failed to flag issue");
    } finally {
      setFlagging(false);
    }
  };

  if (isLoading) {
    return (
      <AdminShell>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </AdminShell>
    );
  }

  if (error || !rental) {
    return (
      <AdminShell>
        <div className="text-center py-16">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Rental Not Found</h2>
          <p className="text-muted-foreground mb-6">
            This rental may have ended or the booking ID is invalid.
          </p>
          <Button onClick={() => navigate("/admin/active-rentals")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Active Rentals
          </Button>
        </div>
      </AdminShell>
    );
  }

  const formatDuration = () => {
    if (!duration) return "--:--:--";
    const h = String(duration.elapsedHours).padStart(2, "0");
    const m = String(duration.elapsedMinutes).padStart(2, "0");
    const s = String(duration.elapsedSeconds).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const formatRemaining = () => {
    if (!duration) return "--:--:--";
    const prefix = duration.isOverdue ? "Overdue by " : "";
    const h = String(duration.remainingHours).padStart(2, "0");
    const m = String(duration.remainingMinutes).padStart(2, "0");
    const s = String(duration.remainingSeconds).padStart(2, "0");
    return `${prefix}${h}:${m}:${s}`;
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/active-rentals")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Active Rental</h1>
                <Badge variant="default" className="bg-green-600">
                  Active
                </Badge>
                {rental.isOverdue && (
                  <Badge variant="destructive">Overdue</Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1">
                <span className="font-mono">{rental.bookingCode}</span>
                <span className="mx-2">•</span>
                {rental.vehicle?.year} {rental.vehicle?.make} {rental.vehicle?.model}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {/* Primary Action - Return Vehicle */}
            <Button size="sm" asChild className="gap-2">
              <Link to={`/admin/returns/${rental.id}`}>
                <RotateCcw className="h-4 w-4" />
                Return Vehicle
              </Link>
            </Button>
            
            {/* Report Incident */}
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => setShowIncidentDialog(true)}
            >
              <Wrench className="h-4 w-4" />
              Report Incident
            </Button>
            
            <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
                  <Flag className="h-4 w-4" />
                  Flag Issue
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Flag an Issue</DialogTitle>
                  <DialogDescription>
                    Create an alert for this rental. This will notify the team immediately.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  placeholder="Describe the issue..."
                  value={flagMessage}
                  onChange={(e) => setFlagMessage(e.target.value)}
                  rows={4}
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleFlagIssue}
                    disabled={flagging || !flagMessage.trim()}
                  >
                    {flagging ? "Flagging..." : "Flag Issue"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Incident Dialog */}
          <CreateIncidentDialog
            open={showIncidentDialog}
            onOpenChange={setShowIncidentDialog}
            bookingId={rental.id}
            vehicleId={rental.vehicleId}
            customerId={rental.userId}
            bookingCode={rental.bookingCode}
            vehicleName={`${rental.vehicle?.year} ${rental.vehicle?.make} ${rental.vehicle?.model}`}
          />
        </div>

        {/* Main Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Rental Timeline Card */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Timer className="h-5 w-5 text-primary" />
                Rental Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-6">
                {/* Active Duration */}
                <div className="text-center p-4 bg-muted/50 rounded-xl">
                  <p className="text-sm text-muted-foreground mb-2">Active For</p>
                  <p className="text-3xl font-mono font-bold tracking-tight">
                    {formatDuration()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Since {format(new Date(rental.startAt), "MMM d, h:mm a")}
                  </p>
                </div>

                {/* Time Remaining */}
                <div
                  className={`text-center p-4 rounded-xl ${
                    duration?.isOverdue
                      ? "bg-destructive/10"
                      : duration && duration.remainingHours < 2
                      ? "bg-amber-500/10"
                      : "bg-muted/50"
                  }`}
                >
                  <p className="text-sm text-muted-foreground mb-2">
                    {duration?.isOverdue ? "Overdue" : "Time Remaining"}
                  </p>
                  <p
                    className={`text-3xl font-mono font-bold tracking-tight ${
                      duration?.isOverdue
                        ? "text-destructive"
                        : duration && duration.remainingHours < 2
                        ? "text-amber-600"
                        : ""
                    }`}
                  >
                    {formatRemaining()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Due {format(new Date(rental.endAt), "MMM d, h:mm a")}
                  </p>
                </div>

                {/* Scheduled Return */}
                <div className="text-center p-4 bg-muted/50 rounded-xl">
                  <p className="text-sm text-muted-foreground mb-2">Scheduled Return</p>
                  <p className="text-lg font-semibold">
                    {format(new Date(rental.endAt), "EEEE")}
                  </p>
                  <p className="text-2xl font-bold">
                    {format(new Date(rental.endAt), "MMM d")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(rental.endAt), "h:mm a")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-5 w-5 text-primary" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold text-lg">
                  {rental.customer?.fullName || "Unknown Customer"}
                </p>
                {rental.customer?.isVerified && (
                  <Badge variant="outline" className="mt-1 text-green-600 border-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                {rental.customer?.phone && (
                  <a
                    href={`tel:${rental.customer.phone}`}
                    className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                  >
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {rental.customer.phone}
                  </a>
                )}
                {rental.customer?.email && (
                  <a
                    href={`mailto:${rental.customer.email}`}
                    className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                  >
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{rental.customer.email}</span>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Rental Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Car className="h-5 w-5 text-primary" />
                Vehicle & Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Vehicle */}
              <div className="flex items-start gap-3">
                <div className="w-16 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {rental.vehicle?.imageUrl ? (
                    <img
                      src={rental.vehicle.imageUrl}
                      alt={`${rental.vehicle.make} ${rental.vehicle.model}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Car className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">
                    {rental.vehicle?.year} {rental.vehicle?.make} {rental.vehicle?.model}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {rental.vehicle?.category} • {rental.vehicle?.transmission}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Pickup Location */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Pickup Location</p>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">{rental.location?.name}</p>
                    <p className="text-sm text-muted-foreground">{rental.location?.address}</p>
                  </div>
                </div>
              </div>

              {/* Custom Pickup Address */}
              {rental.pickupAddress && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Delivery Address</p>
                  <p className="text-sm">{rental.pickupAddress}</p>
                </div>
              )}

              {/* Notes */}
              {rental.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{rental.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Health & Compliance Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5 text-primary" />
                Health & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <StatusBadge
                  label="Payment"
                  completed={rental.hasPaymentCompleted}
                  icon={CreditCard}
                />
                <StatusBadge
                  label="Deposit"
                  completed={rental.hasDepositHeld}
                  icon={Receipt}
                />
                <StatusBadge
                  label="Verification"
                  completed={rental.hasVerificationApproved}
                  icon={Shield}
                />
                <StatusBadge
                  label="Agreement"
                  completed={rental.hasAgreementSigned}
                  icon={FileText}
                />
                <StatusBadge
                  label="Walkaround"
                  completed={rental.hasWalkaroundComplete}
                  icon={Camera}
                  className="col-span-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Alerts & Tickets Card */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Ops Monitoring
              </CardTitle>
              <CardDescription>
                Open alerts and tickets for this rental
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-6">
                {/* Alerts */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Open Alerts
                      {rental.openAlertsCount > 0 && (
                        <Badge variant="secondary">{rental.openAlertsCount}</Badge>
                      )}
                    </h4>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/admin/alerts?booking=${rental.id}`}>View All</Link>
                    </Button>
                  </div>
                  {rental.recentAlerts.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No open alerts
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {rental.recentAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="p-3 rounded-lg border bg-card text-sm"
                        >
                          <p className="font-medium truncate">{alert.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tickets */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      Open Tickets
                      {rental.openTicketsCount > 0 && (
                        <Badge variant="secondary">{rental.openTicketsCount}</Badge>
                      )}
                    </h4>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/admin/tickets?booking=${rental.id}`}>View All</Link>
                    </Button>
                  </div>
                  {rental.recentTickets.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No open tickets
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {rental.recentTickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="p-3 rounded-lg border bg-card text-sm"
                        >
                          <p className="font-medium truncate">{ticket.subject}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>
              Actions available during an active rental
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button size="sm" asChild>
                <Link to={`/admin/returns/${rental.id}`}>
                  <Car className="h-4 w-4 mr-2" />
                  Process Return
                </Link>
              </Button>
              {rental.customer?.phone && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`sms:${rental.customer.phone}`}>
                    <Send className="h-4 w-4 mr-2" />
                    Send SMS
                  </a>
                </Button>
              )}
              {rental.customer?.email && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${rental.customer.email}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </a>
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link to={`/admin/tickets?booking=${rental.id}`}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  View Tickets
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/admin/alerts?booking=${rental.id}`}>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  View Alerts
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

// Helper component for status badges
function StatusBadge({
  label,
  completed,
  icon: Icon,
  className = "",
}: {
  label: string;
  completed: boolean;
  icon: React.ElementType;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 p-2.5 rounded-lg ${
        completed
          ? "bg-green-500/10 text-green-700 dark:text-green-400"
          : "bg-muted text-muted-foreground"
      } ${className}`}
    >
      {completed ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <XCircle className="h-4 w-4" />
      )}
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
