"use client";

import type { FieldDef } from "@/lib/cms/schemas";
import { ImageUpload } from "./image-upload";
import { MultiImageUpload } from "./multi-image-upload";
import { cn } from "@/lib/utils";

interface FieldRendererProps {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
}

function asString(v: unknown) {
  if (v == null) return "";
  if (Array.isArray(v)) return v.join("\n");
  if (typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
}

export function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
  const inputClass =
    "flex w-full rounded-xl border border-border bg-background/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50";

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-3 cursor-pointer py-1">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
        />
        <span className="text-sm font-medium">{field.label}</span>
      </label>
    );
  }

  if (field.type === "image") {
    // Logos / hero: embed small data URLs so free hosts keep them after redeploy
    const preferInline =
      field.key === "logoUrl" ||
      field.key === "heroImage" ||
      field.key === "ogImage";
    const compressPreset =
      field.key === "logoUrl"
        ? ("logo" as const)
        : field.key === "heroImage" || field.key === "ogImage"
          ? ("hero" as const)
          : ("content" as const);
    return (
      <div className="space-y-1">
        <ImageUpload
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(url) => onChange(url)}
          preferInline={preferInline}
          compressPreset={compressPreset}
        />
        {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
        {field.required && !value && (
          <p className="text-xs text-amber-600">
            Upload an image or pick from the Media Library (required). Large photos are auto-resized.
          </p>
        )}
      </div>
    );
  }

  if (field.type === "images") {
    const list = Array.isArray(value)
      ? (value as string[])
      : typeof value === "string"
      ? value.split("\n").map((s) => s.trim()).filter(Boolean)
      : [];
    return (
      <MultiImageUpload
        label={field.label}
        value={list}
        onChange={(urls) => onChange(urls)}
      />
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground/80">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {field.type === "textarea" || field.type === "tags" || field.type === "json" ? (
        <textarea
          value={asString(value)}
          onChange={(e) => {
            if (field.type === "tags") {
              onChange(
                e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean)
              );
            } else if (field.type === "json") {
              try {
                onChange(JSON.parse(e.target.value || "[]"));
              } catch {
                onChange(e.target.value);
              }
            } else {
              onChange(e.target.value);
            }
          }}
          rows={field.rows || 4}
          placeholder={field.placeholder}
          required={field.required}
          className={cn(inputClass, "resize-y min-h-[80px]")}
        />
      ) : field.type === "select" ? (
        <select
          value={asString(value)}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={cn(inputClass, "h-11")}
        >
          <option value="">Select…</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={
            field.type === "number"
              ? "number"
              : field.type === "email"
              ? "email"
              : field.type === "url"
              ? "url"
              : field.type === "date"
              ? "date"
              : field.type === "datetime"
              ? "datetime-local"
              : "text"
          }
          value={
            field.type === "datetime" && typeof value === "string"
              ? value.slice(0, 16)
              : asString(value)
          }
          onChange={(e) =>
            onChange(
              field.type === "number"
                ? e.target.value === ""
                  ? 0
                  : Number(e.target.value)
                : e.target.value
            )
          }
          placeholder={field.placeholder}
          required={field.required}
          className={cn(inputClass, "h-11")}
        />
      )}

      {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
      {field.type === "tags" && (
        <p className="text-xs text-muted-foreground">One item per line</p>
      )}
    </div>
  );
}
