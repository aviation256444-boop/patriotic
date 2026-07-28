"use client";

import { useRef, useState } from "react";
import { Download, Upload, RefreshCw, Database, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCmsDb, useCmsReset, useCmsImport } from "@/hooks/use-cms";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";

export default function BackupPage() {
  const { data } = useCmsDb();
  const reset = useCmsReset();
  const importDb = useCmsImport();
  const { user: actor } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const fullFileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const exportCmsOnly = () => {
    window.open("/api/cms?mode=export", "_blank");
    toast.success("CMS content export started");
  };

  const exportFull = () => {
    if (!actor?.id && !actor?.email) {
      toast.error("Sign in as super admin first");
      return;
    }
    const qs = new URLSearchParams();
    if (actor.id) qs.set("actorId", actor.id);
    if (actor.email) qs.set("actorEmail", actor.email);
    window.open(`/api/system/backup?${qs.toString()}`, "_blank");
    toast.success("Full backup (users + content + activity) started — save this file safely");
  };

  const handleImportCms = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await importDb.mutateAsync(json);
      toast.success("CMS backup imported");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed — invalid file");
    }
  };

  const handleImportFull = async (file: File) => {
    if (!actor?.id && !actor?.email) return;
    setBusy(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch("/api/system/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorId: actor.id,
          actorEmail: actor.email,
          merge: true,
          data: json.version ? json : { cms: json },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restore failed");
      toast.success("Full backup restored (users merged — nothing deleted unless overwritten)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Backup & Restore</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Everything you create is saved on the server. Free hosts can wipe disk on redeploy —
          download a full backup regularly so accounts and history can be restored.
        </p>
      </div>

      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
        <p className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <Shield className="h-4 w-4" /> Accounts are permanent until you delete them
        </p>
        <p className="text-muted-foreground mt-1">
          Logins, memberships, CMS edits, and payments are written to disk with backup copies.
          Use <strong>Export full backup</strong> after important changes.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border/50 bg-card p-5 text-center">
          <Database className="h-6 w-6 mx-auto text-emerald-500 mb-2" />
          <p className="font-bold text-sm">Live CMS</p>
          <p className="text-xs text-muted-foreground mt-1">
            {data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5 text-center">
          <p className="text-2xl font-bold">{data?.programs?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">Programs</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5 text-center">
          <p className="text-2xl font-bold">{data?.members?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">CMS members list</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
        <h2 className="font-bold">Export full backup (recommended)</h2>
        <p className="text-sm text-muted-foreground">
          Includes login accounts, passwords (hashed), tickets, activity log, and all website content.
        </p>
        <Button onClick={exportFull} className="bg-red-600 hover:bg-red-500 text-white">
          <Download className="h-4 w-4" /> Export full backup JSON
        </Button>
        <Button variant="outline" onClick={exportCmsOnly}>
          <Download className="h-4 w-4" /> Export CMS content only
        </Button>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
        <h2 className="font-bold">Import / Restore</h2>
        <p className="text-sm text-muted-foreground">
          Upload a full backup to restore accounts and history (merge mode — existing emails kept).
        </p>
        <input
          ref={fullFileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImportFull(f);
            e.target.value = "";
          }}
        />
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImportCms(f);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            loading={busy}
            onClick={() => fullFileRef.current?.click()}
            className="bg-red-600 hover:bg-red-500 text-white"
          >
            <Upload className="h-4 w-4" /> Restore full backup
          </Button>
          <Button
            variant="outline"
            loading={importDb.isPending}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> Import CMS only
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 space-y-4">
        <h2 className="font-bold text-red-600">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">
          Reset CMS content to seed data. This does <strong>not</strong> delete login accounts in{" "}
          <code className="text-xs">users.json</code>. Export a backup first.
        </p>
        <Button
          variant="destructive"
          loading={reset.isPending}
          onClick={async () => {
            if (!confirm("Reset CMS content only? Login accounts are kept.")) return;
            try {
              await reset.mutateAsync();
              toast.success("CMS content reset (accounts kept)");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed");
            }
          }}
        >
          <RefreshCw className="h-4 w-4" /> Reset CMS content to seed
        </Button>
      </div>
    </div>
  );
}
