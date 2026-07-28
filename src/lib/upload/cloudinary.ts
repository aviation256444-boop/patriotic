/**
 * Optional Cloudinary upload for permanent image hosting (Render-safe).
 * Uses unsigned upload preset OR signed upload with API secret.
 */

export function hasCloudinaryConfig(): boolean {
  const cloud =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  return Boolean(cloud && (preset || (key && secret)));
}

export async function uploadBufferToCloudinary(
  buffer: Buffer,
  filename: string,
  mime: string
): Promise<{ url: string; publicId?: string } | null> {
  const cloud =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloud) return null;

  const preset =
    process.env.CLOUDINARY_UPLOAD_PRESET ||
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  try {
    // Prefer unsigned preset (simplest for server upload)
    if (preset) {
      const form = new FormData();
      const blob = new Blob([new Uint8Array(buffer)], { type: mime });
      form.append("file", blob, filename);
      form.append("upload_preset", preset);
      form.append("folder", "pyu");

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
        { method: "POST", body: form }
      );
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error("Cloudinary unsigned upload failed", res.status, t);
        return null;
      }
      const data = (await res.json()) as { secure_url?: string; public_id?: string };
      if (!data.secure_url) return null;
      return { url: data.secure_url, publicId: data.public_id };
    }

    // Signed upload with API key/secret
    if (apiKey && apiSecret) {
      const timestamp = Math.floor(Date.now() / 1000);
      const { createHash } = await import("crypto");
      const toSign = `folder=pyu&timestamp=${timestamp}${apiSecret}`;
      const signature = createHash("sha1").update(toSign).digest("hex");

      const form = new FormData();
      const blob = new Blob([new Uint8Array(buffer)], { type: mime });
      form.append("file", blob, filename);
      form.append("api_key", apiKey);
      form.append("timestamp", String(timestamp));
      form.append("signature", signature);
      form.append("folder", "pyu");

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
        { method: "POST", body: form }
      );
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error("Cloudinary signed upload failed", res.status, t);
        return null;
      }
      const data = (await res.json()) as { secure_url?: string; public_id?: string };
      if (!data.secure_url) return null;
      return { url: data.secure_url, publicId: data.public_id };
    }
  } catch (e) {
    console.error("Cloudinary upload error", e);
  }
  return null;
}
