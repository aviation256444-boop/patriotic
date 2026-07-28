"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, X, Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldRenderer } from "./field-renderer";
import { getSchema, type CollectionSchema } from "@/lib/cms/schemas";
import {
  useCmsCollection,
  useUpsertItem,
  useDeleteItem,
} from "@/hooks/use-cms";
import { slugify } from "@/lib/utils";
import { normalizeEventPayload } from "@/lib/events/pricing";
import { toast } from "sonner";

interface CollectionManagerProps {
  collectionKey: string;
  schema?: CollectionSchema;
}

export function CollectionManager({ collectionKey, schema: schemaProp }: CollectionManagerProps) {
  const schema = schemaProp || getSchema(collectionKey);
  const { data, isLoading, error } = useCmsCollection(collectionKey as "programs");
  const upsert = useUpsertItem(collectionKey);
  const remove = useDeleteItem(collectionKey);

  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [isNew, setIsNew] = useState(false);

  const items = useMemo(() => {
    const list = Array.isArray(data)
      ? (data as unknown as Record<string, unknown>[])
      : [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(q)
    );
  }, [data, query]);

  if (!schema) {
    return <p className="text-muted-foreground">Unknown collection: {collectionKey}</p>;
  }

  const titleField = schema.titleField;

  const openNew = () => {
    const defaults: Record<string, unknown> = {
      id: `${Date.now()}`,
      ...(schema.defaults || {}),
    };
    setEditing(defaults);
    setIsNew(true);
  };

  const openEdit = (item: Record<string, unknown>) => {
    // Flatten news author for form
    const form = { ...item };
    if (collectionKey === "news" && item.author && typeof item.author === "object") {
      const author = item.author as { name?: string; role?: string; avatar?: string };
      form.authorName = author.name || "";
      form.authorRole = author.role || "";
      form.authorAvatar = author.avatar || "";
    }
    setEditing(form);
    setIsNew(false);
  };

  const save = async () => {
    if (!editing) return;
    try {
      const payload = { ...editing };

      // Auto slug from title
      if (!payload.slug && payload.title) {
        payload.slug = slugify(String(payload.title));
      }
      if (!payload.slug && payload.name) {
        payload.slug = slugify(String(payload.name));
      }

      // Rebuild news author
      if (collectionKey === "news") {
        payload.author = {
          name: payload.authorName || "PYU Team",
          role: payload.authorRole || "",
          avatar: payload.authorAvatar || undefined,
        };
        delete payload.authorName;
        delete payload.authorRole;
        delete payload.authorAvatar;
      }

      // Gallery: default thumbnail to url
      if (collectionKey === "gallery" && !payload.thumbnail && payload.url) {
        payload.thumbnail = payload.url;
      }

      // Projects: ensure images is array of clean paths
      if (collectionKey === "projects") {
        if (typeof payload.images === "string") {
          payload.images = String(payload.images)
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
        }
        if (Array.isArray(payload.images)) {
          payload.images = (payload.images as string[]).map((u) =>
            String(u).split("?")[0]
          );
        } else {
          payload.images = [];
        }
        if (typeof payload.impactStats === "string") {
          try {
            payload.impactStats = JSON.parse(payload.impactStats as string);
          } catch {
            payload.impactStats = [];
          }
        }
      }

      // Normalize image fields: strip cache-buster query — keep data: URLs intact
      for (const key of [
        "photo",
        "image",
        "coverImage",
        "url",
        "thumbnail",
        "logo",
        "avatar",
        "photoURL",
      ]) {
        if (typeof payload[key] === "string" && payload[key]) {
          const s = String(payload[key]);
          if (!s.startsWith("data:")) {
            payload[key] = s.split("?")[0];
          }
        }
      }

      // Leaders must have a level so they appear on the public About page
      if (collectionKey === "leaders" && !payload.level) {
        payload.level = "national";
      }

      // Events: price > 0 ⇒ paid (payment options on public page)
      if (collectionKey === "events") {
        Object.assign(payload, normalizeEventPayload(payload));
        if (!payload.image) {
          toast.error("Add a cover image so the event looks complete on the site");
          return;
        }
        if (!payload.slug) {
          toast.error("URL slug is required");
          return;
        }
      }

      await upsert.mutateAsync(payload);
      toast.success(isNew ? "Created — live on the website now" : "Saved — live on the website now", {
        description:
          collectionKey === "leaders"
            ? "Open About → Leadership to see changes. Use Ctrl+Shift+R if the old image is cached."
            : "Public pages refresh automatically.",
      });
      setEditing(null);
      setIsNew(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item permanently?")) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Deleted");
      if (editing && String(editing.id) === id) {
        setEditing(null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  if (editing) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setEditing(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold">
                {isNew ? `New ${schema.label.slice(0, -1) || schema.label}` : "Edit Item"}
              </h2>
              <p className="text-sm text-muted-foreground">{schema.label}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} loading={upsert.isPending}>
              <Save className="h-4 w-4" /> Save
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
          {schema.fields.map((field) => (
            <FieldRenderer
              key={field.key}
              field={field}
              value={editing[field.key]}
              onChange={(v) =>
                setEditing((prev) => {
                  if (!prev) return prev;
                  const next: Record<string, unknown> = { ...prev, [field.key]: v };
                  // Live pricing UX for events
                  if (collectionKey === "events") {
                    if (field.key === "price" && Number(v) > 0) {
                      next.isFree = false;
                    }
                    if (field.key === "isFree" && v === true) {
                      next.price = 0;
                    }
                    if (field.key === "title" && isNew && !String(prev.slug || "").trim()) {
                      next.slug = slugify(String(v || ""));
                    }
                  }
                  return next;
                })
              }
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{schema.label}</h1>
          <p className="text-sm text-muted-foreground mt-1">{schema.description}</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Add New
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${schema.label.toLowerCase()}…`}
          className="w-full h-11 rounded-xl border border-border bg-background pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600">
          Failed to load data. Is the server running?
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">No items yet.</p>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Create first item
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const id = String(item.id || item.name || "");
          const title = String(item[titleField] || item.title || item.name || "Untitled");
          let image: string | undefined;
          if (schema.imageField) {
            const raw = item[schema.imageField];
            if (typeof raw === "string") image = raw;
            else if (Array.isArray(raw) && typeof raw[0] === "string") image = raw[0];
          }

          return (
            <div
              key={id}
              className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-4 hover:border-emerald-500/20 transition-colors"
            >
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" className="h-14 w-14 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-muted shrink-0 flex items-center justify-center text-xs font-bold text-muted-foreground">
                  {title.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{title}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {item.slug != null && item.slug !== "" && (
                    <Badge variant="outline" className="text-[10px]">
                      /{String(item.slug)}
                    </Badge>
                  )}
                  {collectionKey === "events" && (
                    <Badge
                      variant={Number(item.price) > 0 ? "secondary" : "success"}
                      className="text-[10px]"
                    >
                      {Number(item.price) > 0
                        ? `UGX ${Number(item.price).toLocaleString()} / seat`
                        : "Free"}
                    </Badge>
                  )}
                  {item.status != null && item.status !== "" && (
                    <Badge variant="info" className="text-[10px] capitalize">
                      {String(item.status)}
                    </Badge>
                  )}
                  {item.category != null && item.category !== "" && (
                    <Badge variant="outline" className="text-[10px]">
                      {String(item.category)}
                    </Badge>
                  )}
                  {item.featured === true && (
                    <Badge variant="secondary" className="text-[10px]">
                      Featured
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(id)}
                  loading={remove.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {items.length} item{items.length !== 1 ? "s" : ""} · Changes appear on the public site immediately
      </p>
    </div>
  );
}
