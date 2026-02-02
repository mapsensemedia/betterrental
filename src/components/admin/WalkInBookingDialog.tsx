import { useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLocations } from "@/hooks/use-locations";
import { useVehicles } from "@/hooks/use-vehicles";
import { cn } from "@/lib/utils";
import { 
  Loader2, 
  CalendarIcon, 
  Car, 
  User,
  MapPin,
  DollarSign,
  Clock,
} from "lucide-react";
import { 
  PICKUP_TIME_SLOTS, 
  DEFAULT_PICKUP_TIME 
} from "@/lib/rental-rules";
import { 
  calculateBookingPricing, 
  DEFAULT_DEPOSIT_AMOUNT, 
  TOTAL_TAX_RATE 
} from "@/lib/pricing";

interface WalkInBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalkInBookingDialog({ open, onOpenChange }: WalkInBookingDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: locations } = useLocations();
  const { data: allVehicles } = useVehicles();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    // Customer info
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    // Booking info
    locationId: "",
    vehicleId: "",
    startDate: new Date(),
    endDate: addDays(new Date(), 1),
    pickupTime: DEFAULT_PICKUP_TIME,
    returnTime: DEFAULT_PICKUP_TIME,
    dailyRate: 0,
    depositAmount: DEFAULT_DEPOSIT_AMOUNT,
    notes: "",
  });

  // Filter vehicles by selected location
  const availableVehicles = allVehicles?.filter(v => 
    v.isAvailable && 
    (!formData.locationId || v.locationId === formData.locationId || !v.locationId)
  );

  // Calculate totals using central pricing utility
  const totalDays = Math.max(1, Math.ceil(
    (formData.endDate.getTime() - formData.startDate.getTime()) / (1000 * 60 * 60 * 24)
  ));
  
  const pricing = calculateBookingPricing({
    vehicleDailyRate: formData.dailyRate,
    rentalDays: totalDays,
    pickupDate: formData.startDate,
  });
  
  const subtotal = pricing.subtotal;
  const taxAmount = pricing.taxAmount;
  const totalAmount = pricing.total;

  // Auto-set daily rate when vehicle is selected
  useEffect(() => {
    if (formData.vehicleId && availableVehicles) {
      const vehicle = availableVehicles.find(v => v.id === formData.vehicleId);
      if (vehicle) {
        setFormData(prev => ({ ...prev, dailyRate: Number(vehicle.dailyRate) }));
      }
    }
  }, [formData.vehicleId, availableVehicles]);

  const generateBookingCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    // Validation
    if (!formData.firstName || !formData.lastName) {
      toast.error("Customer name is required");
      return;
    }
    if (!formData.email) {
      toast.error("Customer email is required");
      return;
    }
    if (!formData.locationId) {
      toast.error("Please select a location");
      return;
    }
    if (!formData.vehicleId) {
      toast.error("Please select a vehicle");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // First create or find the customer profile
      // Check if user exists by email
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", formData.email.toLowerCase().trim())
        .maybeSingle();

      let customerId: string;

      if (existingUser) {
        customerId = existingUser.id;
      } else {
        // Create a guest user via edge function
        const { data: guestResult, error: guestError } = await supabase.functions.invoke(
          "create-guest-booking",
          {
            body: {
              email: formData.email.toLowerCase().trim(),
              firstName: formData.firstName,
              lastName: formData.lastName,
              phone: formData.phone,
              vehicleId: formData.vehicleId,
              locationId: formData.locationId,
              startAt: formData.startDate.toISOString(),
              endAt: formData.endDate.toISOString(),
              dailyRate: formData.dailyRate,
              totalDays,
              subtotal,
              taxAmount,
              depositAmount: formData.depositAmount,
              totalAmount,
              notes: formData.notes ? `Walk-in booking: ${formData.notes}` : "Walk-in booking",
            },
          }
        );

        if (guestError) throw guestError;
        
        // Navigate to the booking ops page
        if (guestResult?.booking?.id) {
          toast.success(`Walk-in booking created: ${guestResult.booking.bookingCode || guestResult.booking.booking_code}`);
          onOpenChange(false);
          navigate(`/admin/bookings/${guestResult.booking.id}/ops?returnTo=/admin/bookings`);
          return;
        }
        
        throw new Error("Failed to create booking");
      }

      // If customer exists, create booking directly
      const bookingCode = generateBookingCode();
      
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          user_id: customerId,
          vehicle_id: formData.vehicleId,
          location_id: formData.locationId,
          booking_code: bookingCode,
          start_at: formData.startDate.toISOString(),
          end_at: formData.endDate.toISOString(),
          daily_rate: formData.dailyRate,
          total_days: totalDays,
          subtotal,
          tax_amount: taxAmount,
          deposit_amount: formData.depositAmount,
          total_amount: totalAmount,
          status: "confirmed",
          notes: formData.notes ? `Walk-in booking: ${formData.notes}` : "Walk-in booking",
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      toast.success(`Walk-in booking created: ${bookingCode}`);
      onOpenChange(false);
      navigate(`/admin/bookings/${booking.id}/ops?returnTo=/admin/bookings`);
      
    } catch (error: any) {
      console.error("Walk-in booking error:", error);
      toast.error(error.message || "Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedVehicle = availableVehicles?.find(v => v.id === formData.vehicleId);
  const selectedLocation = locations?.find(l => l.id === formData.locationId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Create Walk-In Booking
          </DialogTitle>
          <DialogDescription>
            Create a new booking for a walk-in customer at the rental location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Location & Vehicle */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Car className="h-4 w-4" />
              Rental Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location *</Label>
                <Select
                  value={formData.locationId}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    locationId: value,
                    vehicleId: "", // Reset vehicle when location changes
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          {loc.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vehicle *</Label>
                <Select
                  value={formData.vehicleId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, vehicleId: value }))}
                  disabled={!formData.locationId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.locationId ? "Select vehicle" : "Select location first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVehicles?.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        <div className="flex items-center gap-2">
                          <Car className="h-3 w-3" />
                          {vehicle.year} {vehicle.make} {vehicle.model}
                          <Badge variant="secondary" className="ml-1 text-xs">
                            ${vehicle.dailyRate}/day
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.startDate ? format(formData.startDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.startDate}
                      onSelect={(date) => date && setFormData(prev => ({ 
                        ...prev, 
                        startDate: date,
                        endDate: prev.endDate <= date ? addDays(date, 1) : prev.endDate
                      }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.endDate ? format(formData.endDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.endDate}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, endDate: date }))}
                      disabled={(date) => date <= formData.startDate}
                      initialFocus
                    />
                  </PopoverContent>
              </Popover>
              </div>
            </div>

            {/* Time Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pickup Time</Label>
                <Select
                  value={formData.pickupTime}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, pickupTime: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {PICKUP_TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {slot.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Return Time</Label>
                <Select
                  value={formData.returnTime}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, returnTime: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {PICKUP_TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {slot.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dailyRate">Daily Rate ($)</Label>
                <Input
                  id="dailyRate"
                  type="number"
                  value={formData.dailyRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dailyRate: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="depositAmount">Deposit Amount ($)</Label>
                <Input
                  id="depositAmount"
                  type="number"
                  value={formData.depositAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, depositAmount: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Price Summary */}
            <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {totalDays} day{totalDays !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vehicle (${formData.dailyRate}/day)</span>
                <span>${pricing.vehicleBaseTotal.toFixed(2)}</span>
              </div>
              {pricing.weekendSurcharge > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>Weekend surcharge (15%)</span>
                  <span>+${pricing.weekendSurcharge.toFixed(2)}</span>
                </div>
              )}
              {pricing.durationDiscount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>{pricing.discountType === "monthly" ? "Monthly" : "Weekly"} discount</span>
                  <span>-${pricing.durationDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Daily fees (PVRT + ACSRCH)</span>
                <span>${pricing.dailyFeesTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({(TOTAL_TAX_RATE * 100).toFixed(0)}%)</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground text-xs pl-4">
                <span>PST (7%)</span>
                <span>${pricing.pstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground text-xs pl-4">
                <span>GST (5%)</span>
                <span>${pricing.gstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm pt-1 border-t">
                <span className="text-muted-foreground">Security Deposit</span>
                <span>${formData.depositAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total (excl. deposit)</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any special instructions or notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Booking...
              </>
            ) : (
              "Create Walk-In Booking"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
