"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldRenderer } from "./field-renderer";
import { siteSettingsFields, statsFields } from "@/lib/cms/schemas";
import {
  useSiteSettings,
  useNationalStats,
  useUpdateSite,
  useUpdateStats,
} from "@/hooks/use-cms";
import type { SiteSettings, NationalStats } from "@/lib/cms/types";
import { toast } from "sonner";

export function SiteSettingsForm() {
  const { data, isLoading } = useSiteSettings();
  const update = useUpdateSite();
  const [form, setForm] = useState<Partial<SiteSettings>>({});

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const save = async () => {
    try {
      // Normalize uploaded image paths
      const cleaned = { ...form };
      for (const key of ["logoUrl", "heroImage", "ogImage"] as const) {
        if (typeof cleaned[key] === "string" && cleaned[key]) {
          cleaned[key] = String(cleaned[key]).split("?")[0];
        }
      }
      await update.mutateAsync(cleaned);
      toast.success("Site settings saved — logo & hero are live site-wide", {
        description: "Check the header/footer and homepage. Hard-refresh (Ctrl+Shift+R) if needed.",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Website Content & Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload logo & hero images (no links needed), edit text, contact, and socials. Changes apply across the whole site.
          </p>
        </div>
        <Button onClick={save} loading={update.isPending}>
          <Save className="h-4 w-4" /> Save Changes
        </Button>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
        {siteSettingsFields.map((field) => (
          <FieldRenderer
            key={field.key}
            field={field}
            value={form[field.key as keyof SiteSettings]}
            onChange={(v) => setForm((prev) => ({ ...prev, [field.key]: v }))}
          />
        ))}
      </div>

      <Button onClick={save} loading={update.isPending} className="w-full sm:w-auto">
        <Save className="h-4 w-4" /> Save All Settings
      </Button>
    </div>
  );
}

export function StatsSettingsForm() {
  const { data, isLoading } = useNationalStats();
  const update = useUpdateStats();
  const [form, setForm] = useState<Partial<NationalStats>>({});

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const save = async () => {
    try {
      await update.mutateAsync(form);
      toast.success("Statistics updated — homepage counters will refresh");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">National Statistics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Numbers shown on the homepage animated counters.
          </p>
        </div>
        <Button onClick={save} loading={update.isPending}>
          <Save className="h-4 w-4" /> Save
        </Button>
      </div>
      <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
        {statsFields.map((field) => (
          <FieldRenderer
            key={field.key}
            field={field}
            value={form[field.key as keyof NationalStats]}
            onChange={(v) => setForm((prev) => ({ ...prev, [field.key]: v }))}
          />
        ))}
      </div>
    </div>
  );
}
