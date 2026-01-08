import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Truck, 
  MapPin, 
  DollarSign, 
  Navigation,
  Clock,
  Building,
  UserCheck,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface DeliveryDetailsCardProps {
  pickupAddress: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  locationName?: string | null;
  locationAddress?: string | null;
  /** Delivery fee if applicable */
  deliveryFee?: number | null;
  /** Distance in miles/km */
  deliveryDistance?: number | null;
  /** ETA in minutes */
  deliveryEta?: number | null;
  /** Compact mode for table rows */
  compact?: boolean;
  /** Booking ID for driver assignment */
  bookingId?: string;
  /** Current assigned driver ID */
  assignedDriverId?: string | null;
  /** Whether to show driver assignment controls */
  showDriverAssignment?: boolean;
}

// Hook to fetch staff members who can be assigned as drivers
function useStaffMembers() {
  return useQuery({
    queryKey: ["staff-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "staff"]);
      
      if (error) throw error;
      
      // Get profile info for staff
      const userIds = data.map(r => r.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", userIds);
      
      if (profileError) throw profileError;
      
      return profiles || [];
    },
  });
}

// Hook to assign a driver to a booking
function useAssignDriver() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ bookingId, driverId }: { bookingId: string; driverId: string | null }) => {
      const { error } = await supabase
        .from("bookings")
        .update({ assigned_driver_id: driverId })
        .eq("id", bookingId);
      
      if (error) throw error;
    },
    onSuccess: (_, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Driver assigned successfully");
    },
    onError: () => {
      toast.error("Failed to assign driver");
    },
  });
}

export function DeliveryDetailsCard({
  pickupAddress,
  pickupLat,
  pickupLng,
  locationName,
  locationAddress,
  deliveryFee,
  deliveryDistance,
  deliveryEta,
  compact = false,
  bookingId,
  assignedDriverId,
  showDriverAssignment = false,
}: DeliveryDetailsCardProps) {
  const { data: staffMembers, isLoading: loadingStaff } = useStaffMembers();
  const assignDriver = useAssignDriver();
  const [selectedDriver, setSelectedDriver] = useState<string | null>(assignedDriverId || null);

  useEffect(() => {
    setSelectedDriver(assignedDriverId || null);
  }, [assignedDriverId]);

  // Only show if there's a delivery address (pickup_address indicates delivery mode)
  if (!pickupAddress) return null;

  const assignedStaff = staffMembers?.find(s => s.id === assignedDriverId);

  const handleAssignDriver = () => {
    if (!bookingId) return;
    assignDriver.mutate({ bookingId, driverId: selectedDriver });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge className="bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800">
          <Truck className="h-3 w-3 mr-1" />
          Delivery
        </Badge>
        <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={pickupAddress}>
          {pickupAddress}
        </span>
        {assignedStaff && (
          <Badge variant="outline" className="text-xs">
            <UserCheck className="h-3 w-3 mr-1" />
            {assignedStaff.full_name || assignedStaff.email}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Truck className="h-4 w-4 text-purple-600" />
          <span>Delivery Details</span>
          <Badge className="bg-purple-500 text-white ml-auto">
            Bring Car to Me
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* Delivery Address */}
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-purple-700 dark:text-purple-400">Delivery Address</p>
            <p className="text-muted-foreground">{pickupAddress}</p>
            {pickupLat && pickupLng && (
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${pickupLat},${pickupLng}`, "_blank", "noopener,noreferrer");
                }}
                className="text-xs text-purple-600 hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer"
              >
                <Navigation className="h-3 w-3" />
                Get Directions
              </button>
            )}
          </div>
        </div>

        {/* Closest Pickup Center */}
        {locationName && (
          <div className="flex items-start gap-2">
            <Building className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Closest Pickup Center</p>
              <p className="text-muted-foreground">{locationName}</p>
              {locationAddress && (
                <p className="text-xs text-muted-foreground">{locationAddress}</p>
              )}
            </div>
          </div>
        )}

        {/* Delivery Fee */}
        {deliveryFee != null && deliveryFee > 0 && (
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <span className="font-medium">Delivery Fee:</span>
              <span className="text-purple-600 font-semibold">${deliveryFee.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Distance & ETA */}
        {(deliveryDistance || deliveryEta) && (
          <div className="flex items-center gap-4 pt-2 border-t border-purple-200 dark:border-purple-800">
            {deliveryDistance && (
              <div className="flex items-center gap-1 text-xs">
                <Navigation className="h-3 w-3 text-muted-foreground" />
                <span>{deliveryDistance.toFixed(1)} mi</span>
              </div>
            )}
            {deliveryEta && (
              <div className="flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>~{deliveryEta} min</span>
              </div>
            )}
          </div>
        )}

        {/* Driver Assignment */}
        {showDriverAssignment && bookingId && (
          <div className="pt-3 border-t border-purple-200 dark:border-purple-800 space-y-2">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Assigned Driver</span>
            </div>
            
            {assignedStaff ? (
              <div className="flex items-center justify-between bg-background rounded-md p-2">
                <div>
                  <p className="font-medium">{assignedStaff.full_name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">{assignedStaff.phone || assignedStaff.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedDriver(null);
                    assignDriver.mutate({ bookingId, driverId: null });
                  }}
                  disabled={assignDriver.isPending}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Select
                  value={selectedDriver || ""}
                  onValueChange={(value) => setSelectedDriver(value || null)}
                  disabled={loadingStaff}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={loadingStaff ? "Loading..." : "Select driver"} />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers?.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.full_name || staff.email || "Unnamed"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleAssignDriver}
                  disabled={!selectedDriver || assignDriver.isPending}
                >
                  {assignDriver.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Assign"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact inline badge for delivery mode
 */
export function DeliveryBadge({ hasDelivery }: { hasDelivery: boolean }) {
  if (!hasDelivery) return null;
  
  return (
    <Badge className="bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800">
      <Truck className="h-3 w-3 mr-1" />
      Delivery
    </Badge>
  );
}
