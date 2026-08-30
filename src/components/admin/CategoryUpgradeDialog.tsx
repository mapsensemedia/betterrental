/**
 * CategoryUpgradeDialog - Allow admin to change/upgrade booking category with price recalculation
 */
import { useState, useMemo } from "react";
import { ArrowUpCircle, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { calculateBookingPricing, TOTAL_TAX_RATE, DriverAgeBand } from "@/lib/pricing";

interface CategoryUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    booking_code: string;
    vehicle_id: string;
    total_days: number;
    daily_rate: number;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    driver_age_band?: string | null;
    young_driver_fee?: number | null;
    start_at: string;
    vehicles?: {
      category?: string;
      make?: string;
      model?: string;
    } | null;
  };
}

export function CategoryUpgradeDialog({
  open,
  onOpenChange,
  booking,
}: CategoryUpgradeDialogProps) {
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(booking.vehicle_id);
  const [upgradeReason, setUpgradeReason] = useState("");

  // Fetch all active categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["vehicle-categories-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_categories")
        .select("*")
        .eq("is_active", true)
        .order("daily_rate", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Find selected category
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const currentCategory = categories.find((c) => c.id === booking.vehicle_id);

  // Calculate new pricing
  const newPricing = useMemo(() => {
    if (!selectedCategory) return null;

    const driverAgeBand = booking.driver_age_band as DriverAgeBand | null;
    const pickupDate = new Date(booking.start_at);

    return calculateBookingPricing({
      vehicleDailyRate: Number(selectedCategory.daily_rate),
      rentalDays: booking.total_days,
      driverAgeBand,
      pickupDate,
      // Note: We'd need to fetch add-ons and protection to recalculate fully
      // For now, recalculating base vehicle + young driver fee + taxes
    });
  }, [selectedCategory, booking]);

  // Calculate price difference
  const priceDifference = newPricing
    ? newPricing.total - booking.total_amount
    : 0;

  const isUpgrade = selectedCategoryId !== booking.vehicle_id && priceDifference > 0;
  const isDowngrade = selectedCategoryId !== booking.vehicle_id && priceDifference < 0;
  const noChange = selectedCategoryId === booking.vehicle_id;

  // Mutation to update booking category — server-side (client writes to financial
  // fields are blocked by database triggers, which is why direct updates failed).
  const updateCategory = useMutation({
    mutationFn: async () => {
      if (!selectedCategory) {
        throw new Error("No category selected");
      }

      const { data, error } = await supabase.functions.invoke("reprice-booking", {
        body: {
          bookingId: booking.id,
          operation: "modify",
          newCategoryId: selectedCategoryId,
          newDailyRate: Number(selectedCategory.daily_rate),
          reason: upgradeReason || `Category changed to ${selectedCategory.name}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return { newTotal: Number(data?.total ?? 0) };
    },
    onSuccess: (data) => {
      toast.success(
        data.newTotal > 0
          ? `Category ${isUpgrade ? "upgraded" : "changed"}. New total: $${data.newTotal.toFixed(2)} CAD`
          : `Category ${isUpgrade ? "upgraded" : "changed"} successfully`
      );
      queryClient.invalidateQueries({ queryKey: ["booking"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error("Category update error:", error);
      toast.error(error.message || "Failed to update category");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5" />
            Change Vehicle Category
          </DialogTitle>
          <DialogDescription>
            Update the vehicle category for booking {booking.booking_code}. Pricing
            will be recalculated automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Category */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <Label className="text-xs text-muted-foreground">Current Category</Label>
            <p className="font-medium">
              {currentCategory?.name || booking.vehicles?.category || "Unknown"}
            </p>
            <p className="text-sm text-muted-foreground">
              ${Number(booking.daily_rate).toFixed(2)} CAD/day
            </p>
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label>New Category</Label>
            <Select
              value={selectedCategoryId}
              onValueChange={setSelectedCategoryId}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center justify-between gap-4 w-full">
                      <span>{cat.name}</span>
                      <span className="text-muted-foreground">
                        ${Number(cat.daily_rate).toFixed(2)} CAD/day
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price Comparison */}
          {!noChange && newPricing && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Original Total</span>
                  <span>${booking.total_amount.toFixed(2)} CAD</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">New Total</span>
                  <span className="font-semibold">${newPricing.total.toFixed(2)} CAD</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Difference</span>
                  <Badge
                    variant={isUpgrade ? "default" : "secondary"}
                    className={
                      isUpgrade
                        ? "bg-emerald-500"
                        : isDowngrade
                        ? "bg-amber-500"
                        : ""
                    }
                  >
                    {priceDifference >= 0 ? "+" : ""}
                    ${priceDifference.toFixed(2)} CAD
                  </Badge>
                </div>
              </div>
            </>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Change (Optional)</Label>
            <Textarea
              id="reason"
              value={upgradeReason}
              onChange={(e) => setUpgradeReason(e.target.value)}
              placeholder="e.g., Customer requested upgrade, original category unavailable..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => updateCategory.mutate()}
            disabled={noChange || updateCategory.isPending}
          >
            {updateCategory.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : isUpgrade ? (
              "Upgrade & Recalculate"
            ) : (
              "Change Category"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
