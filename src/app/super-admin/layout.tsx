"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardSidebar, superAdminNav } from "@/components/dashboard/sidebar";
import { useAuthStore } from "@/store/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { DataGuardian } from "@/components/auth/data-guardian";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin, refreshUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Keep session credentials synced with data/users.json
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const u = useAuthStore.getState().user;
      if (!u) {
        router.push("/auth/login");
      } else if (!useAuthStore.getState().isSuperAdmin()) {
        router.push("/admin");
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [user, router]);

  if (!user || !isSuperAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-32 w-64" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Auto-save / restore accounts so code deploys do not wipe logins */}
      <DataGuardian />
      <DashboardSidebar nav={superAdminNav} title="Super Admin" accent="red" />
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </div>
    </div>
  );
}
