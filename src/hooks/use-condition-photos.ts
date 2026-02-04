import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PhotoPhase = 'pickup' | 'return';
export type PhotoType = 
  | 'front' 
  | 'back' 
  | 'left' 
  | 'right' 
  | 'odometer_fuel'  // Combined odometer and fuel in one photo
  | 'front_seat'
  | 'back_seat';

export interface ConditionPhoto {
  id: string;
  booking_id: string;
  phase: string;
  photo_type: string;
  photo_url: string;
  notes: string | null;
  captured_at: string;
  captured_by: string;
}

// Updated required photos - combined odometer/fuel, added seats
export const REQUIRED_PHOTOS: PhotoType[] = [
  'front',
  'back', 
  'left',
  'right',
  'odometer_fuel',  // Combined: odometer and fuel gauge in one photo
  'front_seat',
  'back_seat',
];

export const PHOTO_LABELS: Record<PhotoType, string> = {
  front: 'Front View',
  back: 'Back View',
  left: 'Left Side',
  right: 'Right Side',
  odometer_fuel: 'Odometer & Fuel',
  front_seat: 'Front Seat',
  back_seat: 'Back Seat',
};

export function useBookingConditionPhotos(bookingId: string | null) {
  return useQuery({
    queryKey: ['condition-photos', bookingId],
    queryFn: async () => {
      if (!bookingId) return { pickup: [], return: [] };
      
      const { data, error } = await supabase
        .from('condition_photos')
        .select('*')
        .eq('booking_id', bookingId)
        .order('captured_at', { ascending: true });
      
      if (error) throw error;
      
      const photos = data as ConditionPhoto[];
      return {
        pickup: photos.filter(p => p.phase === 'pickup'),
        return: photos.filter(p => p.phase === 'return'),
      };
    },
    enabled: !!bookingId,
    staleTime: 15000, // 15 seconds - operational data tier
    gcTime: 60000,    // Keep cached for 1 minute
  });
}

// Optimized parallel upload mutation
export function useUploadConditionPhoto() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      phase,
      photoType,
      file,
      notes,
    }: {
      bookingId: string;
      phase: PhotoPhase;
      photoType: PhotoType;
      file: File;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload file to storage with unique timestamp
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${bookingId}/${phase}/${photoType}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('condition-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false, // Don't upsert - create new each time
        });

      if (uploadError) throw uploadError;

      // Check if photo already exists for this booking/phase/type
      const { data: existing } = await supabase
        .from('condition_photos')
        .select('id')
        .eq('booking_id', bookingId)
        .eq('phase', phase)
        .eq('photo_type', photoType)
        .maybeSingle();

      if (existing) {
        // Update existing photo
        const { error: updateError } = await supabase
          .from('condition_photos')
          .update({
            photo_url: fileName,
            notes: notes || null,
            captured_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // Create new photo record
        const { error: insertError } = await supabase
          .from('condition_photos')
          .insert({
            booking_id: bookingId,
            phase,
            photo_type: photoType,
            photo_url: fileName,
            notes: notes || null,
            captured_by: user.id,
          });

        if (insertError) throw insertError;
      }

      return { fileName, photoType };
    },
    onSuccess: (data) => {
      // Invalidate immediately for faster UI update
      queryClient.invalidateQueries({ queryKey: ['condition-photos'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Batch upload helper - uploads in parallel without blocking
export function useBatchUploadPhotos() {
  const uploadMutation = useUploadConditionPhoto();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return {
    uploadMultiple: async (
      bookingId: string,
      phase: PhotoPhase,
      files: Array<{ photoType: PhotoType; file: File }>
    ) => {
      // Start all uploads in parallel - don't wait for each one
      const uploadPromises = files.map(({ photoType, file }) => 
        uploadMutation.mutateAsync({ bookingId, phase, photoType, file })
          .catch(err => ({ error: err, photoType }))
      );

      // Wait for all to complete
      const results = await Promise.allSettled(uploadPromises);
      
      // Count successes and failures
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (failed > 0) {
        toast({
          title: 'Some uploads failed',
          description: `${succeeded} succeeded, ${failed} failed`,
          variant: 'destructive',
        });
      } else if (succeeded > 0) {
        toast({
          title: 'Photos uploaded',
          description: `${succeeded} photos saved successfully`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['condition-photos'] });
      
      return { succeeded, failed };
    },
    isUploading: uploadMutation.isPending,
  };
}

export function getPhotoCompletionStatus(
  photos: ConditionPhoto[],
  phase: PhotoPhase
): { complete: boolean; missing: PhotoType[]; uploaded: PhotoType[] } {
  const phasePhotos = photos.filter(p => p.phase === phase);
  const uploadedTypes = phasePhotos.map(p => p.photo_type as PhotoType);
  const missing = REQUIRED_PHOTOS.filter(type => !uploadedTypes.includes(type));
  
  return {
    complete: missing.length === 0,
    missing,
    uploaded: uploadedTypes,
  };
}
