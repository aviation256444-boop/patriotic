"use client";

import { useRef } from "react";
import { Download, Upload, RefreshCw, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCmsDb, useCmsReset, useCmsImport } from "@/hooks/use-cms";
import { toast } from "sonner";

export default function BackupPage() {
  const { data } = useCmsDb();
  const reset = useCmsReset();
  const importDb = useCmsImport();
  const fileRef = useRef<HTMLInputElement>(null);

  const exportBackup = () => {
    window.open("/api/cms?mode=export", "_blank");
    toast.success("Export started");
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await importDb.mutateAsync(json);
      toast.success("Backup imported successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed — invalid file");
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Backup & Restore</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Export the full website database, restore from a backup, or reset to seed data.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border/50 bg-card p-5 text-center">
          <Database className="h-6 w-6 mx-auto text-emerald-500 mb-2" />
          <p className="font-bold text-sm">Live Database</p>
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
          <p className="text-xs text-muted-foreground">Members</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
        <h2 className="font-bold">Export</h2>
        <p className="text-sm text-muted-foreground">
          Download a full JSON backup of all website content, settings, and members.
        </p>
        <Button onClick={exportBackup}>
          <Download className="h-4 w-4" /> Export Backup JSON
        </Button>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
        <h2 className="font-bold">Import / Restore</h2>
        <p className="text-sm text-muted-foreground">
          Upload a previously exported JSON file. This replaces the entire database.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImport(f);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          loading={importDb.isPending}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-4 w-4" /> Import Backup File
        </Button>
      </div>

      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 space-y-4">
        <h2 className="font-bold text-red-600">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">
          Reset all content to the original demo seed data. Export a backup first.
        </p>
        <Button
          variant="destructive"
          loading={reset.isPending}
          onClick={async () => {
            if (!confirm("Reset the entire CMS database?")) return;
            try {
              await reset.mutateAsync();
              toast.success("Database reset complete");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed");
            }
          }}
        >
          <RefreshCw className="h-4 w-4" /> Reset to Seed Data
        </Button>
      </div>
    </div>
  );
}
