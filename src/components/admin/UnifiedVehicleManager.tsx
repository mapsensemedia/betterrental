/**
 * UnifiedVehicleManager — single card + dialog for changing vehicle category
 * and/or assigning a specific VIN unit to a booking.
 *
 * Replaces the old VehicleAssignment + CategoryUpgradeDialog in the ops flow.
 */
import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
  Car,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ArrowRightLeft,
  Search,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { calculateBookingPricing, type DriverAgeBand } from "@/lib/pricing";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────
interface UnifiedVehicleManagerProps {
  bookingId: string;
  booking: {
    id: string;
    booking_code: string;
    vehicle_id: string;
    location_id: string;
    start_at: string;
    end_at: string;
    total_days: number;
    daily_rate: number;
    subtotal: number;
    tax_amount: number | null;
    total_amount: number;
    driver_age_band?: string | null;
    young_driver_fee?: number | null;
    assigned_unit_id?: string | null;
    vehicle_categories?: { name?: string } | null;
    vehicle_units?: { id: string; vin: string; license_plate: string; status: string } | null;
  };
  /** If true, renders only the dialog (no card). Controlled externally. */
  dialogOnly?: boolean;
  /** External open state (used with dialogOnly) */
  open?: boolean;
  /** External onOpenChange (used with dialogOnly) */
  onOpenChange?: (open: boolean) => void;
}

interface VehicleUnit {
  id: string;
  vin: string;
  license_plate: string;
  color: string | null;
  current_mileage: number | null;
  status: string;
}

interface Category {
  id: string;
  name: string;
  daily_rate: number;
  image_url: string | null;
}

// ─── Component ────────────────────────────────────────────────────────
export function UnifiedVehicleManager({
  bookingId,
  booking,
  dialogOnly = false,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: UnifiedVehicleManagerProps) {
  const queryClient = useQueryClient();

  // Dialog state — either internal or external
  const [internalOpen, setInternalOpen] = useState(false);
  const dialogOpen = dialogOnly ? (externalOpen ?? false) : internalOpen;
  const setDialogOpen = dialogOnly
    ? (externalOnOpenChange ?? setInternalOpen)
    : setInternalOpen;

  // Form state — reset when dialog opens
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(booking.vehicle_id);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(
    booking.assigned_unit_id ?? null
  );
  const [reason, setReason] = useState("");
  const [chargeCustomer, setChargeCustomer] = useState(true);
  const [unitSearch, setUnitSearch] = useState("");

  // Reset form when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setSelectedCategoryId(booking.vehicle_id);
      setSelectedUnitId(booking.assigned_unit_id ?? null);
      setReason("");
      setChargeCustomer(true);
      setUnitSearch("");
    }
    setDialogOpen(open);
  };

  // ── Global unit search query ────────────────────────────────────────
  const searchTerm = unitSearch.trim();
  const { data: searchResults = [], isLoading: loadingSearch } = useQuery({
    queryKey: ["global-unit-search", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      const normalised = searchTerm.replace(/[-\s]/g, "").toLowerCase();
      const { data, error } = await supabase
        .from("vehicle_units")
        .select("id, vin, license_plate, color, current_mileage, status, category_id, vehicle_categories(id, name, daily_rate)")
        .or(`license_plate.ilike.%${normalised}%,vin.ilike.%${normalised}%`)
        .limit(10);
      if (error) throw error;
      return (data ?? []) as Array<VehicleUnit & { category_id: string; vehicle_categories: { id: string; name: string; daily_rate: number } | null }>;
    },
    enabled: dialogOpen && searchTerm.length >= 2,
    staleTime: 5000,
  });

  const handleSelectSearchResult = useCallback((unit: typeof searchResults[0]) => {
    // Auto-switch category and select unit
    if (unit.category_id && unit.category_id !== selectedCategoryId) {
      setSelectedCategoryId(unit.category_id);
    }
    setSelectedUnitId(unit.id);
    setUnitSearch(""); // Clear search after selection
  }, [selectedCategoryId]);

  // ── Queries ──────────────────────────────────────────────────────────
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ["vehicle-categories-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_categories")
        .select("id, name, daily_rate, image_url")
        .eq("is_active", true)
        .order("daily_rate", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Category[];
    },
    enabled: dialogOpen,
  });

  const { data: availableUnits = [], isLoading: loadingUnits } = useQuery({
    queryKey: ["category-available-units", selectedCategoryId, booking.location_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_units")
        .select("id, vin, license_plate, color, current_mileage, status")
        .eq("category_id", selectedCategoryId)
        .eq("location_id", booking.location_id)
        .in("status", ["available"])
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as VehicleUnit[];
    },
    enabled: dialogOpen && !!selectedCategoryId,
  });

  // Include the currently-assigned unit in the list even if its status is on_rent
  const { data: currentUnit } = useQuery({
    queryKey: ["current-assigned-unit", booking.assigned_unit_id],
    queryFn: async () => {
      if (!booking.assigned_unit_id) return null;
      const { data, error } = await supabase
        .from("vehicle_units")
        .select("id, vin, license_plate, color, current_mileage, status, category_id")
        .eq("id", booking.assigned_unit_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: dialogOpen && !!booking.assigned_unit_id,
  });

  // ── Derived state ────────────────────────────────────────────────────
  const currentCategory = categories.find((c) => c.id === booking.vehicle_id);
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const categoryChanged = selectedCategoryId !== booking.vehicle_id;
  const unitChanged = selectedUnitId !== (booking.assigned_unit_id ?? null);
  const hasChanges = categoryChanged || unitChanged;

  // Build display list: available units + currently assigned if in same category
  const displayUnits = useMemo(() => {
    const units = [...availableUnits];
    if (
      currentUnit &&
      currentUnit.category_id === selectedCategoryId &&
      !units.find((u) => u.id === currentUnit.id)
    ) {
      units.unshift({
        id: currentUnit.id,
        vin: currentUnit.vin,
        license_plate: currentUnit.license_plate,
        color: currentUnit.color,
        current_mileage: currentUnit.current_mileage,
        status: currentUnit.status,
      });
    }
    return units;
  }, [availableUnits, currentUnit, selectedCategoryId]);

  // Price recalculation when category changes
  const newPricing = useMemo(() => {
    if (!selectedCategory || !categoryChanged) return null;
    const driverAgeBand = booking.driver_age_band as DriverAgeBand | null;
    const pickupDate = new Date(booking.start_at);
    return calculateBookingPricing({
      vehicleDailyRate: Number(selectedCategory.daily_rate),
      rentalDays: booking.total_days,
      driverAgeBand,
      pickupDate,
    });
  }, [selectedCategory, categoryChanged, booking]);

  const priceDiff = newPricing ? newPricing.total - booking.total_amount : 0;

  // ── Mutation ─────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // 1. Category change → update booking record
      if (categoryChanged && selectedCategory) {
        const shouldUpdatePricing = chargeCustomer && newPricing;
        
        const updatePayload: Record<string, any> = {
          original_vehicle_id: booking.vehicle_id,
          vehicle_id: selectedCategoryId,
          daily_rate: Number(selectedCategory.daily_rate),
          upgraded_at: new Date().toISOString(),
          upgraded_by: userId,
          upgrade_reason: reason || null,
          updated_at: new Date().toISOString(),
        };

        // Only update pricing if charging the customer
        if (shouldUpdatePricing && newPricing) {
          updatePayload.subtotal = newPricing.subtotal;
          updatePayload.tax_amount = newPricing.taxAmount;
          updatePayload.total_amount = newPricing.total;
        }

        const { error } = await supabase
          .from("bookings")
          .update(updatePayload)
          .eq("id", bookingId);
        if (error) throw error;

        // Audit log
        await supabase.from("audit_logs").insert({
          action: priceDiff > 0 ? "category_upgrade" : "category_change",
          entity_type: "booking",
          entity_id: bookingId,
          user_id: userId,
          old_data: {
            vehicle_id: booking.vehicle_id,
            daily_rate: booking.daily_rate,
            total_amount: booking.total_amount,
          },
          new_data: {
            vehicle_id: selectedCategoryId,
            daily_rate: Number(selectedCategory.daily_rate),
            total_amount: shouldUpdatePricing && newPricing ? newPricing.total : booking.total_amount,
            charge_customer: chargeCustomer,
            reason,
          },
        });
      }

      // 2. Unit assignment change
      if (unitChanged) {
        // Release old unit if any
        if (booking.assigned_unit_id) {
          await supabase.rpc("release_vin_from_booking", { p_booking_id: bookingId });
        }

        // Assign new unit if selected
        if (selectedUnitId) {
          const catForAssign = categoryChanged ? selectedCategoryId : booking.vehicle_id;
          await supabase.rpc("assign_vin_to_booking", {
            p_category_id: catForAssign,
            p_booking_id: bookingId,
            p_location_id: booking.location_id,
          });

          // If the user picked a specific unit, make sure it's the one assigned
          // The RPC picks one automatically; if it's different, swap
          const { data: updatedBooking } = await supabase
            .from("bookings")
            .select("assigned_unit_id")
            .eq("id", bookingId)
            .single();

          if (updatedBooking?.assigned_unit_id !== selectedUnitId) {
            // Release the auto-assigned one and manually assign the selected
            await supabase.rpc("release_vin_from_booking", { p_booking_id: bookingId });
            // Direct update for the specific unit
            await supabase
              .from("vehicle_units")
              .update({ status: "on_rent" })
              .eq("id", selectedUnitId);
            await supabase
              .from("bookings")
              .update({ assigned_unit_id: selectedUnitId, updated_at: new Date().toISOString() })
              .eq("id", bookingId);
          }
        }

        // Audit log for unit change
        await supabase.from("audit_logs").insert({
          action: selectedUnitId ? "vehicle_assigned" : "vehicle_released",
          entity_type: "booking",
          entity_id: bookingId,
          user_id: userId,
          old_data: { assigned_unit_id: booking.assigned_unit_id },
          new_data: { assigned_unit_id: selectedUnitId },
        });
      }
    },
    onSuccess: () => {
      const msgs: string[] = [];
      if (categoryChanged) {
        msgs.push(chargeCustomer ? "Category updated (price adjusted)" : "Category updated (no charge)");
      }
      if (unitChanged) msgs.push(selectedUnitId ? "Vehicle assigned" : "Vehicle removed");
      toast.success(msgs.join(" • ") || "Changes saved");

      // Invalidate everything relevant
      const keys = [
        "booking", "bookings", "fleet-categories", "category-vins",
        "available-categories", "fleet-vehicles", "vehicle-units",
        "vehicle-availability", "available-vehicles",
        "booking-activity-timeline", "category-available-units",
        "current-assigned-unit",
      ];
      keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      handleOpenChange(false);
    },
    onError: (err) => {
      console.error("UnifiedVehicleManager save error:", err);
      toast.error("Failed to save changes");
    },
  });

  // ── Remove unit shortcut ────────────────────────────────────────────
  const removeMutation = useMutation({
    mutationFn: async () => {
      await supabase.rpc("release_vin_from_booking", { p_booking_id: bookingId });
    },
    onSuccess: () => {
      toast.success("Vehicle removed");
      [
        "booking", "bookings", "fleet-categories", "category-vins",
        "available-categories", "category-available-units", "current-assigned-unit",
        "booking-activity-timeline",
      ].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
    },
    onError: () => toast.error("Failed to remove vehicle"),
  });

  // ── Card (summary) ──────────────────────────────────────────────────
  const categoryName = booking.vehicle_categories?.name || currentCategory?.name || "Unknown";
  const assignedUnit = booking.vehicle_units;

  const cardContent = !dialogOnly && (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Car className="h-4 w-4" />
            Vehicle & Category
          </CardTitle>
          {assignedUnit ? (
            <Badge className="bg-emerald-500 text-white">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Assigned
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Unassigned
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="font-medium text-sm">{categoryName}</p>
          {assignedUnit ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              {assignedUnit.license_plate} • {assignedUnit.vin?.slice(-6)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">No unit assigned</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleOpenChange(true)}
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            {assignedUnit ? "Change" : "Assign Vehicle"}
          </Button>
          {assignedUnit && (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? "..." : "Remove"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // ── Dialog ──────────────────────────────────────────────────────────
  const dialogContent = (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Change Vehicle / Category
          </DialogTitle>
          <DialogDescription>
            Select a category and optionally pick a specific unit for booking{" "}
            <span className="font-mono">{booking.booking_code}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* ── Quick Search by License Plate / VIN ── */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5" />
              Search by License Plate or VIN
            </Label>
            <Input
              placeholder="e.g. MSU-403, 112233…"
              value={unitSearch}
              onChange={(e) => setUnitSearch(e.target.value)}
              className="h-9"
            />
            {loadingSearch && searchTerm.length >= 2 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Searching…
              </div>
            )}
            {searchTerm.length >= 2 && !loadingSearch && searchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                {searchResults.map((unit) => (
                  <button
                    key={unit.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center justify-between gap-2"
                    onClick={() => handleSelectSearchResult(unit)}
                  >
                    <div>
                      <span className="font-medium text-sm">{unit.license_plate}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        VIN: …{unit.vin?.slice(-6)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {unit.vehicle_categories && (
                        <Badge variant="outline" className="text-[10px] py-0">
                          {unit.vehicle_categories.name}
                        </Badge>
                      )}
                      <Badge
                        variant={unit.status === "available" ? "default" : "secondary"}
                        className="text-[10px] py-0"
                      >
                        {unit.status}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searchTerm.length >= 2 && !loadingSearch && searchResults.length === 0 && (
              <p className="text-xs text-muted-foreground py-1">No units found matching "{searchTerm}"</p>
            )}
          </div>

          <Separator />

          {/* ── Category Selector ── */}
          <div className="space-y-2">
            <Label>Vehicle Category</Label>
            {loadingCategories ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select
                value={selectedCategoryId}
                onValueChange={(val) => {
                  setSelectedCategoryId(val);
                  // Clear unit selection when category changes
                  if (val !== selectedCategoryId) setSelectedUnitId(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center justify-between gap-4 w-full">
                        <span>{cat.name}</span>
                        <span className="text-muted-foreground text-xs">
                          ${Number(cat.daily_rate).toFixed(2)}/day
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* ── Price Impact & Charge Option ── */}
          {categoryChanged && newPricing && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Total</span>
                    <span>${booking.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">New Category Rate Total</span>
                    <span className="font-semibold">${newPricing.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Difference</span>
                    <Badge
                      variant={priceDiff > 0 ? "default" : "secondary"}
                      className={cn(
                        priceDiff > 0
                          ? "bg-emerald-500 text-white"
                          : priceDiff < 0
                          ? "bg-amber-500 text-white"
                          : ""
                      )}
                    >
                      {priceDiff >= 0 ? "+" : ""}${priceDiff.toFixed(2)}
                    </Badge>
                  </div>
                </div>

                {/* Charge toggle */}
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-sm font-medium">Charge for this change?</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={chargeCustomer ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setChargeCustomer(true)}
                    >
                      Yes — update price to ${newPricing.total.toFixed(2)}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={!chargeCustomer ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setChargeCustomer(false)}
                    >
                      No — keep ${booking.total_amount.toFixed(2)}
                    </Button>
                  </div>
                  {!chargeCustomer && (
                    <p className="text-xs text-muted-foreground">
                      The booking total will remain unchanged despite the category change.
                    </p>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* ── Available Units ── */}
          <div className="space-y-2">
            <Label>
              Available Units
              {selectedCategory && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({displayUnits.length})
                </span>
              )}
            </Label>

            {loadingUnits ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : displayUnits.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center">
                No available units at this location for the selected category.
              </p>
            ) : (
              <RadioGroup
                value={selectedUnitId ?? ""}
                onValueChange={setSelectedUnitId}
                className="space-y-1"
              >
                {displayUnits.map((unit) => {
                  const isCurrent = unit.id === booking.assigned_unit_id;
                  return (
                    <label
                      key={unit.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedUnitId === unit.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <RadioGroupItem value={unit.id} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {unit.license_plate}
                          </span>
                          {isCurrent && (
                            <Badge variant="outline" className="text-[10px] py-0">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          VIN: ...{unit.vin?.slice(-6)}
                          {unit.color && ` • ${unit.color}`}
                          {unit.current_mileage != null &&
                            ` • ${unit.current_mileage.toLocaleString()} km`}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </RadioGroup>
            )}
            {/* Option to clear unit selection */}
            {selectedUnitId && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setSelectedUnitId(null)}
              >
                Clear unit selection
              </Button>
            )}
          </div>

          {/* ── Reason ── */}
          {categoryChanged && (
            <div className="space-y-2">
              <Label htmlFor="change-reason">Reason (optional)</Label>
              <Textarea
                id="change-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Customer requested upgrade, original unavailable…"
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!hasChanges || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Confirm & Apply"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {cardContent}
      {dialogContent}
    </>
  );
}
