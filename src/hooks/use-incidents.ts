import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export type IncidentSeverity = "minor" | "moderate" | "major";
export type IncidentStatus = "reported" | "investigating" | "claim_filed" | "in_repair" | "resolved" | "closed";

export interface IncidentCase {
  id: string;
  booking_id: string | null;
  vehicle_id: string;
  vehicle_unit_id: string | null;
  customer_id: string | null;
  incident_type: string;
  incident_date: string;
  location: string | null;
  description: string;
  severity: IncidentSeverity;
  is_drivable: boolean | null;
  towing_required: boolean | null;
  airbags_deployed: boolean | null;
  third_party_involved: boolean | null;
  claim_number: string | null;
  claim_required: boolean | null;
  status: IncidentStatus;
  estimate_amount: number | null;
  approved_amount: number | null;
  final_invoice_amount: number | null;
  deductible_amount: number | null;
  repair_vendor: string | null;
  repair_vendor_contact: string | null;
  repair_started_at: string | null;
  repair_completed_at: string | null;
  assigned_staff_id: string | null;
  internal_notes: string | null;
  evidence_complete: boolean | null;
  evidence_completed_at: string | null;
  evidence_completed_by: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  closed_by: string | null;
  created_by: string;
  // Joined data
  vehicles?: { id: string; make: string; model: string; year: number };
  bookings?: { id: string; booking_code: string };
  profiles?: { id: string; full_name: string; email: string };
}

export interface CreateIncidentParams {
  booking_id?: string | null;
  vehicle_id: string;
  vehicle_unit_id?: string | null;
  customer_id?: string | null;
  incident_type: string;
  incident_date: string;
  location?: string;
  description: string;
  severity: IncidentSeverity;
  is_drivable?: boolean;
  towing_required?: boolean;
  airbags_deployed?: boolean;
  third_party_involved?: boolean;
  claim_number?: string;
  // Note: claim_required is a generated column - don't include in params
  assigned_staff_id?: string;
  internal_notes?: string;
}

export interface UpdateIncidentParams {
  id: string;
  status?: IncidentStatus;
  claim_number?: string;
  claim_required?: boolean;
  estimate_amount?: number;
  approved_amount?: number;
  deductible_amount?: number;
  repair_vendor?: string;
  repair_vendor_contact?: string;
  repair_started_at?: string;
  repair_completed_at?: string;
  assigned_staff_id?: string;
  internal_notes?: string;
  evidence_complete?: boolean;
}

// Fetch all incident cases
export function useIncidentCases(filters?: { 
  severity?: string; 
  status?: string;
  assignedTo?: string;
}) {
  return useQuery({
    queryKey: ["incident-cases", filters],
    queryFn: async () => {
      let query = supabase
        .from("incident_cases")
        .select(`
          *,
          vehicles (id, make, model, year),
          bookings (id, booking_code)
        `)
        .order("created_at", { ascending: false });

      if (filters?.severity && filters.severity !== "all") {
        query = query.eq("severity", filters.severity);
      }
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters?.assignedTo && filters.assignedTo !== "all") {
        query = query.eq("assigned_staff_id", filters.assignedTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as IncidentCase[];
    },
  });
}

// Fetch single incident by ID
export function useIncidentById(incidentId: string | null) {
  return useQuery({
    queryKey: ["incident-case", incidentId],
    queryFn: async () => {
      if (!incidentId) return null;
      
      const { data, error } = await supabase
        .from("incident_cases")
        .select(`
          *,
          vehicles (id, make, model, year),
          bookings (id, booking_code),
          incident_photos (*)
        `)
        .eq("id", incidentId)
        .single();

      if (error) throw error;
      return data as IncidentCase & { incident_photos: any[] };
    },
    enabled: !!incidentId,
  });
}

// Fetch incidents for a specific booking
export function useBookingIncidents(bookingId: string | null) {
  return useQuery({
    queryKey: ["booking-incidents", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      
      const { data, error } = await supabase
        .from("incident_cases")
        .select(`
          *,
          vehicles (id, make, model, year)
        `)
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as IncidentCase[];
    },
    enabled: !!bookingId,
  });
}

// Create new incident case
export function useCreateIncident() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: CreateIncidentParams) => {
      if (!user) throw new Error("Not authenticated");

      // Remove claim_required from params - it's a generated column in the database
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { claim_required, ...insertParams } = params as CreateIncidentParams & { claim_required?: boolean };

      const { data, error } = await supabase
        .from("incident_cases")
        .insert({
          ...insertParams,
          created_by: user.id,
          status: "reported",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["incident-cases"] });
      queryClient.invalidateQueries({ queryKey: ["booking-incidents", data.booking_id] });
      toast.success("Incident case created");
    },
    onError: (error) => {
      console.error("Failed to create incident:", error);
      toast.error("Failed to create incident case");
    },
  });
}

// Update incident case
export function useUpdateIncident() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: UpdateIncidentParams) => {
      const { id, ...updates } = params;
      
      // Handle status transitions that require additional data
      const finalUpdates: any = { ...updates };
      
      if (updates.status === "closed") {
        finalUpdates.closed_at = new Date().toISOString();
        finalUpdates.closed_by = user?.id;
      }
      
      if (updates.evidence_complete && !finalUpdates.evidence_completed_at) {
        finalUpdates.evidence_completed_at = new Date().toISOString();
        finalUpdates.evidence_completed_by = user?.id;
      }

      const { data, error } = await supabase
        .from("incident_cases")
        .update(finalUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["incident-cases"] });
      queryClient.invalidateQueries({ queryKey: ["incident-case", data.id] });
      queryClient.invalidateQueries({ queryKey: ["booking-incidents", data.booking_id] });
      toast.success("Incident updated");
    },
    onError: (error) => {
      console.error("Failed to update incident:", error);
      toast.error("Failed to update incident");
    },
  });
}

// Upload incident photo
export function useUploadIncidentPhoto() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      incidentId, 
      file, 
      category, 
      description 
    }: { 
      incidentId: string; 
      file: File; 
      category: string; 
      description?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${incidentId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("condition-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("condition-photos")
        .getPublicUrl(fileName);

      // Save to incident_photos table
      const { data, error } = await supabase
        .from("incident_photos")
        .insert({
          incident_id: incidentId,
          photo_url: publicUrl,
          category,
          description,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["incident-case", data.incident_id] });
      toast.success("Photo uploaded");
    },
    onError: (error) => {
      console.error("Failed to upload photo:", error);
      toast.error("Failed to upload photo");
    },
  });
}

// Valid status transitions
const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  reported: ["investigating", "closed"],
  investigating: ["claim_filed", "in_repair", "resolved", "closed"],
  claim_filed: ["in_repair", "resolved", "closed"],
  in_repair: ["resolved", "closed"],
  resolved: ["closed"],
  closed: [],
};

export function canTransitionTo(currentStatus: IncidentStatus, targetStatus: IncidentStatus): boolean {
  return VALID_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
}

export function getNextStatuses(currentStatus: IncidentStatus): IncidentStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}
