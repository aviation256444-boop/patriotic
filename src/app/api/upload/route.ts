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

function detectType(file: File): { mime: string; ext: string } | null {
  let mime = file.type;
  const nameExt = file.name.split(".").pop()?.toLowerCase() || "";

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
    return { mime: EXT_MIME[nameExt], ext: nameExt === "jpeg" ? "jpg" : nameExt };
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const actor = String(formData.get("actor") || "admin");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File must be under 12MB" }, { status: 400 });
    }

    const detected = detectType(file);
    if (!detected) {
      return NextResponse.json(
        {
          error:
            "Only image files are allowed (JPEG, PNG, WebP, GIF, SVG). Try renaming the file with a proper extension.",
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${detected.ext}`;
    let permanentUrl = "";
    let storage: "cloudinary" | "disk" | "inline" = "disk";

    // 1) Prefer Cloudinary when configured (survives Render redeploys)
    if (hasCloudinaryConfig()) {
      const cloud = await uploadBufferToCloudinary(buffer, filename, detected.mime);
      if (cloud?.url) {
        permanentUrl = cloud.url;
        storage = "cloudinary";
      }
    }

    // 2) Always write local disk copy when not using cloud (or as backup)
    if (!permanentUrl || storage === "disk") {
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
    }

    // 3) Small images: also offer data URL (persists inside cms-db.json on free hosts)
    let dataUrl: string | undefined;
    if (buffer.length <= INLINE_MAX && !detected.mime.includes("svg")) {
      dataUrl = `data:${detected.mime};base64,${buffer.toString("base64")}`;
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
          url: permanentUrl.startsWith("data:") ? permanentUrl.slice(0, 80) + "…" : permanentUrl,
          filename,
          size: file.size,
          type: detected.mime,
          alt: file.name,
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
        /** Prefer this for logo/hero on free hosting if under size limit */
        dataUrl,
        filename,
        size: file.size,
        type: detected.mime,
        mediaId,
        storage,
        success: true,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

/** List files on disk */
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
