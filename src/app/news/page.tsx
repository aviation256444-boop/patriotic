"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Eye, Search, Heart, MessageCircle } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCmsCollection } from "@/hooks/use-cms";
import { formatDate, formatNumber } from "@/lib/utils";
import type { NewsArticle } from "@/types";

export default function NewsPage() {
  const { data, isLoading } = useCmsCollection("news");
  const newsArticles = (data as NewsArticle[]) || [];
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = ["All", ...new Set(newsArticles.map((a) => a.category))];

  const filtered = useMemo(() => {
    return newsArticles.filter((a) => {
      const matchCat = category === "All" || a.category === category;
      const matchQ =
        !query ||
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.excerpt.toLowerCase().includes(query.toLowerCase()) ||
        a.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()));
      return matchCat && matchQ;
    });
  }, [query, category, newsArticles]);

  return (
    <>
      <PageHero
        badge="News & Blog"
        title="Stories That Inspire"
        description="News, impact stories, announcements, and insights from across the movement."
      />

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search articles, tags..."
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
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    category === c
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-80 rounded-2xl" />
              ))}
            </div>
          ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((article, i) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 6) * 0.08 }}
              >
                <Link href={`/news/${article.slug}`} className="group block h-full">
                  <article className="h-full rounded-2xl border border-border/50 bg-card overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="relative h-48 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={article.coverImage}
                        alt={article.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      {article.featured && (
                        <Badge className="absolute top-3 left-3" variant="secondary">
                          Featured
                        </Badge>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline">{article.category}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(article.publishedAt)}
                        </span>
                      </div>
                      <h2 className="font-bold leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                        {article.title}
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {formatNumber(article.views)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" /> {formatNumber(article.likes)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" /> {article.commentsCount}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {article.tags.map((tag) => (
                          <span key={tag} className="text-[10px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                </Link>
              </motion.div>
            ))}
          </div>
          )}
        </div>
      </section>
    </>
  );
}
