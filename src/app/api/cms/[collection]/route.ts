import { NextResponse } from "next/server";
import {
  getCollection,
  updateSite,
  updateStats,
  upsertItem,
  replaceCollection,
} from "@/lib/cms/store";
import type { CmsDatabase } from "@/lib/cms/types";

export const dynamic = "force-dynamic";

const VALID = new Set([
  "site",
  "stats",
  "programs",
  "projects",
  "events",
  "news",
  "gallery",
  "opportunities",
  "resources",
  "leaders",
  "partners",
  "testimonials",
  "districts",
  "coreValues",
  "history",
  "strategicGoals",
  "members",
  "donations",
  "forumPosts",
  "notifications",
  "media",
  "auditLogs",
]);

const NO_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await context.params;
    if (!VALID.has(collection)) {
      return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
    }
    const data = await getCollection(collection as keyof CmsDatabase);
    return NextResponse.json(data, { headers: NO_CACHE });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load collection" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await context.params;
    if (!VALID.has(collection)) {
      return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
    }

    const body = await request.json();
    const actor = (body.actor as string) || "admin";
    const data = body.data;

    if (collection === "site") {
      const site = await updateSite(data, actor);
      return NextResponse.json(site);
    }

    if (collection === "stats") {
      const stats = await updateStats(data, actor);
      return NextResponse.json(stats);
    }

    // Full replace for arrays
    if (Array.isArray(data)) {
      const result = await replaceCollection(
        collection as keyof CmsDatabase,
        data as never,
        actor
      );
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await context.params;
    if (!VALID.has(collection) || collection === "site" || collection === "stats") {
      return NextResponse.json({ error: "Cannot create in this collection" }, { status: 400 });
    }

    const body = await request.json();
    const actor = (body.actor as string) || "admin";
    const item = body.data || body;
    const result = await upsertItem(collection, item, actor);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
