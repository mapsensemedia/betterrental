import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  User, 
  Car, 
  MapPin, 
  Calendar, 
  DollarSign,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  FileText,
  Eye,
  Copy,
  MessageSquare,
  ExternalLink,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { StepCompletion } from "@/lib/ops-steps";

interface OpsBookingSummaryProps {
  booking: any;
  completion?: StepCompletion;
  onOpenAgreement?: () => void;
  onOpenWalkaround?: () => void;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}

function CollapsibleSection({ 
  title, 
  icon, 
  children, 
  defaultOpen = false,
  badge,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-medium">{title}</span>
            {badge}
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 pt-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function OpsBookingSummary({ 
  booking, 
  completion,
  onOpenAgreement,
  onOpenWalkaround,
}: OpsBookingSummaryProps) {
  const [allExpanded, setAllExpanded] = useState(true);
  
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
            onClick={() => setAllExpanded(!allExpanded)}
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
          {/* Customer Section */}
          <CollapsibleSection
            title="Customer"
            icon={<User className="h-4 w-4 text-muted-foreground" />}
            defaultOpen={allExpanded}
          >
            <div className="space-y-2 text-sm">
              <p className="font-medium">{booking.profiles?.full_name || "Unknown"}</p>
              {booking.profiles?.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate text-xs">{booking.profiles.email}</span>
                </div>
              )}
              {booking.profiles?.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span className="text-xs">{booking.profiles.phone}</span>
                </div>
              )}
            </div>
          </CollapsibleSection>
          
          <Separator />
          
          {/* Vehicle Section */}
          <CollapsibleSection
            title="Vehicle"
            icon={<Car className="h-4 w-4 text-muted-foreground" />}
            defaultOpen={allExpanded}
          >
            <div className="space-y-2 text-sm">
              <p className="font-medium">{vehicleName}</p>
              {booking.vehicles?.category && (
                <Badge variant="outline" className="text-xs">
                  {booking.vehicles.category}
                </Badge>
              )}
              {booking.assigned_unit_id && (
                <p className="text-xs text-muted-foreground">
                  Unit assigned
                </p>
              )}
            </div>
          </CollapsibleSection>
          
          <Separator />
          
          {/* Rental Period Section */}
          <CollapsibleSection
            title="Rental Period"
            icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
            defaultOpen={allExpanded}
          >
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Pickup</span>
                <span>{format(new Date(booking.start_at), "PP p")}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Return</span>
                <span>{format(new Date(booking.end_at), "PP p")}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{booking.total_days} days</span>
              </div>
            </div>
          </CollapsibleSection>
          
          <Separator />
          
          {/* Location Section */}
          <CollapsibleSection
            title={booking.pickup_address ? "Delivery" : "Pickup Location"}
            icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
            defaultOpen={allExpanded}
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
            defaultOpen={allExpanded}
            badge={
              !completion?.payment.paymentComplete && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500 text-amber-600">
                  Unpaid
                </Badge>
              )
            }
          >
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Daily Rate</span>
                <span>${Number(booking.daily_rate).toFixed(2)}</span>
              </div>
              {Number(booking.young_driver_fee) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Young driver fee</span>
                  <span>${Number(booking.young_driver_fee).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${Number(booking.subtotal).toFixed(2)}</span>
              </div>
              {booking.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${Number(booking.tax_amount).toFixed(2)}</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>${Number(booking.total_amount).toFixed(2)}</span>
              </div>
              {booking.deposit_amount && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Deposit</span>
                  <span>${Number(booking.deposit_amount).toFixed(2)}</span>
                </div>
              )}
            </div>
          </CollapsibleSection>
          
          <Separator />
          
          {/* Status Section */}
          <CollapsibleSection
            title="Status"
            icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            defaultOpen={allExpanded}
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
        </div>
      </ScrollArea>
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
