import { NextResponse } from "next/server";
import { getItem, upsertItem, deleteItem } from "@/lib/cms/store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ collection: string; id: string }> }
) {
  try {
    const { collection, id } = await context.params;
    const item = await getItem(collection, id);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ collection: string; id: string }> }
) {
  try {
    const { collection, id } = await context.params;
    const body = await request.json();
    const actor = (body.actor as string) || "admin";
    const data = { ...(body.data || body), id };
    const result = await upsertItem(collection, data, actor);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ collection: string; id: string }> }
) {
  try {
    const { collection, id } = await context.params;
    const { searchParams } = new URL(request.url);
    const actor = searchParams.get("actor") || "admin";
    const ok = await deleteItem(collection, id, actor);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
