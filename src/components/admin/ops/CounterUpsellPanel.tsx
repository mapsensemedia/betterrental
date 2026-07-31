/**
 * CounterUpsellPanel - Add upgrades/add-ons and additional drivers at the counter.
 * All mutations route through persist-booking-extras edge function (service_role).
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Plus, X, Loader2, Users, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAddOns, type AddOn, isFuelAddOn, isAdditionalDriverAddOn } from "@/hooks/use-add-ons";

interface CounterUpsellPanelProps {
  bookingId: string;
  rentalDays: number;
}

// ── Hooks ────────────────────────────────────────────────────────────

function useBookingAddOns(bookingId: string) {
  return useQuery({
    queryKey: ["booking-add-ons", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_add_ons")
        .select("*, add_ons(name, description)")
        .eq("booking_id", bookingId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!bookingId,
  });
}

function useBookingAdditionalDrivers(bookingId: string) {
  return useQuery({
    queryKey: ["booking-additional-drivers", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_additional_drivers")
        .select("id, driver_name, driver_age_band, young_driver_fee")
        .eq("booking_id", bookingId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!bookingId,
  });
}

/**
 * Shape returned by persist-booking-extras for every upsell action.
 * Used to surface the price delta + any uncollected balance to the operator.
 */
export interface UpsellResult {
  previousTotal?: number;
  newTotal?: number;
  deltaTotal?: number;
  authorizedTotal?: number;
  balanceDue?: number;
  agreementRegenerated?: boolean | null;
  agreementError?: string | null;
}

function invalidateBooking(queryClient: ReturnType<typeof useQueryClient>, bookingId: string) {
  queryClient.invalidateQueries({ queryKey: ["booking-add-ons", bookingId] });
  queryClient.invalidateQueries({ queryKey: ["booking-additional-drivers", bookingId] });
  queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
  queryClient.invalidateQueries({ queryKey: ["payments", bookingId] });
}

function successToast(label: string, result: UpsellResult) {
  const delta = Number(result?.deltaTotal ?? 0);
  const balance = Number(result?.balanceDue ?? 0);
  const parts: string[] = [];
  if (Math.abs(delta) >= 0.01) {
    parts.push(`${delta > 0 ? "+" : "−"}$${Math.abs(delta).toFixed(2)} incl. tax`);
  }
  if (balance >= 0.01) parts.push(`Balance due $${balance.toFixed(2)}`);
  toast.success(label, parts.length > 0 ? { description: parts.join(" · ") } : undefined);
}

function useAddBookingAddOn(onResult: (r: UpsellResult) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, addOn }: { bookingId: string; addOn: AddOn }) => {
      const { data, error } = await supabase.functions.invoke("persist-booking-extras", {
        body: { bookingId, action: "upsell-add", addOnId: addOn.id, quantity: 1 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data || {}) as UpsellResult;
    },
    onSuccess: (result, vars) => {
      invalidateBooking(queryClient, vars.bookingId);
      onResult(result);
      successToast("Add-on added to booking", result);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to add add-on."),
  });
}

function useRemoveBookingAddOn(onResult: (r: UpsellResult) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, bookingId }: { id: string; bookingId: string }) => {
      const { data, error } = await supabase.functions.invoke("persist-booking-extras", {
        body: { bookingId, action: "upsell-remove", bookingAddOnId: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data || {}) as UpsellResult;
    },
    onSuccess: (result, vars) => {
      invalidateBooking(queryClient, vars.bookingId);
      onResult(result);
      successToast("Add-on removed", result);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to remove add-on."),
  });
}

function useAddBookingDriver(onResult: (r: UpsellResult) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, driverName, driverAgeBand }: { bookingId: string; driverName: string; driverAgeBand: string }) => {
      const { data, error } = await supabase.functions.invoke("persist-booking-extras", {
        body: { bookingId, action: "upsell-driver-add", driverName, driverAgeBand },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data || {}) as UpsellResult;
    },
    onSuccess: (result, vars) => {
      invalidateBooking(queryClient, vars.bookingId);
      onResult(result);
      successToast("Additional driver added", result);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to add driver."),
  });
}

function useRemoveBookingDriver(onResult: (r: UpsellResult) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ driverRowId, bookingId }: { driverRowId: string; bookingId: string }) => {
      const { data, error } = await supabase.functions.invoke("persist-booking-extras", {
        body: { bookingId, action: "upsell-driver-remove", driverRowId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data || {}) as UpsellResult;
    },
    onSuccess: (result, vars) => {
      invalidateBooking(queryClient, vars.bookingId);
      onResult(result);
      successToast("Driver removed", result);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to remove driver."),
  });
}

/** Retry a failed agreement regeneration after an upsell changed the total. */
function useRegenerateAgreement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-agreement", {
        body: { bookingId, forceRegenerate: true, suppressNotifications: true, copySignatureFromLatest: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: (_, bookingId) => {
      queryClient.invalidateQueries({ queryKey: ["rental-agreement", bookingId] });
      toast.success("Agreement regenerated");
    },
    onError: (err: Error) => toast.error(err.message || "Agreement regeneration failed."),
  });
}


// ── Component ────────────────────────────────────────────────────────

export function CounterUpsellPanel({ bookingId, rentalDays }: CounterUpsellPanelProps) {
  const { data: allAddOns = [] } = useAddOns();
  const { data: existingAddOns = [], isLoading } = useBookingAddOns(bookingId);
  const { data: existingDrivers = [], isLoading: driversLoading } = useBookingAdditionalDrivers(bookingId);
  const addAddOn = useAddBookingAddOn();
  const removeAddOn = useRemoveBookingAddOn();
  const addDriver = useAddBookingDriver();
  const removeDriver = useRemoveBookingDriver();

  const [showDriverForm, setShowDriverForm] = useState(false);
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverAgeBand, setNewDriverAgeBand] = useState("25_70");

  const existingAddOnIds = new Set(existingAddOns.map((a: any) => a.add_on_id));
  
  // Filter out already-added and additional driver add-ons (managed separately)
  const availableAddOns = allAddOns.filter(
    a => !existingAddOnIds.has(a.id) && !isAdditionalDriverAddOn(a.name)
  );

  const handleAddAddOn = (addOn: AddOn) => addAddOn.mutate({ bookingId, addOn });
  const handleRemoveAddOn = (id: string) => removeAddOn.mutate({ id, bookingId });

  const handleAddDriver = () => {
    if (!newDriverName.trim()) {
      toast.error("Driver name is required");
      return;
    }
    addDriver.mutate(
      { bookingId, driverName: newDriverName.trim(), driverAgeBand: newDriverAgeBand },
      {
        onSuccess: () => {
          setNewDriverName("");
          setNewDriverAgeBand("25_70");
          setShowDriverForm(false);
        },
      }
    );
  };

  const handleRemoveDriver = (driverRowId: string) => removeDriver.mutate({ driverRowId, bookingId });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" />
          Counter Upsell
        </CardTitle>
        <CardDescription>
          Add extras, upgrades, and additional drivers before or during the rental
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Currently added add-ons */}
        {existingAddOns.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Added</p>
            {existingAddOns.map((addon: any) => (
              <div key={addon.id} className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div>
                  <p className="text-sm font-medium">{addon.add_ons?.name || "Add-on"}</p>
                  <p className="text-xs text-muted-foreground">${Number(addon.price).toFixed(2)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveAddOn(addon.id)}
                  disabled={removeAddOn.isPending}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Available add-ons */}
        {availableAddOns.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Available Extras</p>
            {availableAddOns.map(addon => {
              const price = isFuelAddOn(addon.name)
                ? (addon.oneTimeFee || addon.dailyRate)
                : addon.dailyRate * rentalDays + (addon.oneTimeFee || 0);
              
              return (
                <div key={addon.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{addon.name}</p>
                    {addon.description && (
                      <p className="text-xs text-muted-foreground truncate">{addon.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isFuelAddOn(addon.name) 
                        ? `$${price.toFixed(2)} one-time`
                        : `$${addon.dailyRate.toFixed(2)}/day × ${rentalDays}d = $${price.toFixed(2)}`
                      }
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 ml-2 h-8 text-xs gap-1"
                    onClick={() => handleAddAddOn(addon)}
                    disabled={addAddOn.isPending}
                  >
                    {addAddOn.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                    Add
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {availableAddOns.length === 0 && existingAddOns.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No extras available
          </p>
        )}

        {/* ── Additional Drivers Section ────────────────────────── */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Additional Drivers
            </p>
            {!showDriverForm && existingDrivers.length < 5 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setShowDriverForm(true)}
              >
                <UserPlus className="w-3 h-3" />
                Add Driver
              </Button>
            )}
          </div>

          {/* Existing drivers */}
          {existingDrivers.map((driver: any) => (
            <div key={driver.id} className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div>
                <p className="text-sm font-medium">{driver.driver_name || "Unnamed Driver"}</p>
                <p className="text-xs text-muted-foreground">
                  {driver.driver_age_band === "20_24" ? "Young (20–24)" : "Standard (25–70)"} · ${Number(driver.young_driver_fee).toFixed(2)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={() => handleRemoveDriver(driver.id)}
                disabled={removeDriver.isPending}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {/* Inline add driver form */}
          {showDriverForm && (
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
              <Input
                placeholder="Driver full name"
                value={newDriverName}
                onChange={e => setNewDriverName(e.target.value)}
                className="h-8 text-sm"
              />
              <Select value={newDriverAgeBand} onValueChange={setNewDriverAgeBand}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25_70">Standard (25–70)</SelectItem>
                  <SelectItem value="20_24">Young Driver (20–24)</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs flex-1 gap-1"
                  onClick={handleAddDriver}
                  disabled={addDriver.isPending}
                >
                  {addDriver.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Add Driver
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => { setShowDriverForm(false); setNewDriverName(""); }}
                  disabled={addDriver.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {existingDrivers.length === 0 && !showDriverForm && !driversLoading && (
            <p className="text-xs text-muted-foreground text-center py-2">No additional drivers</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
