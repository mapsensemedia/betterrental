import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Car,
  MapPin,
  Calendar,
  Clock,
  CreditCard,
  QrCode,
  Copy,
  Check,
  Loader2,
  ArrowLeft,
  AlertCircle,
  MessageCircle,
  Receipt,
  Send,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useBookingReceipts } from "@/hooks/use-receipts";
import { useCreateTicket, useCustomerTickets, useCustomerTicketById, useSendTicketMessage } from "@/hooks/use-tickets";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VerificationUpload } from "@/components/booking/VerificationUpload";
import { ConditionPhotosUpload } from "@/components/booking/ConditionPhotosUpload";
import { VerificationModal } from "@/components/booking/VerificationModal";
import { TripContextBar } from "@/components/shared/TripContextBar";

interface BookingData {
  id: string;
  booking_code: string;
  status: string;
  start_at: string;
  end_at: string;
  daily_rate: number;
  total_days: number;
  subtotal: number;
  tax_amount: number | null;
  deposit_amount: number | null;
  total_amount: number;
  notes: string | null;
  vehicles: {
    id: string;
    make: string;
    model: string;
    year: number;
    image_url: string | null;
    category: string;
  } | null;
  locations: {
    id: string;
    name: string;
    address: string;
    city: string;
  } | null;
}

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Ticket creation state
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  
  // Receipt state
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  
  // Verification modal state (show after booking confirmation)
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  
  const { data: receipts = [] } = useBookingReceipts(id || null);
  const { data: tickets = [] } = useCustomerTickets();
  const { data: ticketThread } = useCustomerTicketById(selectedTicketId);
  const createTicket = useCreateTicket();
  const sendMessage = useSendTicketMessage();
  
  // Filter tickets for this booking
  const bookingTickets = tickets.filter(t => t.bookingId === id);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: `/booking/${id}` } });
    }
  }, [user, authLoading, navigate, id]);

  // Fetch booking
  useEffect(() => {
    async function fetchBooking() {
      if (!id || !user) return;

      try {
        const { data, error: fetchError } = await supabase
          .from("bookings")
          .select(`
            id,
            booking_code,
            status,
            start_at,
            end_at,
            daily_rate,
            total_days,
            subtotal,
            tax_amount,
            deposit_amount,
            total_amount,
            notes,
            vehicles (id, make, model, year, image_url, category),
            locations (id, name, address, city)
          `)
          .eq("id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (fetchError) {
          console.error("Error fetching booking:", fetchError);
          setError("Failed to load booking details");
        } else if (!data) {
          setError("Booking not found");
        } else {
          setBooking(data);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchBooking();
    }
  }, [id, user]);

  const handleCopyCode = async () => {
    if (!booking?.booking_code) return;
    try {
      await navigator.clipboard.writeText(booking.booking_code);
      setCopied(true);
      toast.success("Booking code copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const checkInUrl = booking 
    ? `${window.location.origin}/check-in?code=${booking.booking_code}`
    : "";

  const handleCreateTicket = () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      toast.error("Please fill in subject and message");
      return;
    }
    
    createTicket.mutate({
      subject: ticketSubject,
      message: ticketMessage,
      bookingId: id,
    }, {
      onSuccess: () => {
        setShowTicketDialog(false);
        setTicketSubject("");
        setTicketMessage("");
        toast.success("Support ticket created!");
      },
    });
  };

  const handleSendReply = () => {
    if (!replyMessage.trim() || !selectedTicketId) return;
    
    sendMessage.mutate({
      ticketId: selectedTicketId,
      message: replyMessage,
      isStaff: false,
    }, {
      onSuccess: () => {
        setReplyMessage("");
      },
    });
  };

  // Loading state
  if (loading || authLoading) {
    return (
      <CustomerLayout>
        <PageContainer className="pt-28 flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading booking...</p>
          </div>
        </PageContainer>
      </CustomerLayout>
    );
  }

  // Error state
  if (error || !booking) {
    return (
      <CustomerLayout>
        <PageContainer className="pt-28 flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold">Booking Not Found</h2>
              <p className="text-muted-foreground">
                {error || "We couldn't find this booking."}
              </p>
              <Button asChild className="mt-4">
                <Link to="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        </PageContainer>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <PageContainer className="pt-28 pb-16">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Back button */}
          <Button variant="ghost" asChild className="-ml-2">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="text-lg px-4 py-1 font-mono">
                  {booking.booking_code}
                </Badge>
                <StatusBadge status={booking.status as any} />
              </div>
              <h1 className="heading-2">
                {booking.vehicles?.year} {booking.vehicles?.make} {booking.vehicles?.model}
              </h1>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Main content - 2 columns */}
            <div className="md:col-span-2 space-y-6">
              {/* Vehicle */}
              {booking.vehicles && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Car className="h-5 w-5 text-primary" />
                      Vehicle
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-4">
                    {booking.vehicles.image_url && (
                      <div className="w-32 h-24 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={booking.vehicles.image_url}
                          alt={`${booking.vehicles.make} ${booking.vehicles.model}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-lg">
                        {booking.vehicles.year} {booking.vehicles.make} {booking.vehicles.model}
                      </p>
                      <p className="text-muted-foreground capitalize">
                        {booking.vehicles.category}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Dates & Location */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-5 w-5 text-primary" />
                    Reservation Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Pick-up</p>
                      <p className="font-medium">{format(new Date(booking.start_at), "EEE, MMM d, yyyy")}</p>
                      <p className="text-primary">{format(new Date(booking.start_at), "h:mm a")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Return</p>
                      <p className="font-medium">{format(new Date(booking.end_at), "EEE, MMM d, yyyy")}</p>
                      <p className="text-muted-foreground">{format(new Date(booking.end_at), "h:mm a")}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {booking.locations && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">{booking.locations.name}</p>
                        <p className="text-muted-foreground text-sm">{booking.locations.address}</p>
                        <p className="text-muted-foreground text-sm">{booking.locations.city}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Payment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      ${Number(booking.daily_rate).toFixed(2)} × {booking.total_days} days
                    </span>
                    <span>${Number(booking.subtotal).toFixed(2)}</span>
                  </div>
                  {booking.tax_amount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxes & Fees</span>
                      <span>${Number(booking.tax_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${Number(booking.total_amount).toFixed(2)}</span>
                  </div>
                  {booking.deposit_amount && Number(booking.deposit_amount) > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Security Deposit (held)</span>
                      <span>${Number(booking.deposit_amount).toFixed(2)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Verification Upload */}
              {id && (
                <div data-verification-section>
                  <VerificationUpload bookingId={id} />
                </div>
              )}

              {/* Vehicle Condition Photos */}
              {id && (
                <ConditionPhotosUpload bookingId={id} bookingStatus={booking.status} />
              )}
            </div>

            {/* Sidebar - QR Code */}
            <div className="space-y-6">
              {/* Check-In QR Card */}
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="flex items-center justify-center gap-2 text-base">
                    <QrCode className="h-5 w-5 text-primary" />
                    Pickup Check-In
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  {/* Booking Code Display */}
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Booking Number</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl font-mono font-bold tracking-wider">
                        {booking.booking_code}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={handleCopyCode}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="bg-white rounded-xl p-4 inline-block">
                    <QRCodeSVG
                      value={checkInUrl}
                      size={180}
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Show this at pickup. If scanning fails, staff can type the code.
                  </p>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Need Help?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to={`/location/${booking.locations?.id}`}>
                      <MapPin className="h-4 w-4 mr-2" />
                      View Location Details
                    </Link>
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" className="w-full justify-start opacity-50 cursor-not-allowed">
                          <Clock className="h-4 w-4 mr-2" />
                          Modify Reservation
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Modifications coming soon — please contact support or cancel/rebook.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setShowTicketDialog(true)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                </CardContent>
              </Card>

              {/* Receipts */}
              {receipts.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Receipts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {receipts.map((receipt: any) => (
                      <div
                        key={receipt.id}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedReceipt(receipt)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-mono text-sm font-medium">{receipt.receipt_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(receipt.issued_at), "MMM d, yyyy")}
                            </p>
                          </div>
                          <Badge className="bg-green-500/10 text-green-600">
                            ${(receipt.totals_json as any)?.total?.toFixed(2)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Support Tickets for this booking */}
              {bookingTickets.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Support Tickets
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {bookingTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedTicketId(ticket.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{ticket.subject}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {ticket.lastMessage?.message || "No messages"}
                            </p>
                          </div>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {ticket.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </PageContainer>

      {/* Create Ticket Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Contact Support
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                placeholder="Brief description of your issue"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Describe your issue in detail..."
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                rows={4}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This ticket will be linked to booking {booking.booking_code}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTicketDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTicket}
              disabled={createTicket.isPending || !ticketSubject.trim() || !ticketMessage.trim()}
            >
              {createTicket.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Thread Dialog */}
      <Dialog open={!!selectedTicketId} onOpenChange={() => setSelectedTicketId(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              {ticketThread?.subject || "Support Ticket"}
            </DialogTitle>
          </DialogHeader>
          
          {ticketThread && (
            <>
              <div className="flex-1 overflow-y-auto space-y-3 py-4 min-h-[200px] max-h-[400px]">
                {ticketThread.messages.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-xl max-w-[85%] ${
                      msg.isStaff
                        ? "bg-primary/10 mr-auto"
                        : "bg-muted ml-auto"
                    }`}
                  >
                    <p className="text-xs font-medium mb-1">
                      {msg.isStaff ? "Support Team" : "You"}
                    </p>
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                ))}
              </div>
              
              {ticketThread.status !== "closed" && ticketThread.status !== "resolved" && (
                <div className="flex gap-2 pt-4 border-t">
                  <Input
                    placeholder="Type your reply..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={sendMessage.isPending || !replyMessage.trim()}
                  >
                    {sendMessage.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Detail Dialog */}
      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Receipt Details
            </DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Receipt Number</p>
                  <p className="font-mono font-bold text-lg">{selectedReceipt.receipt_number}</p>
                </div>
                <Badge className="bg-green-500/10 text-green-600">Issued</Badge>
              </div>

              <Separator />

              <div className="space-y-2">
                {(selectedReceipt.line_items_json as any[])?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.description}</span>
                    <span>${Number(item.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-muted rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${(selectedReceipt.totals_json as any)?.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${(selectedReceipt.totals_json as any)?.tax?.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${(selectedReceipt.totals_json as any)?.total?.toFixed(2)}</span>
                </div>
              </div>

              {selectedReceipt.notes && (
                <div className="p-4 bg-muted/50 rounded-xl">
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{selectedReceipt.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Verification Modal - appears after booking loaded with pending status */}
      <VerificationModal
        open={showVerificationModal}
        onOpenChange={setShowVerificationModal}
        bookingCode={booking?.booking_code || ""}
        onUploadNow={() => {
          setShowVerificationModal(false);
          // Scroll to verification section
          const verificationSection = document.querySelector('[data-verification-section]');
          verificationSection?.scrollIntoView({ behavior: 'smooth' });
        }}
      />
    </CustomerLayout>
  );
}
