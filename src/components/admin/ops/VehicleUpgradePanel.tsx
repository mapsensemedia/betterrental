/**
 * VehicleUpgradePanel — Button that opens a dialog for applying per-day
 * upgrade fees and optionally assigning a vehicle unit by VIN/plate.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowUpCircle, DollarSign, Eye, EyeOff, Hash, Loader2, Search, X } from "lucide-react";

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
  const [dailyFee, setDailyFee] = useState("");
  const [showToCustomer, setShowToCustomer] = useState(false);
  const [categoryLabel, setCategoryLabel] = useState("");
  const [unitSearch, setUnitSearch] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<FoundUnit | null>(null);

  // Reset form when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDailyFee(hasExistingUpgrade ? String(booking.upgrade_daily_fee) : "");
      setShowToCustomer(booking.upgrade_visible_to_customer ?? false);
      setCategoryLabel(booking.upgrade_category_label ?? "");
      setUnitSearch("");
      setSelectedUnit(null);
    }
    setOpen(nextOpen);
  };

  const feeNum = parseFloat(dailyFee) || 0;
  const totalUpgradeCharge = feeNum * booking.total_days;

  // Search for units across all categories by VIN or license plate
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

  const applyMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const updatePayload: Record<string, any> = {
        upgrade_daily_fee: feeNum,
        upgrade_category_label: showToCustomer ? categoryLabel || null : null,
        upgrade_visible_to_customer: showToCustomer,
        updated_at: new Date().toISOString(),
      };

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

      await supabase.from("audit_logs").insert({
        action: "upgrade_fee_applied",
        entity_type: "booking",
        entity_id: booking.id,
        user_id: userId,
        new_data: {
          upgrade_daily_fee: feeNum,
          total_charge: totalUpgradeCharge,
          visible_to_customer: showToCustomer,
          category_label: categoryLabel || null,
          assigned_unit_id: selectedUnit?.id || null,
          assigned_unit_vin: selectedUnit?.vin || null,
          assigned_unit_category: selectedUnit?.category_name || null,
        },
      });
    },
    onSuccess: () => {
      toast.success(
        `Upgrade fee of CA$${feeNum.toFixed(2)}/day applied${selectedUnit ? ` — Unit ${selectedUnit.license_plate} assigned` : ""}`
      );
      ["booking", "bookings", "category-available-units", "current-assigned-unit"].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] })
      );
      handleOpenChange(false);
    },
    onError: () => toast.error("Failed to apply upgrade fee"),
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
              <ArrowUpCircle className="h-5 w-5" />
              Vehicle Upgrade
            </DialogTitle>
            <DialogDescription>
              Apply an upgrade fee and optionally assign a different unit for booking{" "}
              <span className="font-mono">{booking.booking_code}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
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
              disabled={feeNum <= 0 || applyMutation.isPending}
              onClick={() => applyMutation.mutate()}
            >
              {applyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {hasExistingUpgrade ? "Update Upgrade" : "Apply Upgrade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
