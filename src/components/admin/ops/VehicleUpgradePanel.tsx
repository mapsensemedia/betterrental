/**
 * VehicleUpgradePanel — Button that opens a full upgrade dialog with:
 * - Category selection with price recalculation
 * - VIN search & assignment
 * - Current vs new total comparison
 * - Per-day upgrade charge
 * - Customer visibility toggle
 * - Reason & confirmation
 */
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpCircle,
  DollarSign,
  Eye,
  EyeOff,
  Hash,
  Loader2,
  Search,
  X,
  RefreshCw,
} from "lucide-react";
import { calculateBookingPricing, DriverAgeBand } from "@/lib/pricing";

interface VehicleUpgradePanelProps {
  booking: {
    id: string;
    booking_code: string;
    total_days: number;
    daily_rate: number;
    subtotal: number;
    total_amount: number;
    location_id: string;
    vehicle_id: string;
    assigned_unit_id?: string | null;
    upgrade_daily_fee?: number | null;
    upgrade_category_label?: string | null;
    upgrade_visible_to_customer?: boolean | null;
    driver_age_band?: string | null;
    start_at?: string;
  };
}

interface FoundUnit {
  id: string;
  vin: string;
  license_plate: string;
  status: string;
  category_id: string;
  category_name: string;
  location_id: string;
}

export function VehicleUpgradePanel({ booking }: VehicleUpgradePanelProps) {
  const queryClient = useQueryClient();
  const hasExistingUpgrade = Number(booking.upgrade_daily_fee) > 0;

  const [open, setOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(booking.vehicle_id);
  const [dailyFee, setDailyFee] = useState("");
  const [showToCustomer, setShowToCustomer] = useState(false);
  const [categoryLabel, setCategoryLabel] = useState("");
  const [unitSearch, setUnitSearch] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<FoundUnit | null>(null);
  const [upgradeReason, setUpgradeReason] = useState("");

  // Fetch all active categories
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
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

  const currentCategory = categories.find((c) => c.id === booking.vehicle_id);
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const categoryChanged = selectedCategoryId !== booking.vehicle_id;

  // Calculate new pricing when category changes
  const newPricing = useMemo(() => {
    if (!selectedCategory) return null;
    const driverAgeBand = booking.driver_age_band as DriverAgeBand | null;
    const pickupDate = booking.start_at ? new Date(booking.start_at) : new Date();
    return calculateBookingPricing({
      vehicleDailyRate: Number(selectedCategory.daily_rate),
      rentalDays: booking.total_days,
      driverAgeBand,
      pickupDate,
    });
  }, [selectedCategory, booking]);

  const currentTotal = booking.total_amount;
  const newCategoryTotal = newPricing?.total ?? currentTotal;
  const priceDifference = newCategoryTotal - currentTotal;

  // Reset form when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedCategoryId(booking.vehicle_id);
      setDailyFee(hasExistingUpgrade ? String(booking.upgrade_daily_fee) : "");
      setShowToCustomer(booking.upgrade_visible_to_customer ?? false);
      setCategoryLabel(booking.upgrade_category_label ?? "");
      setUnitSearch("");
      setSelectedUnit(null);
      setUpgradeReason("");
    }
    setOpen(nextOpen);
  };

  const feeNum = parseFloat(dailyFee) || 0;
  const totalUpgradeCharge = feeNum * booking.total_days;

  // Search for units by VIN or license plate
  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: ["upgrade-unit-search", unitSearch],
    queryFn: async () => {
      const term = unitSearch.trim();
      if (term.length < 2) return [];
      const { data, error } = await supabase
        .from("vehicle_units")
        .select("id, vin, license_plate, status, category_id, location_id, vehicle_categories!inner(name)")
        .or(`vin.ilike.%${term}%,license_plate.ilike.%${term}%`)
        .eq("status", "available")
        .limit(10);
      if (error) throw error;
      return (data || []).map((u: any) => ({
        id: u.id,
        vin: u.vin,
        license_plate: u.license_plate,
        status: u.status,
        category_id: u.category_id,
        category_name: u.vehicle_categories?.name || "Unknown",
        location_id: u.location_id,
      })) as FoundUnit[];
    },
    enabled: open && unitSearch.trim().length >= 2,
    staleTime: 5000,
  });

  // Apply upgrade mutation
  const applyMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const updatePayload: Record<string, any> = {
        upgrade_daily_fee: feeNum,
        upgrade_category_label: showToCustomer ? categoryLabel || null : null,
        upgrade_visible_to_customer: showToCustomer,
        upgrade_reason: upgradeReason || null,
        upgraded_at: new Date().toISOString(),
        upgraded_by: userId,
        updated_at: new Date().toISOString(),
      };

      // If category changed, update vehicle_id and recalculate pricing
      if (categoryChanged && selectedCategory && newPricing) {
        updatePayload.original_vehicle_id = booking.vehicle_id;
        updatePayload.vehicle_id = selectedCategoryId;
        updatePayload.daily_rate = Number(selectedCategory.daily_rate);
        updatePayload.subtotal = newPricing.subtotal;
        updatePayload.tax_amount = newPricing.taxAmount;
        updatePayload.total_amount = newPricing.total;
      }

      // If a specific unit was selected, assign it
      if (selectedUnit) {
        if (booking.assigned_unit_id) {
          await supabase.rpc("release_vin_from_booking", { p_booking_id: booking.id });
        }
        await supabase.from("vehicle_units").update({ status: "on_rent" }).eq("id", selectedUnit.id);
        updatePayload.assigned_unit_id = selectedUnit.id;
        updatePayload.internal_unit_category_id = selectedUnit.category_id;
      }

      const { error } = await supabase.from("bookings").update(updatePayload).eq("id", booking.id);
      if (error) throw error;

      // Audit log
      await supabase.from("audit_logs").insert({
        action: categoryChanged ? "category_upgrade" : "upgrade_fee_applied",
        entity_type: "booking",
        entity_id: booking.id,
        user_id: userId,
        old_data: {
          vehicle_id: booking.vehicle_id,
          daily_rate: booking.daily_rate,
          total_amount: booking.total_amount,
        },
        new_data: {
          vehicle_id: categoryChanged ? selectedCategoryId : booking.vehicle_id,
          daily_rate: categoryChanged ? Number(selectedCategory?.daily_rate) : booking.daily_rate,
          total_amount: categoryChanged ? newPricing?.total : booking.total_amount,
          upgrade_daily_fee: feeNum,
          visible_to_customer: showToCustomer,
          reason: upgradeReason,
          assigned_unit_id: selectedUnit?.id || null,
          assigned_unit_vin: selectedUnit?.vin || null,
        },
      });

      return { newTotal: categoryChanged ? newPricing?.total : currentTotal };
    },
    onSuccess: (data) => {
      toast.success(
        categoryChanged
          ? `Category upgraded! New total: $${data.newTotal?.toFixed(2)} CAD`
          : `Upgrade fee of CA$${feeNum.toFixed(2)}/day applied${selectedUnit ? ` — Unit ${selectedUnit.license_plate} assigned` : ""}`
      );
      ["booking", "bookings", "category-available-units", "current-assigned-unit"].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] })
      );
      handleOpenChange(false);
    },
    onError: () => toast.error("Failed to apply upgrade"),
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const { error } = await supabase
        .from("bookings")
        .update({
          upgrade_daily_fee: 0,
          upgrade_category_label: null,
          upgrade_visible_to_customer: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);
      if (error) throw error;
      await supabase.from("audit_logs").insert({
        action: "upgrade_fee_removed",
        entity_type: "booking",
        entity_id: booking.id,
        user_id: userId,
        old_data: { upgrade_daily_fee: booking.upgrade_daily_fee },
      });
    },
    onSuccess: () => {
      toast.success("Upgrade fee removed");
      queryClient.invalidateQueries({ queryKey: ["booking"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      handleOpenChange(false);
    },
    onError: () => toast.error("Failed to remove upgrade fee"),
  });

  const canApply = categoryChanged || feeNum > 0 || selectedUnit;

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => handleOpenChange(true)}
      >
        <ArrowUpCircle className="h-4 w-4 mr-2" />
        {hasExistingUpgrade
          ? `Upgrade Active — CA$${Number(booking.upgrade_daily_fee).toFixed(2)}/day`
          : "Upgrade Vehicle"}
      </Button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Change Vehicle / Category
            </DialogTitle>
            <DialogDescription>
              Select a category and optionally pick a specific unit for booking{" "}
              <span className="font-mono">{booking.booking_code}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Vehicle Category Selection */}
            <div className="space-y-2">
              <Label>Vehicle Category</Label>
              <Select
                value={selectedCategoryId}
                onValueChange={(val) => {
                  setSelectedCategoryId(val);
                  setSelectedUnit(null);
                  setUnitSearch("");
                }}
                disabled={loadingCategories}
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
                          ${Number(cat.daily_rate).toFixed(2)}/day
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Comparison */}
            {categoryChanged && newPricing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Total</span>
                  <span>${currentTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">New Category Rate Total</span>
                  <span className="font-semibold">${newCategoryTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Difference</span>
                  <Badge
                    variant={priceDifference > 0 ? "default" : "secondary"}
                    className={
                      priceDifference > 0
                        ? "bg-emerald-500"
                        : priceDifference < 0
                        ? "bg-amber-500"
                        : ""
                    }
                  >
                    {priceDifference >= 0 ? "+" : ""}${priceDifference.toFixed(2)}
                  </Badge>
                </div>
              </div>
            )}

            <Separator />

            {/* Find vehicle by VIN / plate */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5" />
                Find Vehicle by VIN / Plate
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Type VIN or license plate…"
                  value={unitSearch}
                  onChange={(e) => {
                    setUnitSearch(e.target.value);
                    setSelectedUnit(null);
                  }}
                  className="pl-9"
                />
              </div>

              {/* Search results dropdown */}
              {unitSearch.trim().length >= 2 && !selectedUnit && (
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {searching ? (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      No available units found
                    </p>
                  ) : (
                    searchResults.map((unit) => (
                      <button
                        key={unit.id}
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors border-b last:border-b-0 text-sm"
                        onClick={() => {
                          setSelectedUnit(unit);
                          setUnitSearch(unit.license_plate);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{unit.license_plate}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {unit.category_name}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">VIN: …{unit.vin?.slice(-6)}</p>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Selected unit chip */}
              {selectedUnit && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                  <div>
                    <span className="font-medium">{selectedUnit.license_plate}</span>
                    <span className="text-muted-foreground ml-2">({selectedUnit.category_name})</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => { setSelectedUnit(null); setUnitSearch(""); }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Per-day upgrade charge */}
            <div className="space-y-2">
              <Label htmlFor="upgrade-fee">Per-Day Upgrade Charge (CA$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="upgrade-fee"
                  type="number"
                  min={0}
                  step={5}
                  placeholder="e.g. 25"
                  value={dailyFee}
                  onChange={(e) => setDailyFee(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Total calculation */}
            {feeNum > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Daily fee</span>
                  <span>CA${feeNum.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">× {booking.total_days} days</span>
                  <span className="font-semibold">CA${totalUpgradeCharge.toFixed(2)}</span>
                </div>
              </div>
            )}

            <Separator />

            {/* Show to customer toggle */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="show-upgrade"
                checked={showToCustomer}
                onCheckedChange={(v) => setShowToCustomer(v === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="show-upgrade" className="text-sm font-medium flex items-center gap-1.5">
                  {showToCustomer ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  Show upgrade to customer
                </Label>
                <p className="text-xs text-muted-foreground">
                  If enabled, the customer sees the upgraded category name
                </p>
              </div>
            </div>

            {showToCustomer && (
              <div className="space-y-2">
                <Label htmlFor="category-label">Category Name (shown to customer)</Label>
                <Input
                  id="category-label"
                  placeholder="e.g. Premium SUV"
                  value={categoryLabel}
                  onChange={(e) => setCategoryLabel(e.target.value)}
                />
              </div>
            )}

            <Separator />

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="upgrade-reason">Reason (optional)</Label>
              <Textarea
                id="upgrade-reason"
                value={upgradeReason}
                onChange={(e) => setUpgradeReason(e.target.value)}
                placeholder="e.g., Customer requested upgrade, original unavailable..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            {hasExistingUpgrade && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={removeMutation.isPending}
                onClick={() => removeMutation.mutate()}
              >
                {removeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove Upgrade"}
              </Button>
            )}
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!canApply || applyMutation.isPending}
              onClick={() => applyMutation.mutate()}
            >
              {applyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm & Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
