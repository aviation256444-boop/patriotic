"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { badges } from "@/lib/data/stats";
import { formatDate } from "@/lib/utils";

const titles: Record<string, string> = {
  activity: "Activity History",
  volunteer: "Volunteer Hours",
  certificates: "Certificates",
  events: "My Events",
  notifications: "Notifications",
  messages: "Messages",
  achievements: "Achievements & Badges",
  downloads: "Downloads",
};

const messages = [
  { id: "1", from: "District Coordinator", preview: "Looking forward to seeing you at the next community service...", time: "1d ago", unread: true },
  { id: "2", from: "PYU Support", preview: "Your certificate is ready for download.", time: "3d ago", unread: false },
  { id: "3", from: "Event Team", preview: "Confirmation for National Youth Summit registration.", time: "1w ago", unread: false },
];

export default function DashboardSubPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = use(params);
  const page = slug[0] || "activity";
  const { user } = useAuthStore();
  const title = titles[page] || "Dashboard";

  if (!user) return null;

  // Skip pages that have dedicated routes
  if (
    ["profile", "membership", "settings", "events", "notifications"].includes(
      page
    )
  )
    return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>

      {page === "activity" && (
        <div className="rounded-2xl border border-border/50 bg-card divide-y divide-border/50">
          {[
            { action: "Registered for Digital Skills Bootcamp", date: "2025-07-20" },
            { action: "Earned Helping Hand badge", date: "2025-07-15" },
            { action: "Logged 4 volunteer hours", date: "2025-07-10" },
            { action: "Updated profile", date: "2025-07-01" },
            { action: "Joined PYU platform", date: "2024-01-15" },
          ].map((a) => (
            <div key={a.action} className="flex justify-between p-4 text-sm">
              <span>{a.action}</span>
              <span className="text-muted-foreground">{formatDate(a.date)}</span>
            </div>
          ))}
        </div>
      )}

      {page === "volunteer" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-6 text-center">
            <p className="text-4xl font-bold text-emerald-600">{user.volunteerHours ?? 0}</p>
            <p className="text-sm text-muted-foreground">Total Volunteer Hours</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card divide-y divide-border/50">
            {[
              { project: "Climate Action Day — Mbale", hours: 8, date: "2025-06-05" },
              { project: "Community Health Camp", hours: 12, date: "2025-05-20" },
              { project: "School Renovation Drive", hours: 16, date: "2025-04-10" },
              { project: "ICT Mentorship Sessions", hours: 12, date: "2025-03-15" },
            ].map((v) => (
              <div key={v.project} className="flex justify-between items-center p-4 text-sm">
                <div>
                  <p className="font-medium">{v.project}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(v.date)}</p>
                </div>
                <Badge variant="success">{v.hours}h</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {page === "certificates" && (
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { name: "Volunteer Service Certificate", date: "2025-06-01" },
            { name: "Patriotism Training Completion", date: "2025-03-15" },
            { name: "Leadership Workshop Certificate", date: "2024-11-20" },
          ].map((c) => (
            <div key={c.name} className="rounded-2xl border border-border/50 bg-card p-5">
              <p className="font-semibold">{c.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatDate(c.date)}</p>
              <Button size="sm" variant="outline" className="mt-3">Download PDF</Button>
            </div>
          ))}
        </div>
      )}

      {page === "messages" && (
        <div className="rounded-2xl border border-border/50 bg-card divide-y divide-border/50">
          {messages.map((m) => (
            <div key={m.id} className={`p-4 flex items-start gap-3 ${m.unread ? "bg-emerald-500/5" : ""}`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold">
                {m.from[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <p className="font-semibold text-sm">{m.from}</p>
                  <span className="text-xs text-muted-foreground">{m.time}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{m.preview}</p>
              </div>
              {m.unread && <span className="h-2 w-2 rounded-full bg-emerald-500 mt-2" />}
            </div>
          ))}
        </div>
      )}

      {page === "achievements" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {badges.map((b) => {
            const earned = user.badges?.includes(b.id);
            return (
              <div
                key={b.id}
                className={`rounded-2xl border p-5 text-center ${
                  earned ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/50 opacity-50"
                }`}
              >
                <div className={`mx-auto h-12 w-12 rounded-full ${b.color} flex items-center justify-center mb-2`}>
                  <Award className="h-6 w-6 text-white" />
                </div>
                <p className="font-bold text-sm">{b.name}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{b.description}</p>
                {earned && <Badge variant="success" className="mt-2">Earned</Badge>}
              </div>
            );
          })}
        </div>
      )}

      {page === "downloads" && (
        <div className="space-y-3">
          {[
            "Membership Card PDF",
            "Volunteer Certificate",
            "Patriotism Training Certificate",
            "Event Ticket — Digital Skills Bootcamp",
          ].map((d) => (
            <div key={d} className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-4">
              <p className="text-sm font-medium">{d}</p>
              <Button size="sm" variant="outline">Download</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Award({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
