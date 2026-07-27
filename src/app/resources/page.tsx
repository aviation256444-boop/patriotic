"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Video, FormInput, BookOpen, Search } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCmsCollection } from "@/hooks/use-cms";
import { formatDate, formatNumber, cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Resource } from "@/types";

const typeIcons: Record<string, React.ElementType> = {
  pdf: FileText,
  policy: BookOpen,
  training: BookOpen,
  video: Video,
  form: FormInput,
  other: FileText,
};

export default function ResourcesPage() {
  const { data, isLoading } = useCmsCollection("resources");
  const resources = (data as Resource[]) || [];
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = ["All", ...new Set(resources.map((r) => r.category))];

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      const matchCat = category === "All" || r.category === category;
      const matchQ =
        !query ||
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.description.toLowerCase().includes(query.toLowerCase());
      return matchCat && matchQ;
    });
  }, [query, category, resources]);

  return (
    <>
      <PageHero
        badge="Resource Center"
        title="Knowledge Hub"
        description="PDFs, policy documents, training materials, videos, forms, and downloads."
      />

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search resources..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-11 rounded-xl border border-border bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-all",
                    category === c ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
              ))}
            </div>
          ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((resource, i) => {
              const Icon = typeIcons[resource.type] || FileText;
              return (
                <motion.div
                  key={resource.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (i % 6) * 0.05 }}
                  className="rounded-2xl border border-border/50 bg-card p-5 hover:shadow-lg hover:border-emerald-500/20 transition-all flex flex-col"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-sm leading-snug">{resource.title}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] capitalize">{resource.type}</Badge>
                        {resource.fileSize && (
                          <span className="text-[10px] text-muted-foreground">{resource.fileSize}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground flex-1 line-clamp-2">{resource.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {formatNumber(resource.downloads)} downloads · {formatDate(resource.publishedAt)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        toast.success("Download started", {
                          description: resource.title,
                        })
                      }
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
          )}
        </div>
      </section>
    </>
  );
}
