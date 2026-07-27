"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { Badge } from "@/components/ui/badge";
import { useCmsDb } from "@/hooks/use-cms";
import type { Program, Project, Event, NewsArticle, Opportunity, Resource, Leader } from "@/types";
import type { DistrictStats } from "@/types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const { data: db } = useCmsDb();

  const results = useMemo(() => {
    if (!query.trim() || query.length < 2 || !db) return null;
    const q = query.toLowerCase();

    return {
      programs: ((db.programs as Program[]) || []).filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.shortDescription?.toLowerCase().includes(q)
      ),
      projects: ((db.projects as Project[]) || []).filter(
        (p) =>
          p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      ),
      events: ((db.events as Event[]) || []).filter(
        (e) =>
          e.title.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q)
      ),
      news: ((db.news as NewsArticle[]) || []).filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.excerpt?.toLowerCase().includes(q) ||
          a.tags?.some((t) => t.includes(q))
      ),
      opportunities: ((db.opportunities as Opportunity[]) || []).filter(
        (o) =>
          o.title.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q)
      ),
      resources: ((db.resources as Resource[]) || []).filter(
        (r) =>
          r.title.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q)
      ),
      districts: ((db.districts as DistrictStats[]) || []).filter(
        (d) =>
          d.name.toLowerCase().includes(q) || d.region?.toLowerCase().includes(q)
      ),
      leaders: ((db.leaders as Leader[]) || []).filter(
        (l) =>
          l.name.toLowerCase().includes(q) || l.position?.toLowerCase().includes(q)
      ),
    };
  }, [query, db]);

  const total = results
    ? Object.values(results).reduce((sum, arr) => sum + arr.length, 0)
    : 0;

  return (
    <>
      <PageHero
        badge="Search"
        title="Find Anything"
        description="Search programs, projects, events, news, resources, districts, and leaders — all live CMS data."
      />

      <section className="py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members, programs, projects, events, news..."
              className="w-full h-14 rounded-2xl border border-border bg-card pl-12 pr-4 text-base shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {results && (
            <div className="mt-8 space-y-8">
              <p className="text-sm text-muted-foreground">
                {total} result{total !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
              </p>

              {results.programs.length > 0 && (
                <ResultSection title="Programs">
                  {results.programs.map((p) => (
                    <ResultItem
                      key={p.id}
                      href={`/programs/${p.slug}`}
                      title={p.title}
                      desc={p.shortDescription}
                      type="Program"
                    />
                  ))}
                </ResultSection>
              )}
              {results.projects.length > 0 && (
                <ResultSection title="Projects">
                  {results.projects.map((p) => (
                    <ResultItem
                      key={p.id}
                      href={`/projects/${p.slug}`}
                      title={p.title}
                      desc={p.description}
                      type="Project"
                    />
                  ))}
                </ResultSection>
              )}
              {results.events.length > 0 && (
                <ResultSection title="Events">
                  {results.events.map((e) => (
                    <ResultItem
                      key={e.id}
                      href={`/events/${e.slug}`}
                      title={e.title}
                      desc={e.location}
                      type="Event"
                    />
                  ))}
                </ResultSection>
              )}
              {results.news.length > 0 && (
                <ResultSection title="News">
                  {results.news.map((a) => (
                    <ResultItem
                      key={a.id}
                      href={`/news/${a.slug}`}
                      title={a.title}
                      desc={a.excerpt}
                      type="News"
                    />
                  ))}
                </ResultSection>
              )}
              {results.opportunities.length > 0 && (
                <ResultSection title="Opportunities">
                  {results.opportunities.map((o) => (
                    <ResultItem
                      key={o.id}
                      href={`/opportunities/${o.slug}`}
                      title={o.title}
                      desc={o.organization}
                      type={o.type}
                    />
                  ))}
                </ResultSection>
              )}
              {results.resources.length > 0 && (
                <ResultSection title="Resources">
                  {results.resources.map((r) => (
                    <ResultItem
                      key={r.id}
                      href="/resources"
                      title={r.title}
                      desc={r.description}
                      type={r.type}
                    />
                  ))}
                </ResultSection>
              )}
              {results.districts.length > 0 && (
                <ResultSection title="Districts">
                  {results.districts.map((d) => (
                    <ResultItem
                      key={d.name}
                      href="/"
                      title={d.name}
                      desc={`${d.region} · ${d.members.toLocaleString()} members`}
                      type="District"
                    />
                  ))}
                </ResultSection>
              )}
              {results.leaders.length > 0 && (
                <ResultSection title="Leaders">
                  {results.leaders.map((l) => (
                    <ResultItem
                      key={l.id}
                      href="/about#leadership"
                      title={l.name}
                      desc={l.position}
                      type="Leader"
                    />
                  ))}
                </ResultSection>
              )}

              {total === 0 && (
                <p className="text-center text-muted-foreground py-12">
                  No results found. Try a different search term.
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ResultItem({
  href,
  title,
  desc,
  type,
}: {
  href: string;
  title: string;
  desc: string;
  type: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-xl border border-border/50 bg-card p-4 hover:border-emerald-500/30 hover:shadow-sm transition-all"
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{desc}</p>
      </div>
      <Badge variant="outline" className="shrink-0 capitalize text-[10px]">
        {type}
      </Badge>
    </Link>
  );
}
