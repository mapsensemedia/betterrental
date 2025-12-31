import { useState } from "react";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useBookingById, useUpdateBookingStatus } from "@/hooks/use-bookings";
import { useRecordPayment, type PaymentMethod } from "@/hooks/use-payments";
import { 
  Car, 
  MapPin, 
  User, 
  Calendar, 
  CreditCard, 
  FileCheck, 
  Camera, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Fuel,
  Gauge,
  FileText,
  Banknote,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface BookingOpsDrawerProps {
  bookingId: string | null;
  open: boolean;
  onClose: () => void;
}

const statusFlow: BookingStatus[] = ["pending", "confirmed", "active", "completed"];

export function BookingOpsDrawer({ bookingId, open, onClose }: BookingOpsDrawerProps) {
  const { data: booking, isLoading } = useBookingById(bookingId);
  const updateStatus = useUpdateBookingStatus();
  const recordPayment = useRecordPayment();
  
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; status: BookingStatus | null }>({ 
    open: false, 
    status: null 
  });
  
  // Payment recording state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: "",
    method: "cash" as PaymentMethod,
    reference: "",
    notes: "",
  });

  const handleStatusChange = (newStatus: BookingStatus) => {
    setConfirmDialog({ open: true, status: newStatus });
  };

  const confirmStatusChange = () => {
    if (confirmDialog.status && bookingId) {
      updateStatus.mutate({ bookingId, newStatus: confirmDialog.status });
      setConfirmDialog({ open: false, status: null });
    }
  };

  const getNextStatus = (): BookingStatus | null => {
    if (!booking) return null;
    const currentIndex = statusFlow.indexOf(booking.status);
    if (currentIndex >= 0 && currentIndex < statusFlow.length - 1) {
      return statusFlow[currentIndex + 1];
    }
    return null;
  };

  const getVerificationStatus = () => {
    if (!booking?.verifications?.length) return "pending";
    const latest = booking.verifications[0];
    return latest.status;
  };

  const getPaymentStatus = () => {
    if (!booking?.payments?.length) return "pending";
    const total = booking.payments.reduce((sum: number, p: any) => 
      p.status === "completed" ? sum + Number(p.amount) : sum, 0);
    return total >= booking.total_amount ? "paid" : "partial";
  };

  const getTotalPaid = () => {
    if (!booking?.payments?.length) return 0;
    return booking.payments.reduce((sum: number, p: any) => 
      p.status === "completed" ? sum + Number(p.amount) : sum, 0);
  };

  const getAmountDue = () => {
    if (!booking) return 0;
    return Number(booking.total_amount) - getTotalPaid();
  };

  const handleOpenPaymentDialog = () => {
    const amountDue = getAmountDue();
    setPaymentData({
      amount: amountDue > 0 ? amountDue.toFixed(2) : "",
      method: "cash",
      reference: "",
      notes: "",
    });
    setPaymentDialogOpen(true);
  };

  const handleRecordPayment = () => {
    if (!bookingId || !paymentData.amount) return;
    
    recordPayment.mutate({
      bookingId,
      amount: parseFloat(paymentData.amount),
      method: paymentData.method,
      reference: paymentData.reference || undefined,
      notes: paymentData.notes || undefined,
    }, {
      onSuccess: () => {
        setPaymentDialogOpen(false);
        setPaymentData({ amount: "", method: "cash", reference: "", notes: "" });
      },
    });
  };

  if (!open) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent className="w-full sm:max-w-2xl overflow-hidden p-0">
          <SheetHeader className="px-6 py-4 border-b bg-muted/30">
            <SheetTitle className="flex items-center gap-3">
              <span>Booking Operations</span>
              {booking && (
                <Badge variant="outline" className="font-mono text-sm">
                  {booking.booking_code}
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-80px)]">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-pulse text-muted-foreground">Loading booking...</div>
              </div>
            ) : booking ? (
              <div className="p-6 space-y-6">
                {/* Status Timeline */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Status Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-4">
                      {statusFlow.map((status, i) => (
                        <div key={status} className="flex items-center gap-2">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${
                            booking.status === status 
                              ? "bg-primary text-primary-foreground" 
                              : statusFlow.indexOf(booking.status) > i 
                                ? "bg-primary/20 text-primary" 
                                : "bg-muted text-muted-foreground"
                          }`}>
                            {statusFlow.indexOf(booking.status) > i ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              i + 1
                            )}
                          </div>
                          {i < statusFlow.length - 1 && (
                            <div className={`h-0.5 w-8 ${
                              statusFlow.indexOf(booking.status) > i ? "bg-primary" : "bg-muted"
                            }`} />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <StatusBadge status={booking.status} />
                      <div className="flex gap-2">
                        {getNextStatus() && (
                          <Button 
                            size="sm" 
                            onClick={() => handleStatusChange(getNextStatus()!)}
                            disabled={updateStatus.isPending}
                          >
                            Mark {getNextStatus()}
                          </Button>
                        )}
                        {booking.status !== "cancelled" && (
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleStatusChange("cancelled")}
                            disabled={updateStatus.isPending}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Customer Card */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Customer
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p className="font-medium">{booking.profiles?.full_name || "Unknown"}</p>
                      <p className="text-muted-foreground">{booking.profiles?.email}</p>
                      <p className="text-muted-foreground">{booking.profiles?.phone || "No phone"}</p>
                    </CardContent>
                  </Card>

                  {/* Vehicle Card */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        Vehicle
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p className="font-medium">
                        {booking.vehicles?.year} {booking.vehicles?.make} {booking.vehicles?.model}
                      </p>
                      <p className="text-muted-foreground capitalize">{booking.vehicles?.category}</p>
                    </CardContent>
                  </Card>

                  {/* Dates Card */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Dates
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Pick-up:</span> {format(new Date(booking.start_at), "PPp")}</p>
                      <p><span className="text-muted-foreground">Return:</span> {format(new Date(booking.end_at), "PPp")}</p>
                      <p><span className="text-muted-foreground">Duration:</span> {booking.total_days} days</p>
                    </CardContent>
                  </Card>

                  {/* Location Card */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p className="font-medium">{booking.locations?.name}</p>
                      <p className="text-muted-foreground">{booking.locations?.address}</p>
                      <p className="text-muted-foreground">{booking.locations?.city}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabs for detailed info */}
                <Tabs defaultValue="payment" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="payment">Payment</TabsTrigger>
                    <TabsTrigger value="verification">Verification</TabsTrigger>
                    <TabsTrigger value="inspection">Inspection</TabsTrigger>
                    <TabsTrigger value="audit">Audit Log</TabsTrigger>
                  </TabsList>

                  <TabsContent value="payment" className="mt-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Payment Summary
                          </CardTitle>
                          <Badge variant={getPaymentStatus() === "paid" ? "default" : "secondary"}>
                            {getPaymentStatus()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Daily Rate</span>
                          <span>${Number(booking.daily_rate).toFixed(2)} × {booking.total_days} days</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>${Number(booking.subtotal).toFixed(2)}</span>
                        </div>
                        {booking.addOns?.map((addon: any) => (
                          <div key={addon.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{addon.add_ons?.name}</span>
                            <span>${Number(addon.price).toFixed(2)}</span>
                          </div>
                        ))}
                        {booking.tax_amount && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tax</span>
                            <span>${Number(booking.tax_amount).toFixed(2)}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-medium">
                          <span>Total</span>
                          <span>${Number(booking.total_amount).toFixed(2)}</span>
                        </div>
                        {booking.deposit_amount && (
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Deposit held</span>
                            <span>${Number(booking.deposit_amount).toFixed(2)}</span>
                          </div>
                        )}
                        
                        {/* Amount Due / Record Payment */}
                        <Separator />
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-sm text-muted-foreground">Amount Due</span>
                            <p className={`font-semibold ${getAmountDue() <= 0 ? "text-green-600" : "text-destructive"}`}>
                              ${getAmountDue().toFixed(2)}
                            </p>
                          </div>
                          {getAmountDue() > 0 && (
                            <Button size="sm" onClick={handleOpenPaymentDialog}>
                              <Banknote className="h-4 w-4 mr-2" />
                              Record Payment
                            </Button>
                          )}
                        </div>

                        {booking.payments?.length > 0 && (
                          <>
                            <Separator />
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Transactions</p>
                              {booking.payments.map((payment: any) => (
                                <div key={payment.id} className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    {payment.payment_type} - {payment.payment_method || "N/A"}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span>${Number(payment.amount).toFixed(2)}</span>
                                    <Badge variant={payment.status === "completed" ? "default" : "secondary"} className="text-xs">
                                      {payment.status}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="verification" className="mt-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <FileCheck className="h-4 w-4" />
                            Verification Status
                          </CardTitle>
                          <StatusBadge status={getVerificationStatus() as any} />
                        </div>
                      </CardHeader>
                      <CardContent>
                        {booking.verifications?.length > 0 ? (
                          <div className="space-y-3">
                            {booking.verifications.map((v: any) => (
                              <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                <div>
                                  <p className="font-medium text-sm">{v.document_type}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Submitted {format(new Date(v.created_at), "PPp")}
                                  </p>
                                </div>
                                <StatusBadge status={v.status} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No verification documents submitted</p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="inspection" className="mt-4">
                    <div className="space-y-4">
                      {/* Inspection Metrics */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Gauge className="h-4 w-4" />
                            Inspection Metrics
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {booking.inspections?.length > 0 ? (
                            <div className="space-y-4">
                              {booking.inspections.map((insp: any) => (
                                <div key={insp.id} className="p-3 rounded-lg bg-muted/50">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline">{insp.phase}</Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(insp.recorded_at), "PPp")}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex items-center gap-2">
                                      <Fuel className="h-4 w-4 text-muted-foreground" />
                                      <span>Fuel: {insp.fuel_level}%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Gauge className="h-4 w-4 text-muted-foreground" />
                                      <span>Odometer: {insp.odometer?.toLocaleString()} mi</span>
                                    </div>
                                  </div>
                                  {insp.exterior_notes && (
                                    <p className="mt-2 text-xs text-muted-foreground">{insp.exterior_notes}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No inspection data recorded</p>
                          )}
                        </CardContent>
                      </Card>

                      {/* Condition Photos */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Camera className="h-4 w-4" />
                            Condition Photos
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {booking.photos?.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                              {booking.photos.map((photo: any) => (
                                <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                                  <img 
                                    src={photo.photo_url} 
                                    alt={photo.photo_type}
                                    className="object-cover w-full h-full"
                                  />
                                  <Badge 
                                    variant="secondary" 
                                    className="absolute bottom-1 left-1 text-[10px]"
                                  >
                                    {photo.phase}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No photos uploaded</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="audit" className="mt-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Audit Events
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {booking.auditLogs?.length > 0 ? (
                          <div className="space-y-2">
                            {booking.auditLogs.map((log: any) => (
                              <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{log.action}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(log.created_at), "PPp")}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No audit events recorded</p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                {/* Quick Actions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/admin/billing?booking=${booking.id}`}>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Generate Receipt
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/admin/damages?booking=${booking.id}`}>
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Report Damage
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Booking not found</p>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, status: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the booking status to "{confirmDialog.status}"? 
              This action will be logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record In-Person Payment</DialogTitle>
            <DialogDescription>
              Record a cash, card terminal, or e-transfer payment for this booking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={paymentData.amount}
                onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Payment Method</Label>
              <Select
                value={paymentData.method}
                onValueChange={(value: PaymentMethod) => setPaymentData(prev => ({ ...prev, method: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card_terminal">Card Terminal</SelectItem>
                  <SelectItem value="e_transfer">E-Transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference (optional)</Label>
              <Input
                id="reference"
                placeholder="Transaction ID or reference"
                value={paymentData.reference}
                onChange={(e) => setPaymentData(prev => ({ ...prev, reference: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes..."
                value={paymentData.notes}
                onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRecordPayment} 
              disabled={!paymentData.amount || recordPayment.isPending}
            >
              {recordPayment.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
