"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileText,
  BarChart3,
  FolderKanban,
  Calendar,
  Newspaper,
  Image,
  Users,
  Database,
  RefreshCw,
  ExternalLink,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCmsDb, useCmsReset } from "@/hooks/use-cms";
import { collectionSchemas } from "@/lib/cms/schemas";
import { toast } from "sonner";

const quickLinks = [
  { href: "/super-admin/content", label: "Website Content", desc: "Hero, vision, contact, socials", icon: FileText },
  { href: "/super-admin/stats", label: "Statistics", desc: "Homepage counters", icon: BarChart3 },
  { href: "/super-admin/programs", label: "Programs", desc: "11+ program pages", icon: Layers },
  { href: "/super-admin/projects", label: "Projects", desc: "Images & progress", icon: FolderKanban },
  { href: "/super-admin/events", label: "Events", desc: "Schedule & registration", icon: Calendar },
  { href: "/super-admin/news", label: "News", desc: "Articles & stories", icon: Newspaper },
  { href: "/super-admin/gallery", label: "Gallery", desc: "Photos & videos", icon: Image },
  { href: "/super-admin/members", label: "Members", desc: "User management", icon: Users },
  { href: "/super-admin/backup", label: "Backup", desc: "Export / import / reset", icon: Database },
];

export default function SuperAdminPage() {
  const { data, isLoading } = useCmsDb();
  const reset = useCmsReset();

  const counts = collectionSchemas.map((s) => {
    const col = data?.[s.key as keyof typeof data];
    return {
      key: s.key,
      label: s.label,
      count: Array.isArray(col) ? col.length : 0,
    };
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Content Management System</h1>
          <p className="text-muted-foreground mt-1">
            Everything on the public website is editable here. Changes go live immediately.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline">
              <ExternalLink className="h-4 w-4" /> View Website
            </Button>
          </a>
          <Button
            variant="destructive"
            loading={reset.isPending}
            onClick={async () => {
              if (!confirm("Reset ALL content to factory seed data? This cannot be undone unless you have a backup.")) return;
              try {
                await reset.mutateAsync();
                toast.success("Database reset to seed content");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Reset failed");
              }
            }}
          >
            <RefreshCw className="h-4 w-4" /> Reset Seed Data
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {counts.slice(0, 8).map((c, i) => (
              <motion.div
                key={c.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  href={`/super-admin/${c.key}`}
                  className="block rounded-2xl border border-border/50 bg-card p-5 hover:border-emerald-500/30 hover:shadow-md transition-all"
                >
                  <p className="text-2xl font-bold text-emerald-600">{c.count}</p>
                  <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
                </Link>
              </motion.div>
            ))}
          </div>

          <div>
            <h2 className="font-bold text-lg mb-4">Manage Content</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl border border-border/50 bg-card p-5 hover:border-emerald-500/30 hover:shadow-md transition-all"
                >
                  <item.icon className="h-6 w-6 text-emerald-500 mb-3" />
                  <p className="font-bold">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Recent CMS Activity</h2>
              <Badge variant="outline">
                Last update: {data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : "—"}
              </Badge>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(data?.auditLogs || []).slice(0, 15).map((log) => (
                <div
                  key={log.id}
                  className="flex justify-between text-sm border-b border-border/30 pb-2 gap-4"
                >
                  <div>
                    <p className="font-medium">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.user}
                      {log.collection ? ` · ${log.collection}` : ""}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
              {!data?.auditLogs?.length && (
                <p className="text-sm text-muted-foreground">No activity yet. Edit content to start logging.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
