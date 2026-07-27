"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, ThumbsUp, MessageCircle, Plus } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { ForumPost } from "@/types";

const initialPosts: ForumPost[] = [
  {
    id: "1",
    title: "How to start a district climate club?",
    content: "Looking for guidance on launching a climate club in Wakiso. Any templates or tips?",
    author: { id: "1", name: "Faith Namukasa", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100" },
    category: "Climate Action",
    likes: 24,
    replies: 8,
    createdAt: "2025-07-10T10:00:00Z",
    tags: ["climate", "district"],
  },
  {
    id: "2",
    title: "ICT Bootcamp experiences — share yours!",
    content: "Just graduated from the Nakawa digital skills bootcamp. Would love to hear from others.",
    author: { id: "2", name: "Brian Ssempijja" },
    category: "ICT",
    likes: 45,
    replies: 15,
    createdAt: "2025-07-08T14:00:00Z",
    tags: ["ict", "training"],
  },
  {
    id: "3",
    title: "National Youth Summit 2025 — who is going?",
    content: "Excited for the summit! Let's coordinate district delegations.",
    author: { id: "3", name: "Grace Achieng" },
    category: "Events",
    likes: 89,
    replies: 32,
    createdAt: "2025-07-05T09:00:00Z",
    tags: ["summit", "events"],
  },
  {
    id: "4",
    title: "Scholarship application tips for STEM",
    content: "Compiling tips for Girls in STEM applicants. Drop your advice below.",
    author: { id: "4", name: "Sarah Tumusiime" },
    category: "Education",
    likes: 56,
    replies: 21,
    createdAt: "2025-07-01T11:00:00Z",
    tags: ["scholarship", "education"],
  },
];

export default function ForumPage() {
  const [posts, setPosts] = useState(initialPosts);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [liked, setLiked] = useState<Set<string>>(new Set());

  const createPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    const post: ForumPost = {
      id: Date.now().toString(),
      title: title.trim(),
      content: content.trim(),
      author: { id: "me", name: "You" },
      category: "General",
      likes: 0,
      replies: 0,
      createdAt: new Date().toISOString(),
      tags: [],
    };
    setPosts([post, ...posts]);
    setTitle("");
    setContent("");
    setShowNew(false);
    toast.success("Post created!");
  };

  const toggleLike = (id: string) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPosts((ps) =>
      ps.map((p) =>
        p.id === id
          ? { ...p, likes: liked.has(id) ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
  };

  return (
    <>
      <PageHero
        badge="Community"
        title="Discussion Forum"
        description="Connect with fellow members, share ideas, ask questions, and build community."
      >
        <Button onClick={() => setShowNew(!showNew)}>
          <Plus className="h-4 w-4" /> New Post
        </Button>
      </PageHero>

      <section className="py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-4">
          {showNew && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              onSubmit={createPost}
              className="rounded-2xl border border-border/50 bg-card p-6 space-y-4"
            >
              <Input label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} />
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Content</label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Publish</Button>
                <Button type="button" variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
              </div>
            </motion.form>
          )}

          {posts.map((post, i) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border/50 bg-card p-5 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{post.category}</Badge>
                <span className="text-xs text-muted-foreground">{formatDate(post.createdAt)}</span>
              </div>
              <h2 className="font-bold text-lg flex items-start gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                {post.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{post.content}</p>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">by {post.author.name}</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                      liked.has(post.id) ? "text-emerald-600" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" /> {post.likes}
                  </button>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageCircle className="h-3.5 w-3.5" /> {post.replies}
                  </span>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>
    </>
  );
}
