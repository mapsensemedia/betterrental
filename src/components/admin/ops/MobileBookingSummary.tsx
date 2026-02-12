/**
 * Mobile/Tablet Booking Summary - accessible via drawer
 */
import { format } from "date-fns";
import { displayName, formatPhone } from "@/lib/format-customer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  Info,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { StepCompletion } from "@/lib/ops-steps";
import { OpsActivityTimeline } from "./OpsActivityTimeline";
import { FinancialBreakdown } from "./FinancialBreakdown";
import { useState } from "react";

interface MobileBookingSummaryProps {
  booking: any;
  completion?: StepCompletion;
  onOpenAgreement?: () => void;
  onOpenWalkaround?: () => void;
}

export function MobileBookingSummary({ 
  booking, 
  completion,
  onOpenAgreement,
  onOpenWalkaround,
}: MobileBookingSummaryProps) {
  const [open, setOpen] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  
  const vehicleName = booking.vehicles 
    ? `${booking.vehicles.year} ${booking.vehicles.make} ${booking.vehicles.model}`
    : "No vehicle assigned";
  
  // Calculate alerts
  const alerts: { type: "error" | "warning"; message: string }[] = [];
  
  if (!completion?.payment.paymentComplete) {
    alerts.push({ type: "warning", message: "Payment pending" });
  }
  if (!completion?.agreement.agreementSigned) {
    alerts.push({ type: "warning", message: "Unsigned agreement" });
  }
  if (!completion?.walkaround.inspectionComplete) {
    alerts.push({ type: "warning", message: "Walkaround incomplete" });
  }
  
  const handleCopyBookingId = () => {
    navigator.clipboard.writeText(booking.booking_code);
    toast.success("Booking code copied");
    setOpen(false);
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
    
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="xl:hidden gap-2"
        >
          <Info className="h-4 w-4" />
          <span className="hidden sm:inline">Summary</span>
          {alerts.length > 0 && (
            <Badge 
              variant="destructive" 
              className="h-5 w-5 p-0 flex items-center justify-center text-[10px]"
            >
              {alerts.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-left">Booking Summary</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="p-4 space-y-4">
            {/* Alerts Strip */}
            {alerts.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Attention Needed
                </div>
                <div className="flex flex-wrap gap-1">
                  {alerts.map((alert, i) => (
                    <Badge 
                      key={i}
                      variant={alert.type === "error" ? "destructive" : "outline"}
                      className="text-xs"
                    >
                      {alert.message}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Quick Actions */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyBookingId}
              >
                <Copy className="h-3 w-3 mr-1" />
                {booking.booking_code}
              </Button>
              {booking.profiles?.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCallCustomer}
                >
                  <Phone className="h-3 w-3 mr-1" />
                  Call
                </Button>
              )}
              {booking.profiles?.email && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMessageCustomer}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Email
                </Button>
              )}
            </div>
            
            <Separator />
            
            {/* Customer */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 text-muted-foreground" />
                Customer
              </div>
              <div className="pl-6 space-y-1 text-sm">
                <p className="font-medium">{displayName(booking.profiles?.full_name)}</p>
                {booking.profiles?.email && (
                  <p className="text-muted-foreground text-xs">{booking.profiles.email}</p>
                )}
                {booking.profiles?.phone && (
                  <p className="text-muted-foreground text-xs">{formatPhone(booking.profiles.phone)}</p>
                )}
              </div>
            </div>
            
            {/* Vehicle */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Car className="h-4 w-4 text-muted-foreground" />
                Vehicle
              </div>
              <div className="pl-6 text-sm">
                <p className="font-medium">{vehicleName}</p>
              </div>
            </div>
            
            {/* Period */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Rental Period
              </div>
              <div className="pl-6 text-sm space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Pickup</span>
                  <span>{format(new Date(booking.start_at), "PP p")}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Return</span>
                  <span>{format(new Date(booking.end_at), "PP p")}</span>
                </div>
                <div className="flex justify-between text-xs font-medium">
                  <span>Duration</span>
                  <span>{booking.total_days} days</span>
                </div>
              </div>
            </div>
            
            {/* Location */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Location
              </div>
              <div className="pl-6 text-sm">
                <p className="font-medium">{booking.locations?.name || "Unknown"}</p>
                {booking.pickup_address && (
                  <p className="text-muted-foreground text-xs mt-1">
                    Delivery: {booking.pickup_address}
                  </p>
                )}
              </div>
            </div>
            
            {/* Payment — Full Itemized Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Payment
                {!completion?.payment.paymentComplete && (
                  <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                    Unpaid
                  </Badge>
                )}
              </div>
              <div className="pl-6">
                <FinancialBreakdown booking={booking} />
              </div>
            </div>
            
            {/* Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Status
              </div>
              <div className="pl-6">
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
                
                {/* Status indicators */}
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <StatusIndicator label="Payment" done={completion?.payment.paymentComplete} />
                  <StatusIndicator label="Deposit" done={completion?.payment.depositCollected} />
                  <StatusIndicator label="Agreement" done={completion?.agreement.agreementSigned} />
                  <StatusIndicator label="Walkaround" done={completion?.walkaround.inspectionComplete} />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Quick Links */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Quick Links</p>
              <div className="grid grid-cols-2 gap-2">
                {onOpenAgreement && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { onOpenAgreement(); setOpen(false); }}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Agreement
                  </Button>
                )}
                {onOpenWalkaround && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { onOpenWalkaround(); setOpen(false); }}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Walkaround
                  </Button>
                )}
              </div>
            </div>
            
            <Separator />
            
            {/* Activity Toggle */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowTimeline(!showTimeline)}
            >
              <History className="h-4 w-4" />
              {showTimeline ? "Hide" : "View"} Activity Timeline
            </Button>
            
            {showTimeline && (
              <OpsActivityTimeline bookingId={booking.id} />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
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
