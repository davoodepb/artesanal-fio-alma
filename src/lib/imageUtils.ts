/**
 * Client-side image optimization utilities.
 * Resizes and compresses images before upload to ensure consistent quality
 * while keeping file sizes manageable.
 */

const MAX_DIMENSION = 1200; // Max width or height in pixels
const THUMB_DIMENSION = 400; // Thumbnail size
const QUALITY = 0.85; // JPEG/WEBP quality
const IMAGE_PROCESS_TIMEOUT_MS = 15000;

/**
 * Resize an image file while maintaining aspect ratio.
 * Returns a new File object with the resized image.
 */
export function resizeImage(
  file: File,
  maxDimension: number = MAX_DIMENSION,
  quality: number = QUALITY
): Promise<File> {
  return new Promise((resolve, reject) => {
    // Skip non-image files
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    // Skip SVGs (vector, no need to resize)
    if (file.type === 'image/svg+xml') {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const { width, height } = img;

      // If image is already small enough, return original
      if (width <= maxDimension && height <= maxDimension) {
        resolve(file);
        return;
      }

      // Calculate new dimensions maintaining aspect ratio
      let newWidth: number;
      let newHeight: number;

      if (width > height) {
        newWidth = maxDimension;
        newHeight = Math.round((height / width) * maxDimension);
      } else {
        newHeight = maxDimension;
        newWidth = Math.round((width / height) * maxDimension);
      }

      // Draw to canvas
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      // Use high-quality interpolation
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Determine output format
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/webp';
      const outputQuality = file.type === 'image/png' ? undefined : quality;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // Keep extension consistent
          const ext = outputType === 'image/png' ? 'png' : 'webp';
          const name = file.name.replace(/\.[^.]+$/, `.${ext}`);
          const resizedFile = new File([blob], name, { type: outputType });

          // Only use resized if it's actually smaller
          resolve(resizedFile.size < file.size ? resizedFile : file);
        },
        outputType,
        outputQuality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // Fallback to original
    };

    img.src = url;
  });
}

/**
 * Create a thumbnail from a file.
 */
export function createThumbnail(
  file: File,
  size: number = THUMB_DIMENSION,
  quality: number = 0.75
): Promise<File> {
  return resizeImage(file, size, quality);
}

/**
 * Process a file for upload: resize if needed.
 */
export async function processImageForUpload(file: File): Promise<File> {
  return Promise.race<File>([
    resizeImage(file, MAX_DIMENSION, QUALITY),
    new Promise<File>((resolve) => {
      window.setTimeout(() => resolve(file), IMAGE_PROCESS_TIMEOUT_MS);
    }),
  ]);
}

/**
 * Process multiple files for upload.
 */
export async function processImagesForUpload(files: File[]): Promise<File[]> {
  return Promise.all(files.map((f) => processImageForUpload(f)));
}
