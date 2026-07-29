"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Search, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { events, newsArticles, projects, galleryItems } from "@/lib/data/content";
import { formatDate, formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";

const titles: Record<string, string> = {
  members: "User Management",
  events: "Event Management",
  news: "News Management",
  gallery: "Gallery Management",
  projects: "Project Management",
  volunteers: "Volunteer Management",
  donations: "Donations",
  notifications: "Notifications",
  campaigns: "Email & SMS Campaigns",
  reports: "Reports",
  audit: "Audit Logs",
};

export default function AdminSubPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = use(params);
  const page = slug[0] || "members";
  const title = titles[page] || "Admin";
  const router = useRouter();

  // Members has a dedicated live page at /admin/members
  useEffect(() => {
    if (page === "members") {
      router.replace("/admin/members");
    }
  }, [page, router]);

  if (page === "members") {
    return (
      <p className="text-sm text-muted-foreground p-6">Opening live members list…</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search..."
              className="h-10 rounded-xl border border-border bg-background pl-9 pr-4 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <Button
            size="sm"
            onClick={() => toast.success("Create form opened", { description: `New ${page} form would appear here.` })}
          >
            <Plus className="h-4 w-4" /> Add New
          </Button>
        </div>
      </div>

      {page === "events" && (
        <div className="space-y-3">
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(e.startDate)} · {e.registered}/{e.capacity} registered
                </p>
              </div>
              <Badge variant={e.status === "upcoming" ? "info" : e.status === "past" ? "outline" : "success"}>
                {e.status}
              </Badge>
              <Button size="sm" variant="outline" onClick={() => toast.info("Edit event")}>Edit</Button>
            </div>
          ))}
        </div>
      )}

      {page === "news" && (
        <div className="space-y-3">
          {newsArticles.map((a) => (
            <div key={a.id} className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.coverImage} alt="" className="h-14 w-14 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {a.category} · {formatNumber(a.views)} views · {formatDate(a.publishedAt)}
                </p>
              </div>
              {a.featured && <Badge variant="secondary">Featured</Badge>}
              <Button size="sm" variant="outline">Edit</Button>
            </div>
          ))}
        </div>
      )}

      {page === "gallery" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {galleryItems.map((g) => (
            <div key={g.id} className="rounded-xl overflow-hidden border border-border/50 relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.thumbnail} alt={g.title} className="h-32 w-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="sm" variant="glass" className="text-white text-xs">Edit</Button>
                <Button size="sm" variant="destructive" className="text-xs">Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {page === "projects" && (
        <div className="space-y-3">
          {projects.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border/50 bg-card p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-sm">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.location} · {p.progress}% complete</p>
              </div>
              <Badge variant={p.status === "completed" ? "success" : "info"}>{p.status}</Badge>
              <Button size="sm" variant="outline">Edit</Button>
            </div>
          ))}
        </div>
      )}

      {page === "volunteers" && (
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">District</th>
                <th className="px-4 py-3 font-semibold">Hours</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {[
                { name: "Grace Achieng", district: "Gulu", hours: 320 },
                { name: "Brian Ssempijja", district: "Kampala", hours: 285 },
                { name: "Faith Namukasa", district: "Mbale", hours: 260 },
                { name: "Joseph Okot", district: "Arua", hours: 210 },
              ].map((v) => (
                <tr key={v.name}>
                  <td className="px-4 py-3 font-medium">{v.name}</td>
                  <td className="px-4 py-3">{v.district}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-600">{v.hours}h</td>
                  <td className="px-4 py-3"><Badge variant="success">Active</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {page === "donations" && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border/50 bg-card p-5 text-center">
              <p className="text-2xl font-bold text-emerald-600">UGX 45M</p>
              <p className="text-xs text-muted-foreground">Total Raised</p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card p-5 text-center">
              <p className="text-2xl font-bold">328</p>
              <p className="text-xs text-muted-foreground">Donors</p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card p-5 text-center">
              <p className="text-2xl font-bold">UGX 137K</p>
              <p className="text-xs text-muted-foreground">Average Gift</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card divide-y divide-border/50">
            {[
              { donor: "Anonymous", amount: 500000, campaign: "General Fund", date: "2025-07-20" },
              { donor: "Stanbic Bank", amount: 5000000, campaign: "Scholarships", date: "2025-07-15" },
              { donor: "John Mukasa", amount: 100000, campaign: "Green Uganda", date: "2025-07-12" },
              { donor: "MTN Foundation", amount: 10000000, campaign: "Skills Training", date: "2025-07-01" },
            ].map((d) => (
              <div key={d.donor + d.date} className="flex justify-between p-4 text-sm">
                <div>
                  <p className="font-medium">{d.donor}</p>
                  <p className="text-xs text-muted-foreground">{d.campaign} · {formatDate(d.date)}</p>
                </div>
                <p className="font-bold text-emerald-600">UGX {d.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {page === "notifications" && <AdminBroadcastForm />}

      {page === "campaigns" && (
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
            <h2 className="font-bold">Email Campaign</h2>
            <Input label="Subject" placeholder="Email subject" />
            <textarea className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm h-32 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Email body..." />
            <Button onClick={() => toast.success("Email campaign queued!")}>Send Email Campaign</Button>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
            <h2 className="font-bold">SMS Campaign</h2>
            <textarea className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm h-32 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="SMS message (160 chars)..." maxLength={160} />
            <Button variant="secondary" onClick={() => toast.success("SMS campaign queued!")}>Send SMS Campaign</Button>
          </div>
        </div>
      )}

      {page === "reports" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            "Membership Report",
            "District Statistics",
            "Financial Report",
            "Volunteer Hours Report",
            "Event Attendance Report",
            "Donation Summary",
          ].map((r) => (
            <div key={r} className="rounded-2xl border border-border/50 bg-card p-5 flex flex-col">
              <p className="font-semibold flex-1">{r}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => toast.success(`${r} generated`)}>
                Generate PDF
              </Button>
            </div>
          ))}
        </div>
      )}

      {page === "audit" && (
        <div className="rounded-2xl border border-border/50 bg-card divide-y divide-border/50">
          {[
            { user: "admin@pyu.ug", action: "Updated event: National Youth Summit", time: "10 min ago", ip: "41.210.x.x" },
            { user: "superadmin@pyu.ug", action: "Created district admin for Gulu", time: "1 hour ago", ip: "41.210.x.x" },
            { user: "admin@pyu.ug", action: "Published news article", time: "3 hours ago", ip: "41.210.x.x" },
            { user: "admin@pyu.ug", action: "Approved membership: Faith Namukasa", time: "5 hours ago", ip: "41.210.x.x" },
            { user: "system", action: "Daily backup completed", time: "Yesterday 02:00", ip: "—" },
          ].map((log, i) => (
            <div key={i} className="p-4 text-sm flex flex-col sm:flex-row sm:justify-between gap-1">
              <div>
                <p className="font-medium">{log.action}</p>
                <p className="text-xs text-muted-foreground">{log.user} · IP: {log.ip}</p>
              </div>
              <span className="text-xs text-muted-foreground">{log.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Real in-app broadcast — requires super admin on API */
function AdminBroadcastForm() {
  const { user } = useAuthStore();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<"all" | "members" | "admins">("all");
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!user) {
      toast.error("Sign in required");
      return;
    }
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message,
          audience,
          link: link || undefined,
          type: "info",
          actorId: user.id,
          actorEmail: user.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      toast.success("In-app notification published", {
        description: "Members will see it in their live notification feed.",
      });
      setTitle("");
      setMessage("");
      setLink("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed", {
        description: "Broadcasts require Super Admin access.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4 max-w-xl">
      <div>
        <h2 className="font-bold text-lg">Send in-app notification</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Creates a real alert in members&apos; notification feeds (not a static demo toast).
          Super Admin required.
        </p>
      </div>
      <Input
        label="Title"
        placeholder="Notification title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Message</label>
        <textarea
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm h-24 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          placeholder="Notification body..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Audience</label>
        <select
          className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm"
          value={audience}
          onChange={(e) =>
            setAudience(e.target.value as "all" | "members" | "admins")
          }
        >
          <option value="all">Everyone</option>
          <option value="members">Members</option>
          <option value="admins">Admins only</option>
        </select>
      </div>
      <Input
        label="Optional link"
        placeholder="/events or /dashboard"
        value={link}
        onChange={(e) => setLink(e.target.value)}
      />
      <Button loading={loading} onClick={() => void send()}>
        Publish to notification feed
      </Button>
    </div>
  );
}
