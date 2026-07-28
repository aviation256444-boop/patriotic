import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { registerMedia } from "@/lib/cms/store";
import {
  hasCloudinaryConfig,
  uploadBufferToCloudinary,
} from "@/lib/upload/cloudinary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_SIZE = 12 * 1024 * 1024; // 12MB
/** Logos under this size can be inlined as data URLs so they survive Render redeploys */
const INLINE_MAX = 450 * 1024;

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  heic: "image/heic",
  heif: "image/heif",
};

/** Node/undici FormData may return File or Blob depending on runtime */
function isBlobLike(value: unknown): value is Blob {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Blob).arrayBuffer === "function" &&
    typeof (value as Blob).size === "number"
  );
}

function detectType(mimeIn: string, fileName: string): { mime: string; ext: string } | null {
  let mime = mimeIn || "";
  const nameExt = fileName.split(".").pop()?.toLowerCase() || "";

  if (!mime || mime === "application/octet-stream") {
    mime = EXT_MIME[nameExt] || "";
  }

  if (mime.startsWith("image/")) {
    const ext =
      mime === "image/jpeg"
        ? "jpg"
        : mime === "image/png"
          ? "png"
          : mime === "image/webp"
            ? "webp"
            : mime === "image/gif"
              ? "gif"
              : mime === "image/svg+xml"
                ? "svg"
                : nameExt || "jpg";
    return { mime, ext };
  }

  if (EXT_MIME[nameExt]) {
    return {
      mime: EXT_MIME[nameExt],
      ext: nameExt === "jpeg" ? "jpg" : nameExt,
    };
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const raw = formData.get("file");
    const actor = String(formData.get("actor") || "admin");
    const preferInline = String(formData.get("preferInline") || "") === "1";

    if (!raw || !isBlobLike(raw)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const originalName =
      typeof (raw as File).name === "string" && (raw as File).name
        ? (raw as File).name
        : "upload.png";

    if (raw.size <= 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }

    if (raw.size > MAX_SIZE) {
      return NextResponse.json({ error: "File must be under 12MB" }, { status: 400 });
    }

    const typeInfo = detectType(raw.type || "", originalName);
    if (!typeInfo) {
      return NextResponse.json(
        {
          error:
            "Only image files are allowed (JPEG, PNG, WebP, GIF, SVG). Try renaming the file with a proper extension.",
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await raw.arrayBuffer());
    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${typeInfo.ext}`;
    let permanentUrl = "";
    let storage: "cloudinary" | "disk" | "inline" = "disk";

    // 1) Prefer Cloudinary when configured
    if (hasCloudinaryConfig()) {
      try {
        const cloud = await uploadBufferToCloudinary(buffer, filename, typeInfo.mime);
        if (cloud?.url) {
          permanentUrl = cloud.url;
          storage = "cloudinary";
        }
      } catch (e) {
        console.error("Cloudinary upload error", e);
      }
    }

    // 2) Write local disk copy
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadDir, { recursive: true });
      const fullPath = path.join(uploadDir, filename);
      await fs.writeFile(fullPath, buffer);
      const stat = await fs.stat(fullPath);
      if (!stat.size) throw new Error("Upload wrote an empty file");
      if (!permanentUrl) {
        permanentUrl = `/uploads/${filename}`;
        storage = "disk";
      }
    } catch (diskErr) {
      console.error("Disk upload failed", diskErr);
      if (!permanentUrl && buffer.length <= INLINE_MAX && !typeInfo.mime.includes("svg")) {
        permanentUrl = `data:${typeInfo.mime};base64,${buffer.toString("base64")}`;
        storage = "inline";
      } else if (!permanentUrl) {
        throw diskErr instanceof Error ? diskErr : new Error("Could not save image");
      }
    }

    // 3) Small images → data URL for free-host persistence
    let dataUrl: string | undefined;
    if (buffer.length <= INLINE_MAX && !typeInfo.mime.includes("svg")) {
      dataUrl = `data:${typeInfo.mime};base64,${buffer.toString("base64")}`;
    }

    if (preferInline && dataUrl) {
      permanentUrl = dataUrl;
      storage = "inline";
    }

    const version = Date.now();
    const url = permanentUrl.startsWith("data:")
      ? permanentUrl
      : permanentUrl.includes("?")
        ? permanentUrl
        : `${permanentUrl}?v=${version}`;

    let mediaId: string | undefined;
    try {
      const media = await registerMedia(
        {
          url: permanentUrl.startsWith("data:")
            ? permanentUrl.slice(0, 64) + "…"
            : permanentUrl,
          filename,
          size: raw.size,
          type: typeInfo.mime,
          alt: originalName,
        },
        actor
      );
      mediaId = String(media.id);
    } catch (e) {
      console.error("registerMedia failed", e);
    }

    return NextResponse.json(
      {
        url,
        permanentUrl,
        dataUrl,
        filename,
        size: raw.size,
        type: typeInfo.mime,
        mediaId,
        storage,
        success: true,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    const files = await fs.readdir(uploadDir);
    const images = (
      await Promise.all(
        files
          .filter((f) => /\.(jpe?g|png|webp|gif|svg)$/i.test(f))
          .map(async (f) => {
            const st = await fs.stat(path.join(uploadDir, f));
            return {
              id: f,
              filename: f,
              url: `/uploads/${f}`,
              size: st.size,
              createdAt: st.mtime.toISOString(),
            };
          })
      )
    ).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return NextResponse.json(images, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to list uploads" }, { status: 500 });
  }
}
