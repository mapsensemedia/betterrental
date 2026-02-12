import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { calculateBookingPricing } from "@/lib/pricing";
import { DeliveryShell } from "@/components/delivery/DeliveryShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useLocations } from "@/hooks/use-locations";
import { useBrowseCategories } from "@/hooks/use-browse-categories";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, Check, Car, User, MapPin } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────────
// WALK-IN BOOKING PAGE (REBUILT)
// ─────────────────────────────────────────────────────────────────────────────

export default function DeliveryWalkIn() {
  const navigate = useNavigate();
  const { data: locations } = useLocations();
  const { data: categories } = useBrowseCategories();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    locationId: "",
    categoryId: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
    // NEW: Delivery address field
    deliveryAddress: "",
    notes: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.customerPhone || !formData.locationId || !formData.categoryId) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Require delivery address for walk-in deliveries
    if (!formData.deliveryAddress) {
      toast.error("Delivery address is required for walk-in bookings");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user (the staff member creating this)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      // Get selected category for pricing
      const selectedCategory = categories?.find(c => c.id === formData.categoryId);
      if (!selectedCategory) {
        throw new Error("Category not found");
      }

      const startAt = new Date(formData.startDate);
      const endAt = new Date(formData.endDate);
      const days = Math.ceil((endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60 * 24)) || 1;
      const dailyRate = selectedCategory.dailyRate || 50;
      const pricing = calculateBookingPricing({
        vehicleDailyRate: dailyRate,
        rentalDays: days,
        pickupDate: startAt,
      });
      const subtotal = pricing.subtotal;
      const taxAmount = pricing.taxAmount;
      const totalAmount = pricing.total;

      // Create the booking (DON'T auto-assign current user as driver)
      const { data: booking, error } = await supabase
        .from("bookings")
        .insert([{
          user_id: user.id, // Created by this staff member (as customer placeholder)
          vehicle_id: formData.categoryId,
          location_id: formData.locationId,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          status: "confirmed" as const,
          daily_rate: dailyRate,
          total_days: days,
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          booking_source: "walk_in",
          pickup_contact_name: formData.customerName,
          pickup_contact_phone: formData.customerPhone,
          pickup_address: formData.deliveryAddress, // NEW: Required delivery address
          notes: formData.notes || null,
          // NOT setting assigned_driver_id - let ops assign a driver
          booking_code: `WI${Date.now().toString(36).toUpperCase()}`,
        }])
        .select()
        .single();

      if (error) throw error;

      // Create initial delivery status as unassigned
      const { error: statusError } = await supabase
        .from("delivery_statuses")
        .insert({
          booking_id: booking.id,
          status: "unassigned",
          notes: "Walk-in booking created - awaiting driver assignment",
          updated_by: user.id,
        });

      if (statusError) {
        console.warn("Failed to create delivery status:", statusError);
        // Don't fail the booking creation for this
      }

      toast.success("Walk-in booking created successfully");
      navigate(`/delivery/${booking.id}`);
    } catch (error) {
      console.error("Error creating walk-in booking:", error);
      toast.error("Failed to create booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DeliveryShell>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/delivery")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Create Walk-In Delivery</h1>
            <p className="text-sm text-muted-foreground">
              Quick booking for on-site customers requesting delivery
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Customer Information */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customerName">Full Name *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => handleChange("customerName", e.target.value)}
                  placeholder="Enter customer name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerPhone">Phone *</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => handleChange("customerPhone", e.target.value)}
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => handleChange("customerEmail", e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Address (NEW - Required) */}
          <Card className="mb-4 border-primary/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Delivery Address *
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.deliveryAddress}
                onChange={(e) => handleChange("deliveryAddress", e.target.value)}
                placeholder="Enter the full delivery address..."
                rows={2}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                This is required for walk-in delivery bookings.
              </p>
            </CardContent>
          </Card>

          {/* Rental Details */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Car className="h-5 w-5" />
                Rental Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="locationId">Dispatch Location *</Label>
                <Select
                  value={formData.locationId}
                  onValueChange={(value) => handleChange("locationId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="categoryId">Vehicle Category *</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => handleChange("categoryId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name} - ${category.dailyRate}/day
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleChange("startDate", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleChange("endDate", e.target.value)}
                    min={formData.startDate}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Any special instructions or notes..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Booking...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Create Walk-In Delivery
              </>
            )}
          </Button>
        </form>
      </div>
    </DeliveryShell>
  );
}
