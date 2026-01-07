import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignedStorageImageProps {
  bucket: string;
  path: string | null | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  expiresIn?: number;
}

export function SignedStorageImage({
  bucket,
  path,
  alt,
  className,
  fallbackClassName,
  expiresIn = 60 * 30, // 30 minutes
}: SignedStorageImageProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!path) {
      setIsLoading(false);
      setError(true);
      return;
    }

    const fetchSignedUrl = async () => {
      setIsLoading(true);
      setError(false);

      try {
        const { data, error: urlError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, expiresIn);

        if (urlError) {
          console.error('Error creating signed URL:', urlError);
          setError(true);
        } else {
          setSignedUrl(data.signedUrl);
        }
      } catch (e) {
        console.error('Failed to get signed URL:', e);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignedUrl();
  }, [bucket, path, expiresIn]);

  if (isLoading) {
    return <Skeleton className={cn("w-full h-full", className)} />;
  }

  if (error || !signedUrl) {
    return (
      <div className={cn(
        "w-full h-full flex items-center justify-center bg-muted",
        fallbackClassName || className
      )}>
        <ImageOff className="w-8 h-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}
