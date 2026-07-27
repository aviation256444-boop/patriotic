"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Upload, X, Link as LinkIcon, Loader2, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadImage, useCmsCollection } from "@/hooks/use-cms";
import { mediaUrl } from "@/lib/cms/media-url";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/cms/types";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
}

function stripQuery(url: string) {
  return url.split("?")[0];
}

export function ImageUpload({ value, onChange, label, className }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadImage();
  const { data: mediaData, refetch: refetchMedia } = useCmsCollection("media");
  const [diskMedia, setDiskMedia] = useState<{ url: string; filename: string }[]>([]);
  const media = (mediaData as MediaItem[]) || [];
  const [urlMode, setUrlMode] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [urlInput, setUrlInput] = useState(value || "");
  const [previewKey, setPreviewKey] = useState(Date.now());
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setUrlInput(value || "");
    setPreviewKey(Date.now());
  }, [value]);

  // Also load files from disk so library is never empty if uploads exist
  useEffect(() => {
    if (!libraryOpen) return;
    fetch("/api/upload", { cache: "no-store" })
      .then((r) => r.json())
      .then((list) => {
        if (Array.isArray(list)) setDiskMedia(list);
      })
      .catch(() => undefined);
  }, [libraryOpen, media.length]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file) return;
      if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|gif|svg)$/i.test(file.name)) {
        toast.error("Please choose an image file (JPG, PNG, WebP, GIF, SVG)");
        return;
      }
      try {
        const result = await upload.mutateAsync(file);
        const permanent = result.permanentUrl || stripQuery(result.url);
        if (!permanent) throw new Error("Upload returned no URL");
        onChange(permanent);
        setPreviewKey(Date.now());
        await refetchMedia();
        toast.success("Image uploaded successfully", {
          description: "Saved to Media Library — usable anywhere on the site after you click Save.",
        });
      } catch (e) {
        console.error(e);
        toast.error(e instanceof Error ? e.message : "Upload failed");
      }
    },
    [onChange, upload, refetchMedia]
  );

  const displaySrc = value ? mediaUrl(value, previewKey) : "";

  const libraryItems: { url: string; id: string; alt?: string }[] = [
    ...media.map((m) => ({ url: m.url, id: m.id, alt: m.alt || m.filename })),
    ...diskMedia
      .filter((d) => !media.some((m) => stripQuery(m.url) === stripQuery(d.url)))
      .map((d) => ({ url: d.url, id: d.filename, alt: d.filename })),
  ];

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
          {label}
          <span className="text-[10px] font-normal text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            Upload or library
          </span>
        </label>
      )}

      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border/50 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={displaySrc}
            src={displaySrc}
            alt="Preview"
            className="h-44 w-full object-cover bg-muted"
            onError={(e) => {
              (e.target as HTMLImageElement).style.opacity = "0.3";
            }}
          />
          <div className="absolute bottom-0 inset-x-0 bg-black/60 px-3 py-1.5 text-[10px] text-white/80 truncate">
            {stripQuery(value)}
          </div>
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="glass"
              className="text-white"
              onClick={() => inputRef.current?.click()}
            >
              Replace upload
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => {
                onChange("");
                setPreviewKey(Date.now());
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          className={cn(
            "relative rounded-xl border-2 border-dashed transition-colors",
            dragOver ? "border-emerald-500 bg-emerald-500/10" : "border-border"
          )}
        >
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending}
            className="flex h-44 w-full flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
          >
            {upload.isPending ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
                <span className="text-sm font-medium text-emerald-600">Uploading…</span>
              </>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                  <Upload className="h-7 w-7" />
                </div>
                <span className="text-sm font-semibold">Click to upload image</span>
                <span className="text-xs">or drag & drop · JPG, PNG, WebP · max 12MB</span>
                <span className="text-[10px] text-muted-foreground">
                  No external link required — stored on this website
                </span>
              </>
            )}
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.svg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-500"
          onClick={() => inputRef.current?.click()}
          loading={upload.isPending}
        >
          <Upload className="h-3.5 w-3.5" /> Upload from device
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setLibraryOpen(!libraryOpen)}
        >
          <Images className="h-3.5 w-3.5" />
          {libraryOpen ? "Hide library" : "Media Library"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setUrlMode(!urlMode)}>
          <LinkIcon className="h-3.5 w-3.5" />
          {urlMode ? "Hide link" : "Paste link (optional)"}
        </Button>
      </div>

      {libraryOpen && (
        <div className="rounded-xl border border-border/50 p-3 max-h-56 overflow-y-auto bg-card">
          {libraryItems.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No uploads yet. Use <strong>Upload from device</strong> first — images will show here for reuse on any page.
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {libraryItems.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  title={m.alt}
                  onClick={() => {
                    onChange(stripQuery(m.url));
                    setPreviewKey(Date.now());
                    setLibraryOpen(false);
                    toast.success("Image selected from library");
                  }}
                  className={cn(
                    "aspect-square rounded-lg overflow-hidden border-2 transition-all",
                    stripQuery(value || "") === stripQuery(m.url)
                      ? "border-emerald-500 ring-2 ring-emerald-500/30"
                      : "border-transparent hover:border-emerald-500/40"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaUrl(m.url, m.id)}
                    alt={m.alt || ""}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {urlMode && (
        <div className="flex gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Optional: https://… or /uploads/…"
            className="flex-1 h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onChange(urlInput.trim());
              setPreviewKey(Date.now());
              toast.success("Image URL set");
            }}
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
