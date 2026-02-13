import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Loader2, Check, Car, User, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

export default function DeliveryWalkIn() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
    notes: "",
    customDailyRate: "",
    customTotal: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Compute preview pricing
  const selectedCategory = categories?.find((c) => c.id === formData.categoryId);
  const startAt = new Date(formData.startDate);
  const endAt = new Date(formData.endDate);
  const days = Math.max(1, Math.ceil((endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60 * 24)));
  const effectiveDailyRate = formData.customDailyRate
    ? parseFloat(formData.customDailyRate)
    : selectedCategory?.dailyRate || 0;
  const computedSubtotal = effectiveDailyRate * days;
  const computedTax = Math.round(computedSubtotal * 0.12 * 100) / 100;
  const computedTotal = formData.customTotal
    ? parseFloat(formData.customTotal)
    : computedSubtotal + computedTax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName || !formData.customerPhone || !formData.locationId || !formData.categoryId) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!user?.id) {
      toast.error("You must be logged in");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-walk-in-booking", {
        body: {
          locationId: formData.locationId,
          categoryId: formData.categoryId,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          customerEmail: formData.customerEmail || undefined,
          notes: formData.notes || undefined,
          dailyRate: effectiveDailyRate,
          totalDays: days,
          subtotal: computedSubtotal,
          taxAmount: computedTax,
          totalAmount: computedTotal,
        },
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error === "Forbidden: staff role required") {
          toast.error("Access denied: staff role required");
        } else {
          toast.error(data.error);
        }
        return;
      }

      toast.success("Walk-in booking created successfully");
      navigate(`/delivery/${data.booking.id}`);
    } catch (error) {
      console.error("Error creating walk-in booking:", error);
      toast.error("Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DeliveryShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/delivery")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Create Walk-In Booking</h1>
            <p className="text-sm text-muted-foreground">
              Quick booking for on-site customers (staff only)
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
                <Label htmlFor="locationId">Pickup Location *</Label>
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

          {/* Pricing */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customDailyRate">
                    Custom Daily Rate
                    <span className="text-xs text-muted-foreground ml-1">
                      (default: ${selectedCategory?.dailyRate ?? "—"})
                    </span>
                  </Label>
                  <Input
                    id="customDailyRate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.customDailyRate}
                    onChange={(e) => handleChange("customDailyRate", e.target.value)}
                    placeholder={selectedCategory?.dailyRate?.toString() ?? "0"}
                  />
                </div>
                <div>
                  <Label htmlFor="customTotal">
                    Custom Total Override
                    <span className="text-xs text-muted-foreground ml-1">(optional)</span>
                  </Label>
                  <Input
                    id="customTotal"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.customTotal}
                    onChange={(e) => handleChange("customTotal", e.target.value)}
                    placeholder="Auto-calculated"
                  />
                </div>
              </div>
              {/* Price summary */}
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span>{days} day{days !== 1 ? "s" : ""} × ${effectiveDailyRate.toFixed(2)}</span>
                  <span>${computedSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (12%)</span>
                  <span>${computedTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span>Total</span>
                  <span>${computedTotal.toFixed(2)}</span>
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
          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Booking...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Create Walk-In Booking
              </>
            )}
          </Button>
        </form>
      </div>
    </DeliveryShell>
  );
}
