/**
 * Browser-side image compression so logos fit as durable data URLs
 * (survives free-host redeploys when stored in cms-db.json).
 */

export type CompressOptions = {
  /** Longest side in pixels (default 640 — plenty for header logo) */
  maxEdge?: number;
  /** Target max file size in bytes (default ~320KB) */
  maxBytes?: number;
  /** Output MIME (default image/webp, falls back to jpeg) */
  mime?: "image/webp" | "image/jpeg" | "image/png";
};

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image — try JPG or PNG"));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Image compression failed"));
        else resolve(blob);
      },
      mime,
      quality
    );
  });
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not encode image"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Resize + compress an image for logo / hero use.
 * Returns a smaller File + optional data URL when under maxBytes.
 */
export async function compressImageForUpload(
  file: File,
  options: CompressOptions = {}
): Promise<{ file: File; dataUrl?: string; compressed: boolean }> {
  const maxEdge = options.maxEdge ?? 640;
  const maxBytes = options.maxBytes ?? 320 * 1024;
  let mime: string = options.mime || "image/webp";

  // SVG stays as-is (tiny & lossless)
  if (
    file.type === "image/svg+xml" ||
    file.name.toLowerCase().endsWith(".svg")
  ) {
    const dataUrl =
      file.size <= maxBytes ? await blobToDataUrl(file) : undefined;
    return { file, dataUrl, compressed: false };
  }

  // Already small enough — keep original but still produce data URL
  if (file.size <= maxBytes && file.type.startsWith("image/")) {
    try {
      const dataUrl = await blobToDataUrl(file);
      return { file, dataUrl, compressed: false };
    } catch {
      return { file, compressed: false };
    }
  }

  try {
    const img = await loadImage(file);
    let { width, height } = img;
    if (!width || !height) {
      return { file, compressed: false };
    }

    const scale = Math.min(1, maxEdge / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { file, compressed: false };

    // White background for JPEG (no transparency)
    if (mime === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.88;
    let blob = await canvasToBlob(canvas, mime, quality).catch(async () => {
      // WebP unsupported → JPEG
      mime = "image/jpeg";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      return canvasToBlob(canvas, mime, quality);
    });

    // Step quality down until under maxBytes
    while (blob.size > maxBytes && quality > 0.45) {
      quality -= 0.1;
      blob = await canvasToBlob(canvas, mime, quality);
    }

    // Still huge? shrink dimensions further
    if (blob.size > maxBytes) {
      const smaller = document.createElement("canvas");
      const w2 = Math.max(64, Math.round(width * 0.65));
      const h2 = Math.max(64, Math.round(height * 0.65));
      smaller.width = w2;
      smaller.height = h2;
      const c2 = smaller.getContext("2d");
      if (c2) {
        if (mime === "image/jpeg") {
          c2.fillStyle = "#ffffff";
          c2.fillRect(0, 0, w2, h2);
        }
        c2.drawImage(canvas, 0, 0, w2, h2);
        blob = await canvasToBlob(smaller, mime, 0.75);
      }
    }

    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const base = file.name.replace(/\.[^.]+$/, "") || "logo";
    const outFile = new File([blob], `${base}-logo.${ext}`, { type: mime });
    const dataUrl =
      blob.size <= maxBytes * 1.15 ? await blobToDataUrl(blob) : undefined;

    return { file: outFile, dataUrl, compressed: true };
  } catch (e) {
    console.warn("compressImageForUpload failed, using original", e);
    return { file, compressed: false };
  }
}
