"use client";

import { useEffect, useState } from "react";
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
  Ticket,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DigitalMembershipCard } from "@/components/membership/digital-membership-card";
import { useNotifications } from "@/hooks/use-notifications";
import { formatDate } from "@/lib/utils";

type MiniTicket = {
  id: string;
  eventTitle: string;
  eventSlug: string;
  eventStartDate?: string;
  seats: number;
  amountPaid: number;
  currency: string;
  status: string;
};

export default function MemberDashboard() {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<MiniTicket[]>([]);
  const { unread: notifUnread } = useNotifications(60000);

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams();
    if (user.email) params.set("userEmail", user.email);
    if (user.id) params.set("userId", user.id);
    void fetch(`/api/events/tickets?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.tickets)) setTickets(d.tickets);
      })
      .catch(() => setTickets([]));
  }, [user]);

  if (!user) return null;

  const stats = [
    { label: "Volunteer Hours", value: user.volunteerHours ?? 0, icon: Clock, color: "text-emerald-500", href: "/dashboard/volunteer" },
    { label: "Badges", value: user.badges?.length ?? 0, icon: Award, color: "text-yellow-500", href: "/dashboard/achievements" },
    { label: "My event tickets", value: tickets.length, icon: Calendar, color: "text-blue-500", href: "/dashboard/events" },
    { label: "Unread alerts", value: notifUnread, icon: Bell, color: "text-red-500", href: "/dashboard/notifications" },
  ];

  const onboardingSteps: {
    id: string;
    label: string;
    done: boolean;
    href: string;
    optional?: boolean;
  }[] = [
    {
      id: "profile",
      label: "Complete your profile",
      done: Boolean(user.fullName && user.email),
      href: "/dashboard/profile",
    },
    {
      id: "membership",
      label: "Apply for membership",
      done: Boolean(user.membershipNumber) || user.membershipStatus === "active",
      href: "/membership",
    },
    {
      id: "district",
      label: "Set your district",
      done: Boolean(user.district),
      href: "/dashboard/profile",
    },
    {
      id: "event",
      label: "Browse upcoming events",
      done: false,
      href: "/events",
      optional: true,
    },
  ];
  const requiredSteps = onboardingSteps.filter((s) => !s.optional);
  const onboardingDone = requiredSteps.filter((s) => s.done).length;
  const showOnboarding = onboardingDone < requiredSteps.length;

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

      {showOnboarding && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <h2 className="font-bold text-lg">Get started</h2>
              <p className="text-sm text-muted-foreground">
                Finish these steps to unlock your full PYU experience.
              </p>
            </div>
            <Badge variant="outline">
              {onboardingDone}/{onboardingSteps.filter((s) => !s.optional).length} required
            </Badge>
          </div>
          <ul className="space-y-2">
            {onboardingSteps.map((step) => (
              <li key={step.id}>
                <Link
                  href={step.href}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 text-sm hover:border-emerald-500/30 transition-colors"
                >
                  <CheckCircle2
                    className={
                      step.done
                        ? "h-5 w-5 text-emerald-600 shrink-0"
                        : "h-5 w-5 text-muted-foreground/40 shrink-0"
                    }
                  />
                  <span className={step.done ? "line-through text-muted-foreground" : "font-medium"}>
                    {step.label}
                    {step.optional ? (
                      <span className="ml-2 text-[10px] uppercase text-muted-foreground">
                        optional
                      </span>
                    ) : null}
                  </span>
                  <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

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
                  <span>Event tickets (goal: 5)</span>
                  <span className="font-semibold">{tickets.length}/5</span>
                </div>
                <Progress value={Math.min(100, (tickets.length / 5) * 100)} />
              </div>
            </div>
          </div>

          {/* My registered / paid events */}
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Ticket className="h-5 w-5 text-emerald-600" />
                My events
              </h2>
              <Link
                href="/dashboard/events"
                className="text-sm text-emerald-600 font-medium hover:underline inline-flex items-center gap-1"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {tickets.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-muted-foreground">
                  No event tickets yet. Register or pay for an event to see it here.
                </p>
                <Link href="/events">
                  <Button size="sm">Browse events</Button>
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {tickets.slice(0, 4).map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/tickets/${t.id}`}
                      className="flex items-start justify-between gap-3 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 text-sm hover:border-emerald-500/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{t.eventTitle}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t.eventStartDate
                            ? formatDate(t.eventStartDate, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Date on ticket"}{" "}
                          · {t.seats} seat{t.seats === 1 ? "" : "s"}
                          {Number(t.amountPaid) > 0
                            ? ` · ${t.currency} ${Number(t.amountPaid).toLocaleString()}`
                            : " · Free"}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 capitalize">
                        {t.status || "ok"}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Membership card + actions */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Membership card</h2>
              <Link
                href="/dashboard/membership"
                className="text-xs font-semibold text-emerald-600 hover:underline"
              >
                Full card
              </Link>
            </div>
            <DigitalMembershipCard user={user} showActions={false} />
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <h2 className="font-bold mb-3">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { href: "/dashboard/events", label: "My event tickets" },
                { href: "/events", label: "Browse Events" },
                { href: "/dashboard/membership", label: "Membership card" },
                { href: "/volunteer", label: "Log Volunteer Hours" },
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
