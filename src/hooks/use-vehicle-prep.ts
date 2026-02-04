import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface VehiclePrepItem {
  id: string;
  key: string;
  label: string;
  checked: boolean;
  checkedAt: string | null;
  checkedBy: string | null;
}

export interface VehiclePrepStatus {
  bookingId: string;
  items: VehiclePrepItem[];
  allComplete: boolean;
  completedCount: number;
  totalCount: number;
}

export const PREP_CHECKLIST_ITEMS = [
  { key: 'fuel_verified', label: 'Fuel/charge level verified' },
  { key: 'interior_clean', label: 'Interior cleaned' },
  { key: 'exterior_clean', label: 'Exterior cleaned' },
  { key: 'no_warning_lights', label: 'No warning lights on dashboard' },
  { key: 'documents_present', label: 'Plates/insurance/registration present' },
] as const;

export type PrepChecklistKey = typeof PREP_CHECKLIST_ITEMS[number]['key'];

// Hook to get prep status from inspection_metrics (we'll use the pickup phase)
export function useVehiclePrepStatus(bookingId: string | null) {
  return useQuery({
    queryKey: ['vehicle-prep', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      // Get inspection metrics for this booking (pickup phase - we store prep data here)
      const { data: inspection, error } = await supabase
        .from('inspection_metrics')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('phase', 'pickup')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      // Parse the prep checklist from exterior_notes (JSON stored as text)
      let prepData: Record<string, { checked: boolean; checkedAt: string | null; checkedBy: string | null }> = {};
      
      if (inspection?.exterior_notes) {
        try {
          prepData = JSON.parse(inspection.exterior_notes);
        } catch {
          prepData = {};
        }
      }

      const items: VehiclePrepItem[] = PREP_CHECKLIST_ITEMS.map((item, index) => ({
        id: `${bookingId}-${item.key}`,
        key: item.key,
        label: item.label,
        checked: prepData[item.key]?.checked ?? false,
        checkedAt: prepData[item.key]?.checkedAt ?? null,
        checkedBy: prepData[item.key]?.checkedBy ?? null,
      }));

      const completedCount = items.filter(i => i.checked).length;

      return {
        bookingId,
        items,
        allComplete: completedCount === items.length,
        completedCount,
        totalCount: items.length,
      } as VehiclePrepStatus;
    },
    enabled: !!bookingId,
    staleTime: 15000, // 15 seconds - operational data tier
    gcTime: 60000,    // Keep cached for 1 minute
  });
}

export function useUpdateVehiclePrep() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      itemKey,
      checked,
    }: {
      bookingId: string;
      itemKey: PrepChecklistKey;
      checked: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get existing prep data (stored in pickup phase record)
      const { data: existing } = await supabase
        .from('inspection_metrics')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('phase', 'pickup')
        .maybeSingle();

      let prepData: Record<string, { checked: boolean; checkedAt: string | null; checkedBy: string | null }> = {};
      
      if (existing?.exterior_notes) {
        try {
          prepData = JSON.parse(existing.exterior_notes);
        } catch {
          prepData = {};
        }
      }

      // Update the specific item
      prepData[itemKey] = {
        checked,
        checkedAt: checked ? new Date().toISOString() : null,
        checkedBy: checked ? user.id : null,
      };

      if (existing) {
        const { error } = await supabase
          .from('inspection_metrics')
          .update({
            exterior_notes: JSON.stringify(prepData),
            recorded_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inspection_metrics')
          .insert({
            booking_id: bookingId,
            phase: 'pickup',
            exterior_notes: JSON.stringify(prepData),
            recorded_by: user.id,
          });

        if (error) throw error;
      }

      return { bookingId, itemKey, checked };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-prep', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking', variables.bookingId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Check if vehicle is ready (all prep items + required photos complete)
export function useVehicleReadyStatus(bookingId: string | null) {
  const { data: prepStatus } = useVehiclePrepStatus(bookingId);
  
  return useQuery({
    queryKey: ['vehicle-ready', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      // Check condition photos (pickup phase)
      const { data: photos, error } = await supabase
        .from('condition_photos')
        .select('photo_type')
        .eq('booking_id', bookingId)
        .eq('phase', 'pickup');

      if (error) throw error;

      const requiredPhotos = ['front', 'back', 'left', 'right', 'odometer', 'fuel_gauge'];
      const uploadedTypes = photos?.map(p => p.photo_type) || [];
      const missingPhotos = requiredPhotos.filter(t => !uploadedTypes.includes(t));
      const photosComplete = missingPhotos.length === 0;

      const prepComplete = prepStatus?.allComplete ?? false;
      
      // Get incomplete prep items
      const incompletePrepItems = prepStatus?.items
        .filter(i => !i.checked)
        .map(i => i.label) || [];

      return {
        isReady: prepComplete && photosComplete,
        prepComplete,
        photosComplete,
        missingPhotos,
        incompletePrepItems,
      };
    },
    enabled: !!bookingId && prepStatus !== undefined,
  });
}
