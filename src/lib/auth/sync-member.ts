/**
 * Keep CMS "members" collection in sync with real login accounts (users.json).
 * Admin → Members and Super Admin → CMS Members then show registered users.
 */

import { getCollection, upsertItem } from "@/lib/cms/store";
import type { User } from "@/types";
import type { CmsMember } from "@/lib/cms/types";

export async function syncUserToCmsMembers(user: User, actor = "registration"): Promise<void> {
  try {
    const list = (await getCollection("members")) as CmsMember[];
    const email = (user.email || "").toLowerCase();
    const existing =
      list.find((m) => String(m.id) === user.id) ||
      list.find((m) => String(m.email || "").toLowerCase() === email);

    await upsertItem(
      "members",
      {
        id: existing?.id || user.id,
        fullName: user.fullName || existing?.fullName || email,
        email,
        phone: user.phone || existing?.phone,
        photoURL: user.photoURL || existing?.photoURL,
        role: user.role || existing?.role || "member",
        membershipNumber: user.membershipNumber || existing?.membershipNumber,
        membershipStatus:
          user.membershipStatus || existing?.membershipStatus || "pending",
        district: user.district || existing?.district,
        subCounty: user.subCounty || existing?.subCounty,
        parish: user.parish || existing?.parish,
        village: user.village || existing?.village,
        occupation: user.occupation || existing?.occupation,
        education: user.education || existing?.education,
        skills: user.skills || existing?.skills || [],
        interests: user.interests || existing?.interests || [],
        volunteerHours: user.volunteerHours ?? existing?.volunteerHours ?? 0,
        badges: user.badges || existing?.badges || [],
        createdAt: user.createdAt || existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      actor
    );
  } catch (e) {
    console.error("syncUserToCmsMembers failed", e);
  }
}
