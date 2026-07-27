"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CollectionManager } from "@/components/cms/collection-manager";
import { SiteSettingsForm, StatsSettingsForm } from "@/components/cms/settings-form";
import { getSchema } from "@/lib/cms/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const titles: Record<string, string> = {
  admins: "Manage Admins",
  roles: "Roles & Permissions",
  settings: "System Settings",
  theme: "Theme Customization",
  security: "Security Monitoring",
  api: "API Management",
};

export default function SuperAdminSubPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = use(params);
  const page = slug[0] || "programs";

  // Content routes handled by dedicated pages but catch-all still used for collections
  if (page === "content") return <SiteSettingsForm />;
  if (page === "stats") return <StatsSettingsForm />;

  const schema = getSchema(page);
  if (schema) {
    return <CollectionManager collectionKey={page} schema={schema} />;
  }

  // Legacy system pages
  if (page === "admins") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Manage Admins</h1>
        <p className="text-sm text-muted-foreground">
          Admin users are managed via the Members collection. Set role to admin, regional_admin, district_admin, or super_admin.
        </p>
        <Link href="/super-admin/members">
          <Button>Go to Members CMS</Button>
        </Link>
      </div>
    );
  }

  if (page === "roles") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Roles & Permissions</h1>
        <div className="space-y-3">
          {[
            { role: "super_admin", perms: "Full CMS + system control" },
            { role: "admin", perms: "Manage content, members, events, reports" },
            { role: "regional_admin", perms: "Manage regional content & members" },
            { role: "district_admin", perms: "Manage district members & events" },
            { role: "member", perms: "Dashboard, membership, volunteer portal" },
          ].map((r) => (
            <div key={r.role} className="rounded-xl border border-border/50 bg-card p-4 flex justify-between">
              <span className="font-mono font-semibold">{r.role}</span>
              <span className="text-sm text-muted-foreground">{r.perms}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (page === "settings") {
    return (
      <div className="space-y-6 max-w-xl">
        <h1 className="text-2xl font-bold">System Settings</h1>
        <p className="text-sm text-muted-foreground">
          For public website content (hero, contact, social), use{" "}
          <Link href="/super-admin/content" className="text-emerald-600 underline">
            Website Content
          </Link>
          .
        </p>
        <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
          <Input label="Organization Name" defaultValue="Patriotic Youths of Uganda" />
          <Button onClick={() => toast.success("Use Website Content for live settings")}>
            Open Website Content
          </Button>
        </div>
      </div>
    );
  }

  if (page === "theme") {
    return (
      <div className="space-y-4 max-w-xl">
        <h1 className="text-2xl font-bold">Theme Colors</h1>
        <p className="text-sm text-muted-foreground">
          Brand colors are stored in Website Content. Edit primary, secondary, and accent there.
        </p>
        <Link href="/super-admin/content">
          <Button>Edit Brand Colors</Button>
        </Link>
      </div>
    );
  }

  if (page === "security") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Security Monitoring</h1>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5 text-center">
            <p className="text-2xl font-bold text-emerald-600">0</p>
            <p className="text-xs text-muted-foreground">Active Threats</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card p-5 text-center">
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-muted-foreground">Sessions</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card p-5 text-center">
            <p className="text-2xl font-bold">OK</p>
            <p className="text-xs text-muted-foreground">CMS File Store</p>
          </div>
        </div>
      </div>
    );
  }

  if (page === "api") {
    return (
      <div className="space-y-4 max-w-xl">
        <h1 className="text-2xl font-bold">CMS API</h1>
        <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-3 text-sm font-mono">
          <p>GET /api/cms — full database</p>
          <p>GET /api/cms/:collection — list</p>
          <p>POST /api/cms/:collection — create/update item</p>
          <p>PUT /api/cms/:collection/:id — update item</p>
          <p>DELETE /api/cms/:collection/:id — delete</p>
          <p>POST /api/upload — image upload</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/super-admin" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">{titles[page] || page}</h1>
      </div>
      <Badge variant="outline">Page not found in CMS schema</Badge>
    </div>
  );
}
