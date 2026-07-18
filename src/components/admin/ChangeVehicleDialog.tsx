import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { AlertTriangle, Car, CheckCircle2, Loader2 } from "lucide-react";
import { isValidVin } from "@/lib/schemas/vehicle";

function toLocalDateTimeInputValue(d: Date): string {
  const tzOffsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  bookingCategoryId: string | null;
  locationId: string;
  currentUnit?: {
    id: string;
    vin: string | null;
    license_plate: string | null;
    current_mileage: number | null;
  } | null;
}

interface UnitOption {
  id: string;
  vin: string | null;
  license_plate: string | null;
  color: string | null;
  current_mileage: number | null;
  status: string;
  category_id: string | null;
  vehicle_categories: { name: string | null } | null;
}

export function ChangeVehicleDialog({
  open,
  onOpenChange,
  bookingId,
  bookingCategoryId,
  locationId,
  currentUnit,
}: Props) {
  const queryClient = useQueryClient();
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [oldEndMileage, setOldEndMileage] = useState<string>(
    currentUnit?.current_mileage ? String(currentUnit.current_mileage) : "",
  );
  const [newStartMileage, setNewStartMileage] = useState("");
  const [newLicensePlate, setNewLicensePlate] = useState("");
  const [newVin, setNewVin] = useState("");
  const [reason, setReason] = useState<string>("customer_request");
  const [releaseOldUnitTo, setReleaseOldUnitTo] = useState<string>("available");
  const [notes, setNotes] = useState("");
  const [swapEffectiveAt, setSwapEffectiveAt] = useState<string>(
    toLocalDateTimeInputValue(new Date()),
  );

  const { data: units, isLoading } = useQuery({
    queryKey: ["change-vehicle-options", locationId, showAllCategories, bookingCategoryId],
    queryFn: async () => {
      let q = supabase
        .from("vehicle_units")
        .select("id, vin, license_plate, color, current_mileage, status, category_id, vehicle_categories(name)")
        .eq("location_id", locationId)
        .eq("status", "available")
        .order("license_plate", { ascending: true });
      if (!showAllCategories && bookingCategoryId) {
        q = q.eq("category_id", bookingCategoryId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as UnitOption[];
    },
    enabled: open && !!locationId,
  });

  const selectedUnit = units?.find((u) => u.id === selectedUnitId);

  const onSelect = (id: string) => {
    setSelectedUnitId(id);
    const u = units?.find((x) => x.id === id);
    setNewLicensePlate(u?.license_plate ?? "");
    setNewVin(u?.vin ?? "");
    setNewStartMileage(u?.current_mileage ? String(u.current_mileage) : "");
  };

  const swap = useMutation({
    mutationFn: async () => {
      if (!selectedUnitId) throw new Error("Select a vehicle first");
      if (!newStartMileage || Number.isNaN(Number(newStartMileage))) {
        throw new Error("Starting mileage is required");
      }
      const { data, error } = await supabase.functions.invoke("change-booking-vehicle", {
        body: {
          bookingId,
          newUnitId: selectedUnitId,
          newStartMileage: Number(newStartMileage),
          oldEndMileage: oldEndMileage ? Number(oldEndMileage) : null,
          newLicensePlate: newLicensePlate || null,
          newVin: newVin || null,
          reason,
          notes: notes || null,
          swapEffectiveAt: new Date(swapEffectiveAt).toISOString(),
          releaseOldUnitTo,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success("Vehicle changed successfully");
      if (data?.agreementRegenerated) toast.success("New rental agreement generated");
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["active-rental-detail", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["rental-agreement", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-swap-history", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });
      queryClient.invalidateQueries({ queryKey: ["available-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["booking-activity-timeline", bookingId] });
      onOpenChange(false);
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to change vehicle"),
  });

  const resetForm = () => {
    setSelectedUnitId(null);
    setNewLicensePlate("");
    setNewVin("");
    setNewStartMileage("");
    setNotes("");
    setReason("customer_request");
  };

  const isCategoryUpgrade =
    !!selectedUnit && !!bookingCategoryId && selectedUnit.category_id !== bookingCategoryId;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change Vehicle</DialogTitle>
          <DialogDescription>
            Swap the vehicle assigned to this active rental. The current agreement will be voided
            and a new agreement will be generated. The previous vehicle stays in the booking history.
          </DialogDescription>
        </DialogHeader>

        {/* Current vehicle summary */}
        {currentUnit && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p className="text-muted-foreground text-xs mb-1">Current vehicle</p>
            <p className="font-mono">
              VIN {currentUnit.vin ?? "—"} · Plate {currentUnit.license_plate ?? "—"} ·
              Mileage {currentUnit.current_mileage ?? "—"}
            </p>
          </div>
        )}

        {/* Unit picker */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Select new vehicle</Label>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => setShowAllCategories((v) => !v)}
            >
              {showAllCategories ? "Show same category only" : "Show all categories"}
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading available units…
            </div>
          ) : !units || units.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No available units at this location{!showAllCategories ? " in the same category" : ""}.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {units.map((u) => {
                const selected = selectedUnitId === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => onSelect(u.id)}
                    className={`w-full text-left rounded-md border p-3 transition-colors ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <Car className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {u.vehicle_categories?.name ?? "Vehicle"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate font-mono">
                            VIN {u.vin ?? "—"} · Plate {u.license_plate ?? "—"}
                            {u.color ? ` · ${u.color}` : ""} · {u.current_mileage ?? 0} km
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {selected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        <Badge variant="outline" className="text-xs">available</Badge>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {isCategoryUpgrade && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              This unit belongs to a different category. The booking's category will be updated,
              but pricing is not recalculated automatically — use the Category Upgrade flow if the
              customer should be charged more.
            </span>
          </div>
        )}

        {/* Form fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="swap-at">Swap effective at</Label>
            <Input
              id="swap-at"
              type="datetime-local"
              value={swapEffectiveAt}
              onChange={(e) => setSwapEffectiveAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="customer_request">Customer request</SelectItem>
                <SelectItem value="breakdown">Breakdown / mechanical</SelectItem>
                <SelectItem value="upgrade">Upgrade</SelectItem>
                <SelectItem value="accident">Accident</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="old-mileage">Old vehicle ending mileage</Label>
            <Input
              id="old-mileage"
              type="number"
              inputMode="numeric"
              value={oldEndMileage}
              onChange={(e) => setOldEndMileage(e.target.value)}
              placeholder="e.g. 45230"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-mileage">New vehicle starting mileage *</Label>
            <Input
              id="new-mileage"
              type="number"
              inputMode="numeric"
              value={newStartMileage}
              onChange={(e) => setNewStartMileage(e.target.value)}
              placeholder="e.g. 12500"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-plate">New license plate</Label>
            <Input
              id="new-plate"
              value={newLicensePlate}
              onChange={(e) => setNewLicensePlate(e.target.value)}
              placeholder="ABC-123"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-vin">New VIN</Label>
            <Input
              id="new-vin"
              value={newVin}
              onChange={(e) => setNewVin(e.target.value)}
              placeholder="1FADP3F..."
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="release-status">Release old vehicle as</Label>
            <Select value={releaseOldUnitTo} onValueChange={setReleaseOldUnitTo}>
              <SelectTrigger id="release-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available (ready to rent)</SelectItem>
                <SelectItem value="maintenance">Maintenance (needs service)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional context for the swap"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={swap.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => swap.mutate()}
            disabled={!selectedUnitId || !newStartMileage || swap.isPending}
          >
            {swap.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Swapping…</>
            ) : (
              "Change vehicle & regenerate agreement"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
