import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notifyAdmin } from "./use-admin-notify";

interface LicenseStatus {
  frontUrl: string | null;
  backUrl: string | null;
  status: string | null;
  expiry: string | null;
  uploadedAt: string | null;
}

export function useLicenseUpload(userId?: string) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: licenseStatus, isLoading } = useQuery({
    queryKey: ["license-status", userId],
    queryFn: async (): Promise<LicenseStatus> => {
      if (!userId) throw new Error("No user ID");
      
      const { data, error } = await supabase
        .from("profiles")
        .select("driver_license_front_url, driver_license_back_url, driver_license_status, driver_license_expiry, driver_license_uploaded_at")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      
      return {
        frontUrl: data?.driver_license_front_url ?? null,
        backUrl: data?.driver_license_back_url ?? null,
        status: data?.driver_license_status ?? null,
        expiry: data?.driver_license_expiry ?? null,
        uploadedAt: data?.driver_license_uploaded_at ?? null,
      };
    },
    enabled: !!userId,
  });

  const uploadLicense = async (
    file: File,
    side: "front" | "back",
    targetUserId?: string
  ): Promise<string | null> => {
    const uid = targetUserId || userId;
    if (!uid) {
      toast({ title: "Error", description: "User not authenticated", variant: "destructive" });
      return null;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${uid}/${side}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("driver-licenses")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get signed URL (valid for 1 year)
      const { data: signedData, error: signedError } = await supabase.storage
        .from("driver-licenses")
        .createSignedUrl(filePath, 31536000);

      if (signedError) throw signedError;

      const signedUrl = signedData.signedUrl;

      // Update profile with the URL
      const updateData: Record<string, string> = {
        [`driver_license_${side}_url`]: signedUrl,
        driver_license_status: "on_file",
        driver_license_uploaded_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", uid);

      if (updateError) throw updateError;

      // Fetch customer name for notification
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", uid)
        .maybeSingle();

      // Send admin notification for license upload
      notifyAdmin({
        eventType: "license_uploaded",
        customerName: profile?.full_name || uid,
        details: `${side} of driver's license uploaded`,
      }).catch(console.error);

      toast({ title: "Success", description: "Driver's license uploaded successfully" });
      
      // Force immediate refetch of all related queries
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["license-status", uid] }),
        queryClient.refetchQueries({ queryKey: ["profile"] }),
      ]);
      // Also invalidate for any other components that might be listening
      queryClient.invalidateQueries({ queryKey: ["booking"] });
      
      return signedUrl;
    } catch (error: any) {
      console.error("License upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload license",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const getSignedUrl = async (path: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from("driver-licenses")
        .createSignedUrl(path, 3600);
      
      if (error) throw error;
      return data.signedUrl;
    } catch {
      return null;
    }
  };

  return {
    licenseStatus,
    isLoading,
    uploading,
    uploadLicense,
    getSignedUrl,
  };
}

/**
 * Upload license for a new user during signup
 * This is called after the user account is created
 */
export async function uploadLicenseOnSignup(
  userId: string,
  file: File
): Promise<boolean> {
  try {
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${userId}/front.${fileExt}`;

    // Upload file
    const { error: uploadError } = await supabase.storage
      .from("driver-licenses")
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    // Get signed URL
    const { data: signedData, error: signedError } = await supabase.storage
      .from("driver-licenses")
      .createSignedUrl(filePath, 31536000);

    if (signedError) throw signedError;

    // Update profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        driver_license_front_url: signedData.signedUrl,
        driver_license_status: "on_file",
        driver_license_uploaded_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error("Signup license upload error:", error);
    return false;
  }
}
