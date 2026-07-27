"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Clock,
  Award,
  Calendar,
  Bell,
  CreditCard,
  Trophy,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { QRCodeSVG } from "qrcode.react";

export default function MemberDashboard() {
  const { user } = useAuthStore();
  if (!user) return null;

  const stats = [
    { label: "Volunteer Hours", value: user.volunteerHours ?? 0, icon: Clock, color: "text-emerald-500", href: "/dashboard/volunteer" },
    { label: "Badges", value: user.badges?.length ?? 0, icon: Award, color: "text-yellow-500", href: "/dashboard/achievements" },
    { label: "Events Attended", value: 3, icon: Calendar, color: "text-blue-500", href: "/dashboard/events" },
    { label: "Notifications", value: 5, icon: Bell, color: "text-red-500", href: "/dashboard/notifications" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">
          Welcome back, {user.fullName.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s your membership overview and activity summary.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              href={s.href}
              className="block rounded-2xl border border-border/50 bg-card p-5 hover:shadow-md hover:border-emerald-500/20 transition-all"
            >
              <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Membership status */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Membership Status</h2>
              <Badge
                variant={
                  user.membershipStatus === "active"
                    ? "success"
                    : user.membershipStatus === "pending"
                    ? "warning"
                    : "outline"
                }
              >
                {user.membershipStatus || "Not registered"}
              </Badge>
            </div>
            {user.membershipNumber ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Membership Number</span>
                  <span className="font-mono font-semibold">{user.membershipNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">District</span>
                  <span className="font-medium">{user.district || "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium capitalize">{user.role.replace("_", " ")}</span>
                </div>
                <Link href="/dashboard/membership">
                  <Button variant="outline" size="sm" className="mt-2">
                    <CreditCard className="h-4 w-4" /> View Digital Card
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Complete your membership application to get your card and QR code.
                </p>
                <Link href="/membership">
                  <Button size="sm">Apply for Membership</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" /> Next Badge Progress
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span>Volunteer Hours (next: 50h)</span>
                  <span className="font-semibold">{user.volunteerHours ?? 0}/50</span>
                </div>
                <Progress value={((user.volunteerHours ?? 0) / 50) * 100} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span>Events Attended (next: 5)</span>
                  <span className="font-semibold">3/5</span>
                </div>
                <Progress value={60} />
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <h2 className="font-bold text-lg mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {[
                { text: "Registered for Digital Skills Bootcamp", time: "2 days ago", done: true },
                { text: "Earned 'Helping Hand' badge", time: "1 week ago", done: true },
                { text: "Logged 4 volunteer hours — Climate Action Day", time: "2 weeks ago", done: true },
                { text: "Updated profile information", time: "3 weeks ago", done: true },
              ].map((a) => (
                <div key={a.text} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p>{a.text}</p>
                    <p className="text-xs text-muted-foreground">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/dashboard/activity" className="inline-flex items-center gap-1 text-sm text-emerald-600 font-medium mt-4 hover:underline">
              View all activity <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* QR Card */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/50 bg-card p-6 text-center">
            <h2 className="font-bold mb-4">QR Verification</h2>
            {user.membershipNumber ? (
              <>
                <div className="inline-flex p-4 bg-white rounded-xl">
                  <QRCodeSVG
                    value={`PYU-MEMBER:${user.membershipNumber}`}
                    size={140}
                    level="H"
                  />
                </div>
                <p className="mt-3 text-xs font-mono text-muted-foreground">{user.membershipNumber}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">Scan to verify membership</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-8">Complete membership to get QR code</p>
            )}
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <h2 className="font-bold mb-3">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { href: "/events", label: "Browse Events" },
                { href: "/volunteer", label: "Log Volunteer Hours" },
                { href: "/opportunities", label: "Find Opportunities" },
                { href: "/donate", label: "Make a Donation" },
              ].map((a) => (
                <Link key={a.href} href={a.href}>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    {a.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
