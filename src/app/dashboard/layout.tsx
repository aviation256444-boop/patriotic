"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardSidebar, memberNav } from "@/components/dashboard/sidebar";
import { useAuthStore } from "@/store/auth-store";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user === null) {
      const timer = setTimeout(() => {
        if (!useAuthStore.getState().user) {
          router.push("/auth/login");
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-3 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <DashboardSidebar nav={memberNav} title="Member Portal" />
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </div>
    </div>
  );
}
