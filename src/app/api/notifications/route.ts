import { NextResponse } from "next/server";
import { buildNotificationFeed } from "@/lib/notifications/algorithm";
import {
  createNotification,
  markAllReadForUser,
  markNotificationRead,
} from "@/lib/notifications/store";
import {
  findUserByEmail,
  findUserById,
  requireSuperAdminAny,
} from "@/lib/auth/local-users";

export const dynamic = "force-dynamic";

function actorFrom(request: Request, body?: Record<string, unknown>) {
  const { searchParams } = new URL(request.url);
  return {
    actorId:
      (body?.actorId as string) ||
      searchParams.get("actorId") ||
      searchParams.get("userId") ||
      request.headers.get("x-actor-id") ||
      "",
    actorEmail: (
      (body?.actorEmail as string) ||
      searchParams.get("actorEmail") ||
      searchParams.get("userEmail") ||
      request.headers.get("x-actor-email") ||
      ""
    )
      .trim()
      .toLowerCase(),
  };
}

/**
 * GET — personal notification feed (dynamic algorithm, not static demo).
 * Query: userId / userEmail / actorId / actorEmail, limit
 */
export async function GET(request: Request) {
  try {
    const { actorId, actorEmail } = actorFrom(request);
    if (!actorId && !actorEmail) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const user =
      (actorId ? findUserById(actorId) : null) ||
      (actorEmail ? findUserByEmail(actorEmail) : null);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 50);
    const feed = buildNotificationFeed({
      userId: user.id,
      userEmail: user.email,
      fullName: user.fullName,
      membershipStatus: user.membershipStatus,
      membershipNumber: user.membershipNumber,
      role: user.role,
      createdAt: user.createdAt,
      limit,
    });

    return NextResponse.json(
      {
        success: true,
        ...feed,
        unreadCount: feed.unread,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}

/**
 * PATCH — mark one or all as read
 * body: { id? , markAll?: true, actorId, actorEmail }
 */
export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { actorId, actorEmail } = actorFrom(request, body);
    if (!actorId && !actorEmail) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const user =
      (actorId ? findUserById(actorId) : null) ||
      (actorEmail ? findUserByEmail(actorEmail) : null);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (body.markAll) {
      const count = markAllReadForUser(user.id, user.email, user.role);
      return NextResponse.json({ success: true, marked: count });
    }

    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json({ error: "Notification id required" }, { status: 400 });
    }
    const item = markNotificationRead(id, user.id, user.email);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, notification: item });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}

/**
 * POST — create broadcast or targeted notification (super admin)
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { actorId, actorEmail } = actorFrom(request, body);
    if (!actorId && !actorEmail) {
      return NextResponse.json({ error: "Super admin required" }, { status: 401 });
    }
    requireSuperAdminAny(actorId, actorEmail);

    const title = String(body.title || "").trim();
    const message = String(body.message || "").trim();
    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message required" },
        { status: 400 }
      );
    }

    const audience = String(body.audience || "all") as
      | "all"
      | "members"
      | "admins"
      | "user";

    const n = createNotification({
      title,
      message,
      type: (body.type as "info") || "info",
      link: body.link ? String(body.link) : undefined,
      audience,
      userId: body.userId ? String(body.userId) : undefined,
      userEmail: body.userEmail ? String(body.userEmail) : undefined,
      sourceKey: body.sourceKey
        ? String(body.sourceKey)
        : `broadcast:${Date.now()}:${title.slice(0, 24)}`,
      meta: { createdBy: actorEmail || actorId },
    });

    return NextResponse.json({ success: true, notification: n });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    const status = /super admin/i.test(msg) ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
