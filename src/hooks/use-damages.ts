import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "./use-admin";
import { notifyAdmin } from "./use-admin-notify";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type DamageSeverity = Database["public"]["Enums"]["damage_severity"];

export interface DamageReport {
  id: string;
  bookingId: string;
  vehicleId: string;
  description: string;
  locationOnVehicle: string;
  severity: DamageSeverity;
  status: string;
  photoUrls: string[];
  estimatedCost: number | null;
  reportedBy: string;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  // Joined data
  booking: {
    bookingCode: string;
    startAt: string;
    endAt: string;
  } | null;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    imageUrl: string | null;
  } | null;
  reporter: {
    fullName: string | null;
    email: string | null;
  } | null;
}

export interface DamageFilters {
  severity?: DamageSeverity | "all";
  status?: string | "all";
  vehicleId?: string;
  locationId?: string;
}

export function useDamageReports(filters: DamageFilters = {}) {
  return useQuery<DamageReport[]>({
    queryKey: ["admin-damages", filters],
    queryFn: async () => {
      let query = supabase
        .from("damage_reports")
        .select(`
          *,
          bookings (booking_code, start_at, end_at),
          vehicles (id, make, model, year, image_url, location_id)
        `)
        .order("created_at", { ascending: false });

      if (filters.severity && filters.severity !== "all") {
        query = query.eq("severity", filters.severity);
      }

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.vehicleId) {
        query = query.eq("vehicle_id", filters.vehicleId);
      }

      const { data, error } = await query.limit(100);

      if (error) {
        console.error("Error fetching damage reports:", error);
        throw error;
      }

      // If location filter is applied, filter on the client side
      let filteredData = data || [];
      if (filters.locationId) {
        filteredData = filteredData.filter((d: any) => d.vehicles?.location_id === filters.locationId);
      }

      // Fetch reporter profiles
      const reporterIds = [...new Set(filteredData.map((d: any) => d.reported_by))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", reporterIds);

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

      return filteredData.map((d: any) => {
        const reporter = profilesMap.get(d.reported_by);
        return {
          id: d.id,
          bookingId: d.booking_id,
          vehicleId: d.vehicle_id,
          description: d.description,
          locationOnVehicle: d.location_on_vehicle,
          severity: d.severity,
          status: d.status,
          photoUrls: d.photo_urls || [],
          estimatedCost: d.estimated_cost ? Number(d.estimated_cost) : null,
          reportedBy: d.reported_by,
          resolvedAt: d.resolved_at,
          resolutionNotes: d.resolution_notes,
          createdAt: d.created_at,
          booking: d.bookings ? {
            bookingCode: d.bookings.booking_code,
            startAt: d.bookings.start_at,
            endAt: d.bookings.end_at,
          } : null,
          vehicle: d.vehicles ? {
            id: d.vehicles.id,
            make: d.vehicles.make,
            model: d.vehicles.model,
            year: d.vehicles.year,
            imageUrl: d.vehicles.image_url,
          } : null,
          reporter: reporter ? {
            fullName: reporter.full_name,
            email: reporter.email,
          } : null,
        };
      });
    },
    staleTime: 30000,
  });
}

export function useDamageById(id: string | null) {
  return useQuery({
    queryKey: ["admin-damage", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("damage_reports")
        .select(`
          *,
          bookings (id, booking_code, start_at, end_at, user_id),
          vehicles (id, make, model, year, image_url)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch condition photos for the booking
      const { data: photosData } = await supabase
        .from("condition_photos")
        .select("*")
        .eq("booking_id", data.booking_id);

      return {
        ...data,
        photos: photosData || [],
      };
    },
    enabled: !!id,
  });
}

export function useUpdateDamage() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ 
      damageId, 
      status, 
      resolutionNotes, 
      estimatedCost 
    }: { 
      damageId: string; 
      status?: string;
      resolutionNotes?: string;
      estimatedCost?: number;
    }) => {
      const updateData: Record<string, unknown> = {};
      
      if (status) {
        updateData.status = status;
        if (status === "resolved") {
          updateData.resolved_at = new Date().toISOString();
        }
      }
      if (resolutionNotes !== undefined) {
        updateData.resolution_notes = resolutionNotes;
      }
      if (estimatedCost !== undefined) {
        updateData.estimated_cost = estimatedCost;
      }

      const { data, error } = await supabase
        .from("damage_reports")
        .update(updateData)
        .eq("id", damageId)
        .select()
        .single();

      if (error) throw error;

      await logAction("damage_update", "damage_report", damageId, { 
        status,
        resolution_notes: resolutionNotes,
        estimated_cost: estimatedCost,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-damages"] });
      queryClient.invalidateQueries({ queryKey: ["admin-damage"] });
      toast.success("Damage report updated");
    },
    onError: (error) => {
      console.error("Failed to update damage:", error);
      toast.error("Failed to update damage report");
    },
  });
}

/**
 * Recommended withholding amount based on damage severity
 */
const DAMAGE_WITHHOLD_AMOUNTS: Record<DamageSeverity, number> = {
  minor: 100,
  moderate: 250,
  severe: 500,
};

export function useCreateDamage() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (damageData: {
      bookingId: string;
      vehicleId: string;
      description: string;
      locationOnVehicle: string;
      severity: DamageSeverity;
      photoUrls?: string[];
      estimatedCost?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch booking and vehicle info for notification
      let bookingCode = "";
      let vehicleName = "";
      
      const { data: booking } = await supabase
        .from("bookings")
        .select("booking_code, deposit_status, deposit_amount, status, return_state")
        .eq("id", damageData.bookingId)
        .maybeSingle();
      
      if (booking?.booking_code) {
        bookingCode = booking.booking_code;
      }
      
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("make, model, year")
        .eq("id", damageData.vehicleId)
        .maybeSingle();
      
      if (vehicle) {
        vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
      }

      // Create the damage report
      const { data, error } = await supabase
        .from("damage_reports")
        .insert([{
          booking_id: damageData.bookingId,
          vehicle_id: damageData.vehicleId,
          description: damageData.description,
          location_on_vehicle: damageData.locationOnVehicle,
          severity: damageData.severity,
          photo_urls: damageData.photoUrls || [],
          estimated_cost: damageData.estimatedCost || DAMAGE_WITHHOLD_AMOUNTS[damageData.severity],
          reported_by: user.id,
          status: "under_review",
        }])
        .select()
        .single();

      if (error) throw error;

      // ═══════════════════════════════════════════════════════════════════════
      // AUTOMATIC DEPOSIT HOLD TRIGGER
      // ═══════════════════════════════════════════════════════════════════════
      
      // Flag booking as exception and hold deposit if in return flow
      const isInReturnFlow = booking?.status === "active" || 
                             booking?.return_state !== null;
      const hasDeposit = booking?.deposit_status === "authorized" || 
                         booking?.deposit_status === "hold_created";
      
      if (isInReturnFlow) {
        // Update booking to flag as exception (prevents automatic deposit release)
        await supabase
          .from("bookings")
          .update({
            return_is_exception: true,
            return_exception_reason: `Damage reported: ${damageData.severity} - ${damageData.locationOnVehicle}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", damageData.bookingId);

        // Record deposit hold reason in ledger
        if (hasDeposit) {
          const withholdAmount = damageData.estimatedCost || DAMAGE_WITHHOLD_AMOUNTS[damageData.severity];
          
          await supabase.from("deposit_ledger").insert({
            booking_id: damageData.bookingId,
            action: "withhold",
            amount: withholdAmount,
            reason: `Damage hold: ${damageData.severity} ${damageData.locationOnVehicle} - ${damageData.description.slice(0, 100)}`,
            category: "damage",
            created_by: user.id,
          });
        }
      }

      // Create alert for the damage
      await supabase.from("admin_alerts").insert([{
        alert_type: "damage_reported" as const,
        title: `Damage reported: ${damageData.severity}`,
        message: damageData.description,
        booking_id: damageData.bookingId,
        vehicle_id: damageData.vehicleId,
      }]);

      // Send admin notification
      notifyAdmin({
        eventType: "damage_reported",
        bookingId: damageData.bookingId,
        bookingCode,
        vehicleName,
        details: `${damageData.severity.toUpperCase()} - ${damageData.locationOnVehicle}: ${damageData.description}`,
      }).catch(console.error);

      await logAction("damage_created", "damage_report", data.id, {
        severity: damageData.severity,
        description: damageData.description,
        deposit_held: isInReturnFlow && hasDeposit,
        exception_flagged: isInReturnFlow,
      });

      return { 
        ...data, 
        depositHeld: isInReturnFlow && hasDeposit,
        exceptionFlagged: isInReturnFlow,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-damages"] });
      queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["deposit-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["booking"] });
      
      if (data.depositHeld) {
        toast.success("Damage report created - Deposit held pending review");
      } else if (data.exceptionFlagged) {
        toast.success("Damage report created - Booking flagged as exception");
      } else {
        toast.success("Damage report created");
      }
    },
    onError: (error) => {
      console.error("Failed to create damage:", error);
      toast.error("Failed to create damage report");
    },
  });
}
