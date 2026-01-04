import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSignedStorageUrl({
  bucket,
  path,
  expiresIn = 60 * 30,
  enabled = true,
}: {
  bucket: string;
  path: string | null | undefined;
  expiresIn?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["signed-storage-url", bucket, path, expiresIn],
    queryFn: async () => {
      if (!path) return null;

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) throw error;
      return data.signedUrl;
    },
    enabled: enabled && !!path,
    staleTime: Math.min(expiresIn * 1000, 10 * 60 * 1000),
  });
}
