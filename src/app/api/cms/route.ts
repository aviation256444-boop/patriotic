import { NextResponse } from "next/server";
import { getDb, exportDatabase, importDatabase, resetDatabase } from "@/lib/cms/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    if (mode === "export") {
      const json = await exportDatabase();
      return new NextResponse(json, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="pyu-cms-backup-${Date.now()}.json"`,
        },
      });
    }

    const db = await getDb();
    return NextResponse.json(db, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load CMS data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action as string;
    const actor = (body.actor as string) || "admin";

    if (action === "reset") {
      const db = await resetDatabase(actor);
      return NextResponse.json(db);
    }

    if (action === "import") {
      if (!body.data) {
        return NextResponse.json({ error: "Missing data" }, { status: 400 });
      }
      const json = typeof body.data === "string" ? body.data : JSON.stringify(body.data);
      const db = await importDatabase(json, actor);
      return NextResponse.json(db);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
