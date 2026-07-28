"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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

function cleanImageField(v: unknown): string {
  if (typeof v !== "string" || !v) return "";
  if (v.startsWith("data:")) return v; // keep embedded logos intact
  return v.split("?")[0];
}

const IMAGE_KEYS = ["logoUrl", "heroImage", "ogImage"] as const;

export function SiteSettingsForm() {
  const { data, isLoading } = useSiteSettings();
  const update = useUpdateSite();
  const [form, setForm] = useState<Partial<SiteSettings>>({});
  const formRef = useRef(form);
  formRef.current = form;

  useEffect(() => {
    if (data) {
      setForm(data);
      formRef.current = data;
    }
  }, [data]);

  const persist = useCallback(
    async (patch: Partial<SiteSettings>, silent?: boolean) => {
      // Always merge against latest form (avoids stale closure on auto-save)
      const cleaned: Partial<SiteSettings> = { ...formRef.current, ...patch };
      for (const key of IMAGE_KEYS) {
        if (cleaned[key] != null) {
          cleaned[key] = cleanImageField(cleaned[key]);
        }
      }
      try {
        const saved = await update.mutateAsync(cleaned);
        setForm(saved);
        formRef.current = saved;
        if (!silent) {
          toast.success("Site settings saved — logo & images are live site-wide", {
            description: "Header, footer, and homepage should update immediately.",
          });
        } else {
          toast.success("Logo / image published site-wide", {
            description: "Check the header — hard-refresh (Ctrl+Shift+R) if needed.",
          });
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
      }
    },
    [update]
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Website Content & Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload logo & hero images, then they publish automatically. You can also press{" "}
            <strong>Save All</strong> for text fields.
          </p>
        </div>
        <Button onClick={() => void persist({})} loading={update.isPending}>
          <Save className="h-4 w-4" /> Save All Settings
        </Button>
      </div>

      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-muted-foreground">
        After uploading a <strong>logo</strong> or <strong>hero</strong> image it is saved and
        applied across the site automatically. Check the header — hard-refresh (Ctrl+Shift+R) if
        your browser still shows an old cached image.
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
        {siteSettingsFields.map((field) => (
          <FieldRenderer
            key={field.key}
            field={field}
            value={form[field.key as keyof SiteSettings]}
            onChange={(v) => {
              const next = { ...formRef.current, [field.key]: v } as Partial<SiteSettings>;
              setForm(next);
              formRef.current = next;
              // Auto-publish logo / hero / og when image field changes
              if (
                IMAGE_KEYS.includes(field.key as (typeof IMAGE_KEYS)[number]) &&
                typeof v === "string" &&
                v
              ) {
                void persist({ [field.key]: v } as Partial<SiteSettings>, true);
              }
            }}
          />
        ))}
      </div>

      <Button
        onClick={() => void persist({})}
        loading={update.isPending}
        className="w-full sm:w-auto"
      >
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
