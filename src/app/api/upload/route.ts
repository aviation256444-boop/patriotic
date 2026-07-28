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

/** Accept large phone photos; client compresses first but keep headroom */
const MAX_SIZE = 25 * 1024 * 1024; // 25MB
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
  avif: "image/avif",
  bmp: "image/bmp",
};

function isBlobLike(value: unknown): value is Blob {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Blob).arrayBuffer === "function" &&
    typeof (value as Blob).size === "number"
  );
}

function detectType(
  mimeIn: string,
  fileName: string
): { mime: string; ext: string } | null {
  let mime = (mimeIn || "").toLowerCase();
  const nameExt = fileName.split(".").pop()?.toLowerCase() || "";

  if (!mime || mime === "application/octet-stream" || mime === "binary/octet-stream") {
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
                : mime === "image/avif"
                  ? "avif"
                  : nameExt || "jpg";
    return { mime, ext };
  }

  if (EXT_MIME[nameExt]) {
    return {
      mime: EXT_MIME[nameExt],
      ext: nameExt === "jpeg" ? "jpg" : nameExt,
    };
  }

  // Some browsers send empty type — allow common image extensions
  if (nameExt && ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(nameExt)) {
    return {
      mime: EXT_MIME[nameExt] || "image/jpeg",
      ext: nameExt === "jpeg" ? "jpg" : nameExt,
    };
  }

  return null;
}

export async function POST(request: Request) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (e) {
      console.error("formData parse failed", e);
      return NextResponse.json(
        {
          error:
            "Could not read upload body. Try a smaller JPG/PNG (under 5MB) or paste an image URL.",
        },
        { status: 400 }
      );
    }

    const raw = formData.get("file");
    const actor = String(formData.get("actor") || "admin");
    const preferInline = String(formData.get("preferInline") || "") === "1";

    if (!raw || !isBlobLike(raw)) {
      return NextResponse.json(
        { error: "No file provided — choose an image and try again" },
        { status: 400 }
      );
    }

    const originalName =
      typeof (raw as File).name === "string" && (raw as File).name
        ? (raw as File).name
        : "upload.jpg";

    if (raw.size <= 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }

    if (raw.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File must be under 25MB (compress large photos first)" },
        { status: 400 }
      );
    }

    const typeInfo = detectType(raw.type || "", originalName);
    if (!typeInfo) {
      return NextResponse.json(
        {
          error:
            "Only image files are allowed (JPEG, PNG, WebP, GIF, SVG). Rename the file with a proper extension if needed.",
        },
        { status: 400 }
      );
    }

    // Reject HEIC on server if not already converted client-side (rare)
    if (
      typeInfo.mime.includes("heic") ||
      typeInfo.mime.includes("heif") ||
      /\.heic$/i.test(originalName)
    ) {
      return NextResponse.json(
        {
          error:
            "HEIC images are not supported on the server. Open the photo and export as JPG, or use a different image.",
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await raw.arrayBuffer());
    if (!buffer.length) {
      return NextResponse.json({ error: "Empty image data" }, { status: 400 });
    }

    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${typeInfo.ext}`;
    let permanentUrl = "";
    let storage: "cloudinary" | "disk" | "inline" = "disk";

    // 1) Cloudinary when configured
    if (hasCloudinaryConfig()) {
      try {
        const cloud = await uploadBufferToCloudinary(
          buffer,
          filename,
          typeInfo.mime
        );
        if (cloud?.url) {
          permanentUrl = cloud.url;
          storage = "cloudinary";
        }
      } catch (e) {
        console.error("Cloudinary upload error", e);
      }
    }

    // 2) Local disk (public/uploads)
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
      if (
        !permanentUrl &&
        buffer.length <= INLINE_MAX &&
        !typeInfo.mime.includes("svg")
      ) {
        permanentUrl = `data:${typeInfo.mime};base64,${buffer.toString("base64")}`;
        storage = "inline";
      } else if (!permanentUrl) {
        return NextResponse.json(
          {
            error:
              "Could not save image to disk. Try a smaller JPG or configure Cloudinary.",
            detail:
              diskErr instanceof Error ? diskErr.message : "disk write failed",
          },
          { status: 500 }
        );
      }
    }

    // 3) Optional data URL for small images
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
          size: buffer.length,
          type: typeInfo.mime,
          alt: originalName,
        },
        actor
      );
      mediaId = String(media.id);
    } catch (e) {
      // Don't fail the whole upload if media registry fails
      console.error("registerMedia failed", e);
    }

    return NextResponse.json(
      {
        url,
        permanentUrl,
        dataUrl,
        filename,
        size: buffer.length,
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
      {
        error:
          error instanceof Error
            ? error.message
            : "Upload failed — try JPG under 5MB or paste a link",
      },
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
            try {
              const st = await fs.stat(path.join(uploadDir, f));
              return {
                id: f,
                filename: f,
                url: `/uploads/${f}`,
                size: st.size,
                createdAt: st.mtime.toISOString(),
              };
            } catch {
              return null;
            }
          })
      )
    )
      .filter(Boolean)
      .sort((a, b) =>
        (a!.createdAt < b!.createdAt ? 1 : -1)
      ) as {
      id: string;
      filename: string;
      url: string;
      size: number;
      createdAt: string;
    }[];

    return NextResponse.json(images, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to list uploads" }, { status: 500 });
  }
}
