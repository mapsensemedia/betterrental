/**
 * Client-side image compression utility.
 * Resizes images and converts to JPEG before uploading to storage.
 */
export async function compressImage(
  file: File,
  maxWidthPx = 1200,
  qualityJpeg = 0.82
): Promise<File> {
  // Skip non-image files
  if (!file.type.startsWith("image/")) return file;
  // Skip SVGs and already-small files (< 100KB)
  if (file.type === "image/svg+xml" || file.size < 100_000) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidthPx / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            resolve(file); // fallback
            return;
          }
          resolve(
            new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
              type: "image/jpeg",
            })
          );
        },
        "image/jpeg",
        qualityJpeg
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}
