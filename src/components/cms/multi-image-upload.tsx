"use client";

import { useRef, useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useUploadImage } from "@/hooks/use-cms";
import { mediaUrl } from "@/lib/cms/media-url";
import {
  compressImageForUpload,
  COMPRESS_PRESETS,
} from "@/lib/upload/compress-image";
import { toast } from "sonner";

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
}

function stripQuery(url: string) {
  if (!url || url.startsWith("data:")) return url || "";
  return url.split("?")[0];
}

export function MultiImageUpload({ value, onChange, label }: MultiImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadImage();
  const [busy, setBusy] = useState(false);
  const images = Array.isArray(value) ? value.filter(Boolean) : [];

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    setBusy(true);
    const urls = [...images];
    let ok = 0;
    for (const file of list) {
      try {
        if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|gif|svg)$/i.test(file.name)) {
          toast.error(`Skipped ${file.name}: not an image`);
          continue;
        }
        const compressed = await compressImageForUpload(
          file,
          COMPRESS_PRESETS.content
        );
        try {
          const result = await upload.mutateAsync({
            file: compressed.file,
            preferInline: false,
          });
          const permanent =
            result.permanentUrl ||
            stripQuery(result.url) ||
            result.dataUrl ||
            compressed.dataUrl;
          if (!permanent) throw new Error("No URL");
          urls.push(permanent);
          ok += 1;
        } catch {
          if (compressed.dataUrl) {
            urls.push(compressed.dataUrl);
            ok += 1;
          } else {
            toast.error(`Failed: ${file.name}`);
          }
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `Failed: ${file.name}`);
      }
    }
    onChange(urls);
    setBusy(false);
    if (ok > 0) {
      toast.success(`${ok} image(s) uploaded`, {
        description: "Click Save on this form to publish.",
      });
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-foreground/80">{label}</label>}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {images.map((src, i) => (
          <div
            key={`${src.slice(0, 40)}-${i}`}
            className="relative aspect-square rounded-xl overflow-hidden border border-border/50 group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src.startsWith("data:") ? src : mediaUrl(src, i)}
              alt=""
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              className="absolute top-1 right-1 rounded-lg bg-red-600 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || upload.isPending}
          className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-emerald-500/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-emerald-600 transition-colors"
        >
          {busy || upload.isPending ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <Plus className="h-6 w-6" />
              <span className="text-[10px] font-medium">Upload</span>
            </>
          )}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.svg"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="text-xs text-muted-foreground">
        Images are auto-resized before upload. Save the form to publish them on the live site.
      </p>
    </div>
  );
}
