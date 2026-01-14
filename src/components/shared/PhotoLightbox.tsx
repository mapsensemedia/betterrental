/**
 * Photo Lightbox Component
 * Full-screen modal for viewing photos with navigation
 */
import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SignedStorageImage } from "@/components/shared/SignedStorageImage";
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Download, 
  ZoomIn, 
  ZoomOut,
  RotateCw,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Photo {
  id: string;
  photo_url: string;
  photo_type: string;
  phase?: string;
  captured_at?: string;
  notes?: string;
}

interface PhotoLightboxProps {
  photos: Photo[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  bucket?: string;
  title?: string;
}

export function PhotoLightbox({
  photos,
  initialIndex = 0,
  isOpen,
  onClose,
  bucket = "condition-photos",
  title = "Photo Gallery",
}: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setRotation(0);
    }
  }, [isOpen, initialIndex]);

  const currentPhoto = photos[currentIndex];

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
    setZoom(1);
    setRotation(0);
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
    setZoom(1);
    setRotation(0);
  }, [photos.length]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.5, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          goPrev();
          break;
        case "ArrowRight":
          goNext();
          break;
        case "Escape":
          onClose();
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
        case "r":
          handleRotate();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, goNext, goPrev, onClose]);

  if (!currentPhoto) return null;

  const formatPhotoType = (type: string) => 
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full p-0 gap-0 bg-black/95 border-none">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <h3 className="text-white font-medium">{title}</h3>
            <Badge variant="secondary" className="bg-white/20 text-white">
              {currentIndex + 1} / {photos.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              className="text-white hover:bg-white/20"
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              className="text-white hover:bg-white/20"
              disabled={zoom >= 3}
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRotate}
              className="text-white hover:bg-white/20"
            >
              <RotateCw className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main image area */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          {/* Navigation buttons */}
          {photos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={goPrev}
                className="absolute left-4 z-40 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={goNext}
                className="absolute right-4 z-40 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}

          {/* Image */}
          <div
            className="w-full h-full flex items-center justify-center p-12 overflow-auto"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: "transform 0.2s ease-out",
            }}
          >
            <SignedStorageImage
              bucket={bucket}
              path={currentPhoto.photo_url}
              alt={currentPhoto.photo_type}
              className="max-w-full max-h-[75vh] object-contain rounded-lg"
            />
          </div>
        </div>

        {/* Footer with photo info */}
        <div className="absolute bottom-0 left-0 right-0 z-50 px-4 py-3 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between text-white">
            <div>
              <p className="font-medium">{formatPhotoType(currentPhoto.photo_type)}</p>
              {currentPhoto.phase && (
                <Badge variant="outline" className="text-white border-white/30 text-xs mt-1">
                  {currentPhoto.phase.replace(/_/g, " ")}
                </Badge>
              )}
            </div>
            <div className="text-right text-sm text-white/70">
              {currentPhoto.captured_at && (
                <p>{format(new Date(currentPhoto.captured_at), "MMM d, yyyy h:mm a")}</p>
              )}
              {currentPhoto.notes && (
                <p className="text-xs italic mt-1">{currentPhoto.notes}</p>
              )}
            </div>
          </div>

          {/* Thumbnail strip */}
          {photos.length > 1 && photos.length <= 20 && (
            <div className="flex gap-2 justify-center mt-4 overflow-x-auto py-2">
              {photos.map((photo, idx) => (
                <button
                  key={photo.id}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setZoom(1);
                    setRotation(0);
                  }}
                  className={cn(
                    "w-12 h-12 rounded-md overflow-hidden border-2 transition-all shrink-0",
                    idx === currentIndex 
                      ? "border-white ring-2 ring-primary" 
                      : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  <SignedStorageImage
                    bucket={bucket}
                    path={photo.photo_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
