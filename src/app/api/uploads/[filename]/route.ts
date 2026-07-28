import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Serve runtime-uploaded images.
 *
 * Next.js production does NOT serve files written to /public after the build.
 * That is why event covers showed "Image failed to load" on Render after upload.
 * All /uploads/* traffic is rewritten here (see next.config.mjs).
 */

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
};

function safeName(name: string): string | null {
  // block path traversal
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
    return null;
  }
  if (!/^[\w.\-]+$/i.test(name)) return null;
  return name;
}

async function findFile(filename: string): Promise<string | null> {
  const candidates = [
    path.join(process.cwd(), "data", "uploads", filename),
    path.join(process.cwd(), "public", "uploads", filename),
  ];
  for (const p of candidates) {
    try {
      const st = await fs.stat(p);
      if (st.isFile() && st.size > 0) return p;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename: raw } = await context.params;
    const filename = safeName(decodeURIComponent(raw || ""));
    if (!filename) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const full = await findFile(filename);
    if (!full) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const buf = await fs.readFile(full);
    const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
    const type = MIME[ext] || "application/octet-stream";

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Content-Length": String(buf.length),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("serve upload", error);
    return NextResponse.json({ error: "Failed to load image" }, { status: 500 });
  }
}
