"use client";

import { useRef } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadImage } from "@/hooks/use-cms";
import { mediaUrl } from "@/lib/cms/media-url";
import { toast } from "sonner";

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
}

function stripQuery(url: string) {
  return url.split("?")[0];
}

export function MultiImageUpload({ value, onChange, label }: MultiImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadImage();
  const images = Array.isArray(value) ? value.filter(Boolean) : [];

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    const urls = [...images];
    for (const file of list) {
      try {
        const result = await upload.mutateAsync(file);
        const permanent = result.permanentUrl || stripQuery(result.url);
        urls.push(permanent);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `Failed: ${file.name}`);
      }
    }
    onChange(urls);
    toast.success(`${list.length} image(s) uploaded`);
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-foreground/80">{label}</label>}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {images.map((src, i) => (
          <div key={`${src}-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-border/50 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(src, i)} alt="" className="h-full w-full object-cover" />
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
          disabled={upload.isPending}
          className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-emerald-500/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-emerald-600 transition-colors"
        >
          {upload.isPending ? (
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
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="text-xs text-muted-foreground">
        Upload one or more images. They appear on the live site after you save.
      </p>
    </div>
  );
}
