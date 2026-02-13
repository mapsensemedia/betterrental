/**
 * CounterUpsellPanel - Add upgrades/add-ons at the counter before activating the rental.
 * All mutations route through persist-booking-extras edge function (service_role).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAddOns, type AddOn, isFuelAddOn, isAdditionalDriverAddOn } from "@/hooks/use-add-ons";

interface CounterUpsellPanelProps {
  bookingId: string;
  rentalDays: number;
}

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

function useAddBookingAddOn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, addOn }: { bookingId: string; addOn: AddOn }) => {
      const { data, error } = await supabase.functions.invoke("persist-booking-extras", {
        body: {
          bookingId,
          action: "upsell-add",
          addOnId: addOn.id,
          quantity: 1,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["booking-add-ons", vars.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["booking", vars.bookingId] });
      toast.success("Add-on added to booking");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add add-on. Please try again.");
    },
  });
}

function useRemoveBookingAddOn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, bookingId }: { id: string; bookingId: string }) => {
      const { data, error } = await supabase.functions.invoke("persist-booking-extras", {
        body: {
          bookingId,
          action: "upsell-remove",
          bookingAddOnId: id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["booking-add-ons", vars.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["booking", vars.bookingId] });
      toast.success("Add-on removed");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to remove add-on. Please try again.");
    },
  });
}

export function CounterUpsellPanel({ bookingId, rentalDays }: CounterUpsellPanelProps) {
  const { data: allAddOns = [] } = useAddOns();
  const { data: existingAddOns = [], isLoading } = useBookingAddOns(bookingId);
  const addAddOn = useAddBookingAddOn();
  const removeAddOn = useRemoveBookingAddOn();

  const existingAddOnIds = new Set(existingAddOns.map((a: any) => a.add_on_id));
  
  // Filter out already-added and additional driver add-ons (managed separately)
  const availableAddOns = allAddOns.filter(
    a => !existingAddOnIds.has(a.id) && !isAdditionalDriverAddOn(a.name)
  );

  const handleAdd = (addOn: AddOn) => {
    addAddOn.mutate({ bookingId, addOn });
  };

  const handleRemove = (id: string) => {
    removeAddOn.mutate({ id, bookingId });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" />
          Counter Upsell
        </CardTitle>
        <CardDescription>
          Add extras and upgrades before activating the rental
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
                  onClick={() => handleRemove(addon.id)}
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
                    onClick={() => handleAdd(addon)}
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
      </CardContent>
    </Card>
  );
}
