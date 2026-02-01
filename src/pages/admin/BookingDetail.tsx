/**
 * Comprehensive Booking Detail Page
 * Shows complete booking information including all associated data
 */
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { format, parseISO, differenceInHours } from "date-fns";
import { AdminShell } from "@/components/layout/AdminShell";
import { useBookingById } from "@/hooks/use-bookings";
import { useBookingConditionPhotos } from "@/hooks/use-condition-photos";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SignedStorageImage } from "@/components/shared/SignedStorageImage";
import { AuditTimeline } from "@/components/shared/AuditTimeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ArrowLeft, 
  Car, 
  Calendar, 
  MapPin, 
  User, 
  Phone, 
  Mail,
  CreditCard,
  FileText,
  Camera,
  AlertTriangle,
  Clock,
  Gauge,
  Fuel,
  DollarSign,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Receipt,
  FileCheck,
  Shield,
} from "lucide-react";

export default function BookingDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/admin/bookings";

  const { data: booking, isLoading, refetch } = useBookingById(bookingId || null);
  const { data: photos, isLoading: photosLoading } = useBookingConditionPhotos(bookingId || "");

  // Fetch damages for this booking
  const { data: damages = [] } = useQuery({
    queryKey: ["booking-damages-detail", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data } = await supabase
        .from("damage_reports")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!bookingId,
  });

  // Fetch inspection metrics
  const { data: inspectionMetrics = [] } = useQuery({
    queryKey: ["booking-inspections-detail", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data } = await supabase
        .from("inspection_metrics")
        .select("*")
        .eq("booking_id", bookingId)
        .order("recorded_at", { ascending: true });
      return data || [];
    },
    enabled: !!bookingId,
  });

  // Fetch deposit ledger
  const { data: depositLedger = [] } = useQuery({
    queryKey: ["booking-deposit-ledger", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data } = await supabase
        .from("deposit_ledger")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!bookingId,
  });

  // Fetch receipts
  const { data: receipts = [] } = useQuery({
    queryKey: ["booking-receipts", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data } = await supabase
        .from("receipts")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!bookingId,
  });

  // Fetch incident cases
  const { data: incidents = [] } = useQuery({
    queryKey: ["booking-incidents-detail", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data } = await supabase
        .from("incident_cases")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!bookingId,
  });

  if (isLoading) {
    return (
      <AdminShell>
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminShell>
    );
  }

  if (!booking) {
    return (
      <AdminShell>
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
          <p className="text-muted-foreground">Booking not found</p>
          <Button onClick={() => navigate(returnTo)}>Go Back</Button>
        </div>
      </AdminShell>
    );
  }

  const vehicleName = booking.vehicles 
    ? `${booking.vehicles.year} ${booking.vehicles.make} ${booking.vehicles.model}`
    : "No vehicle";

  const pickupPhotos = photos?.pickup || [];
  const returnPhotos = photos?.return || [];
  const pickupInspection = inspectionMetrics.find(m => m.phase === "pickup");
  const returnInspection = inspectionMetrics.find(m => m.phase === "return");

  // Calculate actual rental duration if completed
  const actualDuration = booking.actual_return_at && booking.start_at
    ? differenceInHours(parseISO(booking.actual_return_at), parseISO(booking.start_at))
    : null;

  return (
    <AdminShell>
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(returnTo)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold">Booking Details</h1>
                  <Badge variant="outline" className="font-mono text-sm">{booking.booking_code}</Badge>
                  <StatusBadge status={booking.status} />
                </div>
                <p className="text-muted-foreground text-sm mt-1">
                  {vehicleName} • {booking.profiles?.full_name || "Customer"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="photos">
                Photos
                {(pickupPhotos.length > 0 || returnPhotos.length > 0) && (
                  <Badge variant="secondary" className="ml-1">{pickupPhotos.length + returnPhotos.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="damages">
                Damages
                {damages.length > 0 && (
                  <Badge variant="destructive" className="ml-1">{damages.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Customer Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-medium">{booking.profiles?.full_name || "Unknown"}</p>
                      {booking.profiles?.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {booking.profiles.email}
                        </div>
                      )}
                      {booking.profiles?.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {booking.profiles.phone}
                        </div>
                      )}
                    </div>
                    <Separator />
                    <div className="text-sm">
                      <span className="text-muted-foreground">License Status: </span>
                      <Badge variant={
                        booking.profiles?.driver_license_status === "approved" ? "default" :
                        booking.profiles?.driver_license_status === "rejected" ? "destructive" : "secondary"
                      }>
                        {booking.profiles?.driver_license_status || "Pending"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Vehicle Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Vehicle
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="font-medium">{vehicleName}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {booking.vehicles?.transmission && (
                        <div>
                          <span className="text-muted-foreground">Transmission: </span>
                          {booking.vehicles.transmission}
                        </div>
                      )}
                      {booking.vehicles?.fuel_type && (
                        <div>
                          <span className="text-muted-foreground">Fuel: </span>
                          {booking.vehicles.fuel_type}
                        </div>
                      )}
                      {booking.vehicles?.seats && (
                        <div>
                          <span className="text-muted-foreground">Seats: </span>
                          {booking.vehicles.seats}
                        </div>
                      )}
                      {booking.vehicles?.category && (
                        <div>
                          <span className="text-muted-foreground">Category: </span>
                          {booking.vehicles.category}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Rental Period */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Rental Period
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pickup:</span>
                        <span>{format(parseISO(booking.start_at), "PPp")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Scheduled Return:</span>
                        <span>{format(parseISO(booking.end_at), "PPp")}</span>
                      </div>
                      {booking.actual_return_at && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Actual Return:</span>
                          <span>{format(parseISO(booking.actual_return_at), "PPp")}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span>{booking.total_days} day{booking.total_days !== 1 ? "s" : ""}</span>
                      </div>
                      {actualDuration !== null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Actual Duration:</span>
                          <span>{Math.round(actualDuration / 24)} day{Math.round(actualDuration / 24) !== 1 ? "s" : ""}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Location */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {booking.locations && (
                      <>
                        <p className="font-medium">{booking.locations.name}</p>
                        <p className="text-muted-foreground">{booking.locations.address}</p>
                        <p className="text-muted-foreground">{booking.locations.city}</p>
                        {booking.locations.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {booking.locations.phone}
                          </div>
                        )}
                      </>
                    )}
                    {booking.pickup_address && (
                      <div className="mt-3 pt-3 border-t">
                        <Badge className="bg-blue-500 mb-2">Delivery</Badge>
                        <p className="text-muted-foreground">{booking.pickup_address}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Inspection Metrics */}
                {(pickupInspection || returnInspection) && (
                  <Card className="md:col-span-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Gauge className="h-4 w-4" />
                        Inspection Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-6">
                        {pickupInspection && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">At Pickup</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Gauge className="h-4 w-4 text-muted-foreground" />
                                <span>{pickupInspection.odometer?.toLocaleString() || "N/A"} mi</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Fuel className="h-4 w-4 text-muted-foreground" />
                                <span>{pickupInspection.fuel_level || "N/A"}%</span>
                              </div>
                            </div>
                            {pickupInspection.exterior_notes && (
                              <p className="text-xs text-muted-foreground">{pickupInspection.exterior_notes}</p>
                            )}
                          </div>
                        )}
                        {returnInspection && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">At Return</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Gauge className="h-4 w-4 text-muted-foreground" />
                                <span>{returnInspection.odometer?.toLocaleString() || "N/A"} mi</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Fuel className="h-4 w-4 text-muted-foreground" />
                                <span>{returnInspection.fuel_level || "N/A"}%</span>
                              </div>
                            </div>
                            {returnInspection.exterior_notes && (
                              <p className="text-xs text-muted-foreground">{returnInspection.exterior_notes}</p>
                            )}
                          </div>
                        )}
                      </div>
                      {pickupInspection && returnInspection && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm">
                            <span className="text-muted-foreground">Miles Driven: </span>
                            <span className="font-medium">
                              {((returnInspection.odometer || 0) - (pickupInspection.odometer || 0)).toLocaleString()} miles
                            </span>
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                {booking.notes && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{booking.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Photos Tab */}
            <TabsContent value="photos" className="space-y-6">
              {pickupPhotos.length === 0 && returnPhotos.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Camera className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No condition photos captured</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Pickup Photos */}
                  {pickupPhotos.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Pickup Condition Photos</CardTitle>
                        <CardDescription>{pickupPhotos.length} photos captured</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {pickupPhotos.map((photo: any) => (
                            <div key={photo.id} className="aspect-square rounded-lg overflow-hidden border">
                              <SignedStorageImage 
                                bucket="condition-photos"
                                path={photo.photo_url.replace("condition-photos/", "")}
                                alt={photo.photo_type}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Return Photos */}
                  {returnPhotos.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Return Condition Photos</CardTitle>
                        <CardDescription>{returnPhotos.length} photos captured</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {returnPhotos.map((photo: any) => (
                            <div key={photo.id} className="aspect-square rounded-lg overflow-hidden border">
                              <SignedStorageImage 
                                bucket="condition-photos"
                                path={photo.photo_url.replace("condition-photos/", "")}
                                alt={photo.photo_type}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Damages Tab */}
            <TabsContent value="damages" className="space-y-6">
              {damages.length === 0 && incidents.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500/50 mb-4" />
                    <p className="text-muted-foreground">No damages or incidents reported</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Damage Reports */}
                  {damages.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          Damage Reports
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {damages.map((damage: any) => (
                          <div key={damage.id} className="p-4 rounded-lg border space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{damage.location_on_vehicle}</p>
                                <p className="text-sm text-muted-foreground">{damage.description}</p>
                              </div>
                              <div className="text-right">
                              <Badge variant={
                                damage.severity === "major" ? "destructive" :
                                damage.severity === "moderate" ? "default" : "secondary"
                              }>
                                {damage.severity}
                              </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {format(parseISO(damage.created_at), "PPp")}
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">{damage.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Incident Cases */}
                  {incidents.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Shield className="h-4 w-4 text-amber-500" />
                          Incident Cases
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {incidents.map((incident: any) => (
                          <div key={incident.id} className="p-4 rounded-lg border space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{incident.incident_type}</p>
                                <p className="text-sm text-muted-foreground">{incident.description}</p>
                              </div>
                              <div className="text-right space-y-1">
                                <Badge variant={
                                  incident.severity === "major" ? "destructive" :
                                  incident.severity === "moderate" ? "default" : "secondary"
                                }>
                                  {incident.severity}
                                </Badge>
                                <Badge variant="outline">{incident.status}</Badge>
                              </div>
                            </div>
                            {incident.claim_number && (
                              <p className="text-sm">
                                <span className="text-muted-foreground">Claim #: </span>
                                {incident.claim_number}
                              </p>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Financial Tab */}
            <TabsContent value="financial" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Pricing Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Pricing Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Daily Rate:</span>
                      <span>${Number(booking.daily_rate).toFixed(2)}/day</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal ({booking.total_days} days):</span>
                      <span>${Number(booking.subtotal).toFixed(2)}</span>
                    </div>
                    {booking.tax_amount && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax:</span>
                        <span>${Number(booking.tax_amount).toFixed(2)}</span>
                      </div>
                    )}
                    {booking.young_driver_fee && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Young Driver Fee:</span>
                        <span>${Number(booking.young_driver_fee).toFixed(2)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total:</span>
                      <span>${Number(booking.total_amount).toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Deposit */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Security Deposit
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium">${Number(booking.deposit_amount || 0).toFixed(2)}</span>
                    </div>
                    {depositLedger.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          {depositLedger.map((entry: any) => (
                            <div key={entry.id} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{entry.action}:</span>
                              <span className={entry.action === "withheld" ? "text-destructive" : ""}>
                                ${Number(entry.amount).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Payments */}
                {booking.payments && booking.payments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Payments
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {booking.payments.map((payment: any) => (
                        <div key={payment.id} className="flex items-center justify-between text-sm">
                          <div>
                            <p className="font-medium">${Number(payment.amount).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{payment.payment_type}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={payment.status === "completed" ? "default" : "secondary"}>
                              {payment.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(parseISO(payment.created_at), "PP")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Receipts */}
                {receipts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Receipts
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {receipts.map((receipt: any) => (
                        <div key={receipt.id} className="flex items-center justify-between text-sm">
                          <div>
                            <p className="font-medium">{receipt.receipt_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(receipt.created_at), "PP")}
                            </p>
                          </div>
                          <Badge variant={receipt.status === "issued" ? "default" : "secondary"}>
                            {receipt.status}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Add-ons */}
                {booking.addOns && booking.addOns.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileCheck className="h-4 w-4" />
                        Add-ons
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {booking.addOns.map((addon: any) => (
                        <div key={addon.id} className="flex justify-between text-sm">
                          <span>{addon.add_ons?.name || "Add-on"}</span>
                          <span>${Number(addon.price).toFixed(2)}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Audit History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {booking.auditLogs && booking.auditLogs.length > 0 ? (
                    <AuditTimeline events={booking.auditLogs.map((log: any) => ({
                      id: log.id,
                      action: log.action,
                      entityType: log.entity_type,
                      entityId: log.entity_id,
                      userId: log.user_id,
                      createdAt: log.created_at,
                      oldData: log.old_data,
                      newData: log.new_data,
                    }))} />
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No audit history available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </TooltipProvider>
    </AdminShell>
  );
}
