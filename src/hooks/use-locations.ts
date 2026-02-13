import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  email: string | null;
  lat: number | null;
  lng: number | null;
  placeId: string | null;
  hoursJson: Record<string, string> | null;
  isActive: boolean | null;
  feeGroup: string | null;
}

export function useLocations() {
  return useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) {
        console.error("Error fetching locations:", error);
        return [];
      }

      return (data || []).map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        address: loc.address,
        city: loc.city,
        phone: loc.phone,
        email: loc.email,
        lat: loc.lat ? Number(loc.lat) : null,
        lng: loc.lng ? Number(loc.lng) : null,
        placeId: loc.place_id,
        hoursJson: loc.hours_json as Record<string, string> | null,
        isActive: loc.is_active,
        feeGroup: loc.fee_group || null,
      }));
    },
    staleTime: 300000, // 5 minutes
  });
}

export function useLocation(id: string | null) {
  return useQuery<Location | null>({
    queryKey: ["location", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching location:", error);
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        address: data.address,
        city: data.city,
        phone: data.phone,
        email: data.email,
        lat: data.lat ? Number(data.lat) : null,
        lng: data.lng ? Number(data.lng) : null,
        placeId: data.place_id,
        hoursJson: data.hours_json as Record<string, string> | null,
        isActive: data.is_active,
        feeGroup: (data as any).fee_group || null,
      };
    },
    enabled: !!id,
    staleTime: 300000,
  });
}
