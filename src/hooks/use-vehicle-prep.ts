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

type PrepData = Record<string, { checked: boolean; checkedAt: string | null; checkedBy: string | null }>;

function parsePrepData(exteriorNotes: string | null): PrepData {
  if (!exteriorNotes) return {};
  try {
    return JSON.parse(exteriorNotes);
  } catch {
    return {};
  }
}

function buildPrepStatus(bookingId: string, prepData: PrepData): VehiclePrepStatus {
  const items: VehiclePrepItem[] = PREP_CHECKLIST_ITEMS.map((item) => ({
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
  };
}

// Hook to get prep status from inspection_metrics (pickup phase)
export function useVehiclePrepStatus(bookingId: string | null) {
  return useQuery({
    queryKey: ['vehicle-prep', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      const { data: inspection, error } = await supabase
        .from('inspection_metrics')
        .select('exterior_notes')
        .eq('booking_id', bookingId)
        .eq('phase', 'pickup')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      const prepData = parsePrepData(inspection?.exterior_notes ?? null);
      return buildPrepStatus(bookingId, prepData);
    },
    enabled: !!bookingId,
    staleTime: 30000, // 30 seconds — reduce refetches
    gcTime: 120000,   // 2 minutes cache
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

      const { data: existing } = await supabase
        .from('inspection_metrics')
        .select('id, exterior_notes')
        .eq('booking_id', bookingId)
        .eq('phase', 'pickup')
        .maybeSingle();

      let prepData = parsePrepData(existing?.exterior_notes ?? null);

      prepData[itemKey] = {
        checked,
        checkedAt: checked ? new Date().toISOString() : null,
        checkedBy: checked ? user.id : null,
      };

      const exteriorNotes = JSON.stringify(prepData);

      if (existing) {
        const { error } = await supabase
          .from('inspection_metrics')
          .update({
            exterior_notes: exteriorNotes,
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
            exterior_notes: exteriorNotes,
            recorded_by: user.id,
          });

        if (error) throw error;
      }

      return { bookingId, itemKey, checked, prepData };
    },
    // Optimistic update — instant UI response
    onMutate: async (variables) => {
      const queryKey = ['vehicle-prep', variables.bookingId];
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot previous value
      const previous = queryClient.getQueryData<VehiclePrepStatus>(queryKey);
      
      // Optimistically update
      if (previous) {
        const updatedItems = previous.items.map(item =>
          item.key === variables.itemKey
            ? { ...item, checked: variables.checked, checkedAt: variables.checked ? new Date().toISOString() : null }
            : item
        );
        const completedCount = updatedItems.filter(i => i.checked).length;
        
        queryClient.setQueryData<VehiclePrepStatus>(queryKey, {
          ...previous,
          items: updatedItems,
          completedCount,
          allComplete: completedCount === updatedItems.length,
        });
      }
      
      return { previous };
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['vehicle-prep', variables.bookingId], context.previous);
      }
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: (_, __, variables) => {
      // Refetch in background to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['vehicle-prep', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking', variables.bookingId] });
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
