import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PhotoPhase = 'pickup' | 'return';
export type PhotoType = 
  | 'front' 
  | 'back' 
  | 'left' 
  | 'right' 
  | 'odometer' 
  | 'fuel_gauge';

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

export const REQUIRED_PHOTOS: PhotoType[] = [
  'front',
  'back', 
  'left',
  'right',
  'odometer',
  'fuel_gauge',
];

export const PHOTO_LABELS: Record<PhotoType, string> = {
  front: 'Front View',
  back: 'Back View',
  left: 'Left Side',
  right: 'Right Side',
  odometer: 'Odometer',
  fuel_gauge: 'Fuel Gauge',
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
  });
}

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

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${bookingId}/${phase}/${photoType}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('condition-photos')
        .upload(fileName, file);

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

      return { fileName };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condition-photos'] });
      toast({
        title: 'Photo uploaded',
        description: 'Condition photo has been saved.',
      });
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
