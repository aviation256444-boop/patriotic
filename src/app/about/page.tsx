"use client";

import { motion } from "framer-motion";
import {
  Target,
  Eye,
  History,
  Network,
  Goal,
  Shield,
  Users,
  HeartHandshake,
  Crown,
  Lightbulb,
  Trophy,
} from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSiteSettings,
  useCmsCollection,
} from "@/hooks/use-cms";
import { mediaUrl } from "@/lib/cms/media-url";
import type { Leader } from "@/types";
import type { CoreValue, HistoryItem, StrategicGoal } from "@/lib/cms/types";

const iconMap: Record<string, React.ElementType> = {
  Users,
  HeartHandshake,
  Crown,
  Shield,
  Lightbulb,
  Trophy,
};

export default function AboutPage() {
  const { data: site } = useSiteSettings();
  const { data: coreValues, isLoading: loadingValues } = useCmsCollection("coreValues");
  const { data: history, isLoading: loadingHistory } = useCmsCollection("history");
  const { data: leaders, isLoading: loadingLeaders, dataUpdatedAt: leadersUpdatedAt } =
    useCmsCollection("leaders");
  const { data: goals } = useCmsCollection("strategicGoals");

  const values = (coreValues as CoreValue[]) || [];
  const timeline = (history as HistoryItem[]) || [];
  const allLeaders = (leaders as Leader[]) || [];
  // Show national leaders on About; fall back to all leaders if none tagged national
  const nationalLeaders = (() => {
    const national = allLeaders.filter(
      (l) => !l.level || String(l.level).toLowerCase() === "national"
    );
    return national.length > 0 ? national : allLeaders;
  })();
  const strategicGoals = (goals as StrategicGoal[]) || [];

  return (
    <>
      <PageHero
        badge="About Us"
        title="Who We Are"
        description="The Patriotic Youths of Uganda is a national youth movement dedicated to building a prosperous, united, and patriotic generation of leaders."
      />

      <section id="vision" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-border/50 bg-card p-8 hover:shadow-lg transition-shadow"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 mb-4">
                <Eye className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Our Vision</h2>
              <p className="text-muted-foreground leading-relaxed">
                {site?.aboutVision ||
                  "A united, prosperous Uganda led by patriotic, skilled, and ethical young people."}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-border/50 bg-card p-8 hover:shadow-lg transition-shadow"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-600 mb-4">
                <Target className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                {site?.aboutMission ||
                  "To empower Ugandan youth through leadership development, patriotism training, skills building, and community service."}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="values" className="py-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Principles"
            title="Core Values"
            description="The pillars that guide every decision, program, and interaction."
          />
          {loadingValues ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-36 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {values.map((v, i) => {
                const Icon = iconMap[v.icon] || Shield;
                return (
                  <motion.div
                    key={v.id || v.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="rounded-2xl border border-border/50 bg-card p-6 hover:shadow-lg hover:border-emerald-500/20 transition-all"
                  >
                    <Icon className="h-8 w-8 text-emerald-500 mb-4" />
                    <h3 className="text-lg font-bold mb-2">{v.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section id="history" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Our Journey"
            title="History"
            description="From a vision shared by few to a movement of many."
          />
          {loadingHistory ? (
            <Skeleton className="h-96 max-w-3xl mx-auto" />
          ) : (
            <div className="relative max-w-3xl mx-auto">
              <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500 via-yellow-500 to-red-500 sm:-translate-x-px" />
              {timeline.map((item, i) => (
                <motion.div
                  key={item.id || item.year}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative flex items-start gap-6 mb-10 ${
                    i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
                  }`}
                >
                  <div
                    className={`flex-1 ${i % 2 === 0 ? "sm:text-right" : "sm:text-left"} pl-12 sm:pl-0`}
                  >
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {item.year}
                    </span>
                    <h3 className="text-lg font-bold mt-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                  <div className="absolute left-4 sm:left-1/2 sm:-translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 z-10">
                    <History className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 hidden sm:block" />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="structure" className="py-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Structure"
            title="Organizational Structure"
            description="A clear hierarchy ensuring accountability from national to village level."
          />
          <div className="flex flex-col items-center gap-4 max-w-2xl mx-auto">
            {[
              {
                level: "National Secretariat",
                desc: "Strategic direction, policy, and coordination",
                color: "from-emerald-600 to-emerald-500",
              },
              {
                level: "Regional Coordinators",
                desc: "4 regions: Central, Eastern, Northern, Western",
                color: "from-yellow-500 to-amber-500",
              },
              {
                level: "District Chapters",
                desc: "146 district leadership teams",
                color: "from-red-600 to-rose-500",
              },
              {
                level: "Sub-County / Parish Cells",
                desc: "Grassroots mobilization and service",
                color: "from-blue-600 to-cyan-500",
              },
            ].map((item, i) => (
              <motion.div
                key={item.level}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="w-full"
              >
                <div
                  className={`rounded-2xl bg-gradient-to-r ${item.color} p-5 text-white text-center shadow-lg`}
                >
                  <p className="font-bold text-lg">{item.level}</p>
                  <p className="text-sm opacity-90 mt-1">{item.desc}</p>
                </div>
                {i < 3 && (
                  <div className="flex justify-center py-2">
                    <Network className="h-5 w-5 text-muted-foreground rotate-90" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="leadership" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Leadership"
            title="National Leadership"
            description="Dedicated leaders guiding the movement with integrity and vision."
          />
          {loadingLeaders ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-80 rounded-2xl" />
              ))}
            </div>
          ) : nationalLeaders.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No leaders published yet. Add them in Super Admin → Leadership.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {nationalLeaders.map((leader, i) => {
                const version =
                  (leader as Leader & { updatedAt?: string }).updatedAt ||
                  leadersUpdatedAt ||
                  Date.now();
                return (
                  <motion.div
                    key={`${leader.id}-${version}`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="rounded-2xl border border-border/50 bg-card overflow-hidden hover:shadow-lg transition-all group"
                  >
                    <div className="relative h-56 overflow-hidden bg-muted">
                      {leader.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mediaUrl(leader.photo, version)}
                          alt={leader.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-4xl font-bold text-muted-foreground/40">
                          {leader.name?.slice(0, 1) || "?"}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-lg">{leader.name}</h3>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                        {leader.position}
                      </p>
                      {leader.bio && (
                        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                          {leader.bio}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Roadmap"
            title="Strategic Goals"
            description="Ambitious targets driving our work through 2030."
          />
          <div className="max-w-2xl mx-auto space-y-4">
            {strategicGoals.map((g, i) => (
              <motion.div
                key={g.id || g.year}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-5 hover:shadow-md transition-all"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 font-bold text-sm">
                  {g.year}
                </div>
                <div className="flex items-center gap-2">
                  <Goal className="h-4 w-4 text-yellow-500 shrink-0" />
                  <p className="font-medium">{g.title}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
