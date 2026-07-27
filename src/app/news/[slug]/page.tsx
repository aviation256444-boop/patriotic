"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Eye,
  Heart,
  MessageCircle,
  Link2,
} from "lucide-react";
import {
  FacebookIcon,
  TwitterIcon,
  LinkedinIcon,
} from "@/components/ui/social-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCmsCollection, findBySlug } from "@/hooks/use-cms";
import { formatDate, formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import type { NewsArticle } from "@/types";

export default function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data, isLoading } = useCmsCollection("news");
  const newsArticles = (data as NewsArticle[]) || [];
  const article = findBySlug(newsArticles, slug);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<
    { id: string; name: string; text: string; date: string }[]
  >([
    {
      id: "1",
      name: "James Okello",
      text: "Inspiring work! Proud to be part of this movement.",
      date: "2025-07-02",
    },
    {
      id: "2",
      name: "Mary Nabirye",
      text: "When can we register for the next event in Jinja?",
      date: "2025-07-03",
    },
  ]);

  if (isLoading) {
    return (
      <div className="pt-28 px-4 max-w-4xl mx-auto">
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!article) notFound();

  const related = newsArticles.filter((a) => a.id !== article.id).slice(0, 2);
  const displayLikes = likes || article.likes || 0;

  const share = (platform: string) => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (platform === "copy") {
      navigator.clipboard.writeText(url);
      toast.success("Link copied!");
      return;
    }
    toast.success(`Shared to ${platform}`);
  };

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setComments((c) => [
      {
        id: Date.now().toString(),
        name: "You",
        text: comment.trim(),
        date: new Date().toISOString().slice(0, 10),
      },
      ...c,
    ]);
    setComment("");
    toast.success("Comment posted!");
  };

  return (
    <>
      <article className="pt-28 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link href="/news" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to News
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Badge>{article.category}</Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(article.publishedAt)}
              </span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {formatNumber(article.views)} views
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
              {article.title}
            </h1>

            <div className="mt-6 flex items-center gap-3">
              {article.author.avatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={article.author.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
              )}
              <div>
                <p className="font-semibold text-sm">{article.author.name}</p>
                {article.author.role && (
                  <p className="text-xs text-muted-foreground">{article.author.role}</p>
                )}
              </div>
            </div>
          </motion.div>

          <div className="mt-8 rounded-2xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full h-64 sm:h-96 object-cover"
            />
          </div>

          <div className="mt-10 prose-pyu max-w-none">
            {article.content.split("\n").map((line, i) => {
              if (line.startsWith("## "))
                return <h2 key={i}>{line.replace("## ", "")}</h2>;
              if (line.startsWith("### "))
                return <h3 key={i}>{line.replace("### ", "")}</h3>;
              if (line.startsWith("> "))
                return <blockquote key={i}>{line.replace("> ", "")}</blockquote>;
              if (line.startsWith("- "))
                return (
                  <li key={i} className="ml-4 list-disc">
                    {line.replace("- ", "")}
                  </li>
                );
              if (line.startsWith("1. ") || line.startsWith("2. ") || line.startsWith("3. "))
                return (
                  <li key={i} className="ml-4 list-decimal">
                    {line.replace(/^\d+\.\s/, "")}
                  </li>
                );
              if (line.trim() === "") return null;
              if (line.startsWith("**") && line.endsWith("**"))
                return (
                  <p key={i} className="font-semibold text-foreground">
                    {line.replace(/\*\*/g, "")}
                  </p>
                );
              return <p key={i}>{line}</p>;
            })}
          </div>

          {/* Tags & Share */}
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border/50 pt-6">
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  #{tag}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={liked ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setLiked(!liked);
                  setLikes((l) => {
                    const base = l || article.likes || 0;
                    return liked ? base - 1 : base + 1;
                  });
                }}
              >
                <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                {formatNumber(displayLikes)}
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => share("Facebook")} aria-label="Share on Facebook">
                <FacebookIcon className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => share("X")} aria-label="Share on X">
                <TwitterIcon className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => share("LinkedIn")} aria-label="Share on LinkedIn">
                <LinkedinIcon className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => share("copy")} aria-label="Copy link">
                <Link2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Comments */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-emerald-500" />
              Comments ({comments.length})
            </h2>
            <form onSubmit={submitComment} className="mb-8 flex gap-3">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts..."
                className="flex-1 h-11 rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <Button type="submit">Post</Button>
            </form>
            <div className="space-y-4">
              {comments.map((c) => (
                <div key={c.id} className="rounded-xl border border-border/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.date}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold mb-6">Related Stories</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {related.map((a) => (
                  <Link key={a.id} href={`/news/${a.slug}`} className="group rounded-2xl border border-border/50 overflow-hidden hover:shadow-lg transition-all">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.coverImage} alt="" className="h-40 w-full object-cover" />
                    <div className="p-4">
                      <h3 className="font-bold group-hover:text-emerald-600 transition-colors line-clamp-2">{a.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
    </>
  );
}
