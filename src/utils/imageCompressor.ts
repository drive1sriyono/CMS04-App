/**
 * HTML5 Canvas Image Compressor
 * Compresses uploaded images before storing them in Supabase or LocalStorage.
 * Ensures small payload sizes while preserving text readability and visual clarity.
 */

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

/**
 * Compresses a File object using HTML5 Canvas and returns a Data URL string.
 */
export function compressImageFile(
  file: File,
  options: CompressImageOptions = {}
): Promise<string> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.78,
    mimeType = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    // Basic validation
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('File yang diunggah harus berupa gambar (PNG/JPG/WebP)'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = (err) => reject(err);
      img.onload = () => {
        let { width, height } = img;

        // Calculate aspect ratio preserving scale
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('HTML5 Canvas 2D Context tidak tersedia'));
          return;
        }

        // Fill crisp white background (preserves transparent PNGs converted to JPEG)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // High quality image smoothing settings
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw downscaled image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Export as compressed data URL
        const compressedDataUrl = canvas.toDataURL(mimeType, quality);
        resolve(compressedDataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
