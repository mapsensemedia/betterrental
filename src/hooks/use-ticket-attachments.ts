import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadAttachmentParams {
  ticketId: string;
  file: File;
  isInternal?: boolean;
}

export function useUploadTicketAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, file, isInternal = false }: UploadAttachmentParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload file to storage
      const ext = file.name.split(".").pop();
      const fileName = `${ticketId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from("ticket-attachments")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("ticket-attachments")
        .getPublicUrl(fileName);

      // Create attachment record
      const { error: insertError } = await supabase
        .from("ticket_attachments")
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          is_internal: isInternal,
        });

      if (insertError) throw insertError;

      return { success: true, fileUrl: urlData.publicUrl };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-attachments"] });
      toast.success("Attachment uploaded");
    },
    onError: (error: Error) => {
      toast.error("Failed to upload: " + error.message);
    },
  });
}

export function useDeleteTicketAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const { error } = await supabase
        .from("ticket_attachments")
        .delete()
        .eq("id", attachmentId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-attachments"] });
      toast.success("Attachment deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete: " + error.message);
    },
  });
}
