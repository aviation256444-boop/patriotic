/**
 * Browser-side image compression for every CMS upload (events, news, logos, …).
 * Large phone photos often fail raw upload on free hosts — always resize first.
 */

export type CompressOptions = {
  /** Longest side in pixels */
  maxEdge?: number;
  /** Target max file size in bytes */
  maxBytes?: number;
  /** Output MIME (default image/jpeg — widest support) */
  mime?: "image/webp" | "image/jpeg" | "image/png";
  /** File name suffix */
  nameHint?: string;
};

/** Presets used across the site */
export const COMPRESS_PRESETS = {
  /** Header / footer logo */
  logo: { maxEdge: 640, maxBytes: 320 * 1024, nameHint: "logo" } as CompressOptions,
  /** Hero / OG social images */
  hero: { maxEdge: 1600, maxBytes: 700 * 1024, nameHint: "hero" } as CompressOptions,
  /** Event covers, news, programs, leaders, gallery, projects… */
  content: { maxEdge: 1600, maxBytes: 900 * 1024, nameHint: "image" } as CompressOptions,
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
      reject(
        new Error(
          "Could not read this image. Export as JPG or PNG (HEIC from iPhone often needs conversion)."
        )
      );
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
 * Resize + compress an image for reliable upload.
 * Returns a smaller File and a data URL when still reasonably small.
 */
export async function compressImageForUpload(
  file: File,
  options: CompressOptions = {}
): Promise<{ file: File; dataUrl?: string; compressed: boolean }> {
  const maxEdge = options.maxEdge ?? COMPRESS_PRESETS.content.maxEdge!;
  const maxBytes = options.maxBytes ?? COMPRESS_PRESETS.content.maxBytes!;
  const nameHint = options.nameHint || "image";
  // Prefer JPEG for compatibility + size (PNG only if already tiny PNG with transparency needs)
  let mime: string = options.mime || "image/jpeg";

  // SVG stays as-is
  if (
    file.type === "image/svg+xml" ||
    file.name.toLowerCase().endsWith(".svg")
  ) {
    const dataUrl =
      file.size <= 200 * 1024 ? await blobToDataUrl(file) : undefined;
    return { file, dataUrl, compressed: false };
  }

  // Already small enough — still produce dataUrl for fallback
  if (file.size <= maxBytes && file.type.startsWith("image/") && !/heic|heif/i.test(file.type + file.name)) {
    try {
      const dataUrl =
        file.size <= 450 * 1024 ? await blobToDataUrl(file) : undefined;
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

    // White background — JPEG cannot keep transparency
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.85;
    let blob: Blob;
    try {
      blob = await canvasToBlob(canvas, mime, quality);
    } catch {
      mime = "image/jpeg";
      blob = await canvasToBlob(canvas, mime, quality);
    }

    // Step quality down until under maxBytes
    while (blob.size > maxBytes && quality > 0.4) {
      quality -= 0.08;
      blob = await canvasToBlob(canvas, mime, quality);
    }

    // Still huge? shrink dimensions further
    let current = canvas;
    let guard = 0;
    while (blob.size > maxBytes && guard < 4) {
      guard += 1;
      const smaller = document.createElement("canvas");
      const w2 = Math.max(48, Math.round(current.width * 0.7));
      const h2 = Math.max(48, Math.round(current.height * 0.7));
      smaller.width = w2;
      smaller.height = h2;
      const c2 = smaller.getContext("2d");
      if (!c2) break;
      c2.fillStyle = "#ffffff";
      c2.fillRect(0, 0, w2, h2);
      c2.drawImage(current, 0, 0, w2, h2);
      blob = await canvasToBlob(smaller, mime, 0.78);
      current = smaller;
    }

    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const base =
      file.name.replace(/\.[^.]+$/, "").replace(/[^\w\-]+/g, "-").slice(0, 40) ||
      nameHint;
    const outFile = new File([blob], `${base}-${nameHint}.${ext}`, {
      type: mime,
      lastModified: Date.now(),
    });

    // data URL only when small enough to store safely in JSON / form state
    const dataUrl =
      blob.size <= 450 * 1024 ? await blobToDataUrl(blob) : undefined;

    return { file: outFile, dataUrl, compressed: true };
  } catch (e) {
    console.warn("compressImageForUpload failed", e);
    // Last resort: try original if under hard limit
    if (file.size <= 12 * 1024 * 1024) {
      return { file, compressed: false };
    }
    throw e instanceof Error
      ? e
      : new Error("Could not prepare image for upload");
  }
}
