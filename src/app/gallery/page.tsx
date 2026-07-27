"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Camera, Video, Plane } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { Skeleton } from "@/components/ui/skeleton";
import { useCmsCollection } from "@/hooks/use-cms";
import { cn, formatDate } from "@/lib/utils";
import type { GalleryItem } from "@/types";

const typeIcons = { photo: Camera, video: Video, drone: Plane };

export default function GalleryPage() {
  const { data, isLoading } = useCmsCollection("gallery");
  const galleryItems = (data as GalleryItem[]) || [];
  const [filter, setFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const categories = ["All", ...new Set(galleryItems.map((g) => g.category))];
  const types = ["All", "photo", "video", "drone"];

  const filtered = useMemo(() => {
    return galleryItems.filter((g) => {
      const matchCat = filter === "All" || g.category === filter;
      const matchType = typeFilter === "All" || g.type === typeFilter;
      return matchCat && matchType;
    });
  }, [filter, typeFilter, galleryItems]);

  const selected = galleryItems.find((g) => g.id === lightbox);

  return (
    <>
      <PageHero
        badge="Gallery"
        title="Moments of Impact"
        description="Photos, videos, albums, and drone footage capturing our work across Uganda."
      />

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-all",
                    filter === c ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex gap-2 sm:ml-auto">
              {types.map((t) => {
                const Icon = t === "All" ? Camera : typeIcons[t as keyof typeof typeIcons];
                return (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={cn(
                      "rounded-full px-3 py-2 text-sm font-medium capitalize flex items-center gap-1.5 transition-all",
                      typeFilter === t ? "bg-yellow-500 text-black" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {filtered.map((item, i) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 9) * 0.05 }}
                onClick={() => setLightbox(item.id)}
                className="block w-full break-inside-avoid rounded-2xl overflow-hidden border border-border/50 group relative"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <p className="text-white font-semibold text-sm text-left">{item.title}</p>
                  <p className="text-white/60 text-xs text-left">{item.album} · {item.district}</p>
                </div>
                {item.type !== "photo" && (
                  <div className="absolute top-3 right-3 rounded-full bg-black/50 p-2 backdrop-blur-sm">
                    {item.type === "video" || item.type === "drone" ? (
                      <Play className="h-4 w-4 text-white" />
                    ) : null}
                  </div>
                )}
              </motion.button>
            ))}
          </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setLightbox(null)}
          >
            <button
              className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              onClick={() => setLightbox(null)}
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.url}
                alt={selected.title}
                className="w-full max-h-[80vh] object-contain rounded-2xl"
              />
              <div className="mt-4 text-center text-white">
                <p className="font-bold text-lg">{selected.title}</p>
                <p className="text-sm text-white/60">
                  {selected.album} · {selected.district} · {formatDate(selected.date)}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
