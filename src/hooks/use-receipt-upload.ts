import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface UploadResult {
  url: string;
  path: string;
}

export function useReceiptUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadReceipt = async (
    file: File,
    vehicleUnitId: string,
    expenseId?: string
  ): Promise<UploadResult | null> => {
    setIsUploading(true);
    setProgress(0);

    try {
      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("Invalid file type. Please upload an image (JPG, PNG, WebP) or PDF.");
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error("File too large. Maximum size is 10MB.");
      }

      // Generate unique file path
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const timestamp = Date.now();
      const fileName = `${vehicleUnitId}/${expenseId || "new"}_${timestamp}.${fileExt}`;

      setProgress(30);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("expense-receipts")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      setProgress(80);

      // Get the file path
      const filePath = data.path;

      setProgress(100);

      toast({
        title: "Receipt uploaded",
        description: "The receipt has been attached to the expense.",
      });

      return {
        url: filePath,
        path: filePath,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const deleteReceipt = async (path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from("expense-receipts")
        .remove([path]);

      if (error) throw error;

      toast({
        title: "Receipt deleted",
        description: "The receipt has been removed.",
      });

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed";
      toast({
        title: "Delete failed",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  };

  const getSignedUrl = async (path: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from("expense-receipts")
        .createSignedUrl(path, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error("Failed to get signed URL:", error);
      return null;
    }
  };

  return {
    uploadReceipt,
    deleteReceipt,
    getSignedUrl,
    isUploading,
    progress,
  };
}
