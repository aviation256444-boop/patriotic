"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Upload, X, Link as LinkIcon, Loader2, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadImage, useCmsCollection } from "@/hooks/use-cms";
import { mediaUrl } from "@/lib/cms/media-url";
import {
  compressImageForUpload,
  COMPRESS_PRESETS,
  type CompressOptions,
} from "@/lib/upload/compress-image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/cms/types";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
  /**
   * Prefer embedding small images as data URLs so they survive host redeploys
   * (logos / hero / og on free Render).
   */
  preferInline?: boolean;
  /** Compression preset — content (events/news) vs logo vs hero */
  compressPreset?: keyof typeof COMPRESS_PRESETS;
  /** Fired after a successful upload with the final URL that was applied */
  onUploaded?: (url: string) => void;
}

function stripQuery(url: string) {
  if (!url || url.startsWith("data:")) return url || "";
  return url.split("?")[0];
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|svg|heic|heif|avif|bmp)$/i.test(file.name);
}

export function ImageUpload({
  value,
  onChange,
  label,
  className,
  preferInline = false,
  compressPreset,
  onUploaded,
}: ImageUploadProps) {
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
  const [broken, setBroken] = useState(false);
  const [localBusy, setLocalBusy] = useState(false);
  const [statusText, setStatusText] = useState("");

  const presetKey =
    compressPreset || (preferInline ? "logo" : "content");
  const compressOpts: CompressOptions =
    COMPRESS_PRESETS[presetKey] || COMPRESS_PRESETS.content;

  useEffect(() => {
    setUrlInput(value || "");
    setPreviewKey(Date.now());
    setBroken(false);
  }, [value]);

  useEffect(() => {
    if (!libraryOpen) return;
    fetch("/api/upload", { cache: "no-store" })
      .then((r) => r.json())
      .then((list) => {
        if (Array.isArray(list)) setDiskMedia(list);
      })
      .catch(() => undefined);
  }, [libraryOpen, media.length]);

  const applyUrl = useCallback(
    (raw: string) => {
      const next = stripQuery(raw) || raw;
      onChange(next);
      setPreviewKey(Date.now());
      setBroken(false);
      onUploaded?.(next);
    },
    [onChange, onUploaded]
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (!file) return;
      if (!isImageFile(file)) {
        toast.error("Please choose an image file (JPG, PNG, WebP, GIF, SVG)");
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        toast.error("Image is too large (max 25MB before compression)");
        return;
      }

      setLocalBusy(true);
      setStatusText("Preparing image…");
      try {
        // ALWAYS compress — large event/news photos were failing raw upload
        toast.message("Preparing image…", {
          description: "Resizing so upload works reliably on any host.",
        });

        const compressed = await compressImageForUpload(file, compressOpts);
        const toUpload = compressed.file;
        const clientDataUrl = compressed.dataUrl;

        // Instant preview for logos / small content fallbacks
        if (preferInline && clientDataUrl) {
          applyUrl(clientDataUrl);
        }

        setStatusText("Uploading…");
        let permanent = "";

        try {
          const result = await upload.mutateAsync({
            file: toUpload,
            preferInline,
          });

          if (preferInline && (result.dataUrl || clientDataUrl)) {
            permanent = result.dataUrl || clientDataUrl || "";
          } else {
            permanent =
              result.permanentUrl ||
              stripQuery(result.url) ||
              result.dataUrl ||
              "";
          }

          // Last-resort client fallback if server returned empty
          if (!permanent && clientDataUrl) permanent = clientDataUrl;

          if (!permanent) throw new Error("Upload returned no URL");

          applyUrl(permanent);
          await refetchMedia().catch(() => undefined);

          const where =
            result.storage === "cloudinary"
              ? "Cloudinary (permanent)"
              : permanent.startsWith("data:")
                ? "embedded in the form (survives free-host redeploys)"
                : "saved on this server";

          toast.success("Image uploaded", {
            description: preferInline
              ? `${where}. Publishing…`
              : `${where}. Click Save on this form to publish.`,
          });
        } catch (uploadErr) {
          // Server failed — still succeed when we have a usable client image
          if (clientDataUrl) {
            applyUrl(clientDataUrl);
            toast.success("Image ready", {
              description:
                "Server upload had a problem, but the image was embedded in the form. Click Save to keep it.",
            });
          } else if (toUpload && toUpload.size < 450 * 1024) {
            // Tiny compressed file → data URL without server
            const reader = new FileReader();
            const dataUrl = await new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(String(reader.result || ""));
              reader.onerror = () => reject(new Error("encode failed"));
              reader.readAsDataURL(toUpload);
            });
            applyUrl(dataUrl);
            toast.success("Image ready (offline fallback)", {
              description: "Click Save on this form to keep it.",
            });
          } else {
            throw uploadErr;
          }
        }
      } catch (e) {
        console.error(e);
        toast.error(e instanceof Error ? e.message : "Upload failed", {
          description:
            "Try JPG/PNG under 10MB. If it still fails, paste an image link instead.",
        });
      } finally {
        setLocalBusy(false);
        setStatusText("");
      }
    },
    [upload, refetchMedia, preferInline, applyUrl, compressOpts]
  );

  const busy = upload.isPending || localBusy;

  const displaySrc = value
    ? value.startsWith("data:")
      ? value
      : mediaUrl(value, previewKey)
    : "";

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
        <div className="relative rounded-xl overflow-hidden border border-border/50 group bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={displaySrc.slice(0, 80)}
            src={displaySrc}
            alt="Preview"
            className={cn(
              "h-44 w-full object-contain bg-muted p-2",
              broken && "opacity-30"
            )}
            onError={() => setBroken(true)}
            onLoad={() => setBroken(false)}
          />
          {broken && (
            <p className="absolute inset-0 flex items-center justify-center text-xs text-red-600 font-medium bg-red-500/10 px-4 text-center">
              Image failed to load — re-upload or use Paste link
            </p>
          )}
          <div className="absolute bottom-0 inset-x-0 bg-black/60 px-3 py-1.5 text-[10px] text-white/80 truncate">
            {value.startsWith("data:")
              ? "embedded image (saved with form)"
              : stripQuery(value)}
          </div>
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="glass"
              className="text-white"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              Replace
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => {
                onChange("");
                setPreviewKey(Date.now());
                setBroken(false);
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
            if (f) void handleFile(f);
          }}
          className={cn(
            "relative rounded-xl border-2 border-dashed transition-colors",
            dragOver ? "border-emerald-500 bg-emerald-500/10" : "border-border"
          )}
        >
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex h-44 w-full flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
          >
            {busy ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
                <span className="text-sm font-medium text-emerald-600">
                  {statusText || "Uploading…"}
                </span>
              </>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                  <Upload className="h-7 w-7" />
                </div>
                <span className="text-sm font-semibold">Click to upload image</span>
                <span className="text-xs">
                  or drag & drop · JPG, PNG, WebP · auto-resized
                </span>
              </>
            )}
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.svg,.heic,.heif,.avif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-500"
          onClick={() => inputRef.current?.click()}
          loading={busy}
        >
          <Upload className="h-3.5 w-3.5" /> Upload from device
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setLibraryOpen(!libraryOpen)}
          disabled={busy}
        >
          <Images className="h-3.5 w-3.5" />
          {libraryOpen ? "Hide library" : "Media Library"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setUrlMode(!urlMode)}
          disabled={busy}
        >
          <LinkIcon className="h-3.5 w-3.5" />
          {urlMode ? "Hide link" : "Paste link"}
        </Button>
      </div>

      {libraryOpen && (
        <div className="rounded-xl border border-border/50 p-3 max-h-56 overflow-y-auto bg-card">
          {libraryItems.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No uploads yet. Use <strong>Upload from device</strong> first.
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {libraryItems.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  title={m.alt}
                  onClick={() => {
                    applyUrl(m.url);
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
            placeholder="https://… or /uploads/…"
            className="flex-1 h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const u = urlInput.trim();
              if (!u) {
                toast.error("Paste an image URL first");
                return;
              }
              applyUrl(u);
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
