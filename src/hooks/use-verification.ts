import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface VerificationDocument {
  id: string;
  doc_type: string;
  file_path: string;
  uploaded_at: string;
}

export interface VerificationRequest {
  id: string;
  booking_id: string | null;
  user_id: string;
  status: 'pending' | 'verified' | 'rejected';
  document_type: string;
  document_url: string;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

export function useBookingVerification(bookingId: string | null) {
  return useQuery({
    queryKey: ['verification', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      
      const { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as VerificationRequest[];
    },
    enabled: !!bookingId,
    staleTime: 15000, // 15 seconds - operational data tier
    gcTime: 60000,    // Keep cached for 1 minute
  });
}

export function useUserVerifications() {
  return useQuery({
    queryKey: ['user-verifications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as VerificationRequest[];
    },
  });
}

export function useUploadVerificationDocument() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      docType, 
      file 
    }: { 
      bookingId: string; 
      docType: string; 
      file: File;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${bookingId}/${docType}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(fileName);

      // Check if a verification request already exists for this booking and doc type
      const { data: existing } = await supabase
        .from('verification_requests')
        .select('id')
        .eq('booking_id', bookingId)
        .eq('document_type', docType)
        .maybeSingle();

      if (existing) {
        // Update existing request
        const { error: updateError } = await supabase
          .from('verification_requests')
          .update({
            document_url: fileName,
            status: 'pending',
            reviewer_notes: null,
            reviewed_at: null,
            reviewed_by: null,
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // Create new verification request
        const { error: insertError } = await supabase
          .from('verification_requests')
          .insert({
            booking_id: bookingId,
            user_id: user.id,
            document_type: docType,
            document_url: fileName,
            status: 'pending',
          });

        if (insertError) throw insertError;
      }

      return { fileName, url: urlData.publicUrl };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification'] });
      queryClient.invalidateQueries({ queryKey: ['user-verifications'] });
      toast({
        title: 'Document uploaded',
        description: 'Your verification document has been submitted for review.',
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

export function useUpdateVerificationStatus() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      status,
      notes,
      bookingId,
    }: {
      requestId: string;
      status: 'verified' | 'rejected';
      notes?: string;
      bookingId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('verification_requests')
        .update({
          status,
          reviewer_notes: notes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq('id', requestId);

      if (error) throw error;

      // Send notification to customer
      if (bookingId) {
        try {
          await supabase.functions.invoke('send-booking-notification', {
            body: {
              bookingId,
              stage: status === 'verified' ? 'license_approved' : 'license_rejected',
            },
          });
        } catch (e) {
          console.error('Failed to send verification notification:', e);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['verification'] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      toast({
        title: `Verification ${variables.status}`,
        description: `The document has been ${variables.status}.`,
      });
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
