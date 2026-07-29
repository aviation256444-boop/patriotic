"use client";

import Link from "next/link";
import { CreditCard, ArrowRight, Shield } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { DigitalMembershipCard } from "@/components/membership/digital-membership-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function MembershipCardPage() {
  const { user } = useAuthStore();
  if (!user) return null;

  const hasNumber = Boolean(user.membershipNumber);

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="no-print">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Member portal
            </p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              Digital membership card
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
              Your modern PYU identity card — use on screen, print, or download as PDF for events
              and chapter verification.
            </p>
          </div>
          <Badge
            variant={
              user.membershipStatus === "active" || user.membershipStatus === "approved"
                ? "success"
                : "warning"
            }
          >
            {user.membershipStatus || "Pending"}
          </Badge>
        </div>
      </div>

      {!hasNumber && (
        <div className="no-print rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <Shield className="h-8 w-8 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Membership number not assigned yet</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Complete your application so admins can approve you and issue a permanent membership
              number + QR.
            </p>
          </div>
          <Link href="/membership">
            <Button size="sm">
              Apply / update
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      <DigitalMembershipCard user={user} />

      <div className="no-print grid sm:grid-cols-2 gap-3">
        <Link
          href="/dashboard/events"
          className="rounded-2xl border border-border/50 bg-card p-4 hover:border-emerald-500/30 transition-colors"
        >
          <CreditCard className="h-5 w-5 text-emerald-600 mb-2" />
          <p className="font-semibold text-sm">My event tickets</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            View events you registered for or paid for
          </p>
        </Link>
        <Link
          href="/dashboard/profile"
          className="rounded-2xl border border-border/50 bg-card p-4 hover:border-emerald-500/30 transition-colors"
        >
          <p className="font-semibold text-sm">Update profile photo</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            A clear photo makes verification faster at venues
          </p>
        </Link>
      </div>
    </div>
  );
}
