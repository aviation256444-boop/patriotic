"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardSidebar, superAdminNav } from "@/components/dashboard/sidebar";
import { useAuthStore } from "@/store/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { DataGuardian } from "@/components/auth/data-guardian";

function roleIsSuperAdmin(role: unknown): boolean {
  const r = String(role || "")
    .toLowerCase()
    .trim()
    .replace(/-/g, "_");
  return r === "super_admin" || r === "superadmin";
}

/**
 * Super Admin shell — any user with role super_admin in the DB gets the full nav.
 * Always re-loads session from server so promotions apply after re-login / refresh.
 */
export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, setUser, isSuperAdmin, refreshUser } = useAuthStore();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function gate() {
      setChecking(true);
      try {
        // 1) Hydrate from localStorage if store empty
        let session = useAuthStore.getState().user;
        if (!session && typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem("pyu_user");
            if (raw) {
              session = JSON.parse(raw);
              if (session) setUser(session);
            }
          } catch {
            /* ignore */
          }
        }

        // 2) Always pull latest role from server (promotion is stored in DB)
        const fresh = await refreshUser();
        const u = fresh || useAuthStore.getState().user;

        if (cancelled) return;

        if (!u) {
          setAllowed(false);
          router.replace("/auth/login?next=/super-admin");
          return;
        }

        const ok =
          roleIsSuperAdmin(u.role) || useAuthStore.getState().isSuperAdmin();

        if (!ok) {
          setAllowed(false);
          // Staff go to admin; members to dashboard
          const r = String(u.role || "");
          if (
            r === "admin" ||
            r === "regional_admin" ||
            r === "district_admin"
          ) {
            router.replace("/admin");
          } else {
            router.replace("/dashboard");
          }
          return;
        }

        setAllowed(true);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    void gate();
    return () => {
      cancelled = true;
    };
  }, [refreshUser, router, setUser]);

  if (checking || !allowed || !user || !isSuperAdmin()) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <Skeleton className="h-32 w-64" />
        <p className="text-sm text-muted-foreground text-center">
          Checking Super Admin access…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <DataGuardian />
      <DashboardSidebar
        nav={superAdminNav}
        title="Super Admin"
        accent="red"
      />
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </div>
    </div>
  );
}
