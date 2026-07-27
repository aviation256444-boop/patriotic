"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  HandHelping,
  Clock,
  Award,
  Download,
  Trophy,
  CheckCircle2,
} from "lucide-react";
import { PageHero } from "@/components/shared/page-hero";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { badges } from "@/lib/data/stats";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";

const leaderboard = [
  { rank: 1, name: "Grace Achieng", district: "Gulu", hours: 320 },
  { rank: 2, name: "Brian Ssempijja", district: "Kampala", hours: 285 },
  { rank: 3, name: "Faith Namukasa", district: "Mbale", hours: 260 },
  { rank: 4, name: "Joseph Okot", district: "Arua", hours: 210 },
  { rank: 5, name: "Amina Nakato", district: "Kampala", hours: 48 },
];

export default function VolunteerPage() {
  const { user } = useAuthStore();
  const [form, setForm] = useState({
    name: user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    district: user?.district || "",
    skills: "",
    availability: "",
  });

  const hours = user?.volunteerHours ?? 0;
  const nextBadge = badges.find((b) => {
    if (b.id === "volunteer-10") return hours < 10;
    if (b.id === "volunteer-50") return hours < 50;
    if (b.id === "volunteer-100") return hours < 100;
    return false;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Volunteer registration submitted!", {
      description: "We'll contact you with opportunities matching your skills.",
    });
  };

  return (
    <>
      <PageHero
        badge="Volunteer Portal"
        title="Serve. Grow. Inspire."
        description="Register as a volunteer, track your hours, earn digital badges, and download certificates of service."
      >
        <div className="flex flex-wrap gap-3">
          <a href="#register">
            <Button size="lg">
              <HandHelping className="h-4 w-4" /> Register as Volunteer
            </Button>
          </a>
          <a href="#leaderboard">
            <Button size="lg" variant="outline">
              <Trophy className="h-4 w-4" /> Leaderboard
            </Button>
          </a>
        </div>
      </PageHero>

      {/* Stats for logged-in users */}
      {user && (
        <section className="py-12 -mt-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-border/50 bg-card p-6 text-center">
                <Clock className="h-6 w-6 mx-auto text-emerald-500 mb-2" />
                <p className="text-3xl font-bold">{hours}</p>
                <p className="text-sm text-muted-foreground">Volunteer Hours</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-card p-6 text-center">
                <Award className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
                <p className="text-3xl font-bold">{user.badges?.length ?? 0}</p>
                <p className="text-sm text-muted-foreground">Badges Earned</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-card p-6">
                {nextBadge ? (
                  <>
                    <p className="text-sm font-medium mb-2">Next: {nextBadge.name}</p>
                    <Progress
                      value={
                        nextBadge.id === "volunteer-10"
                          ? (hours / 10) * 100
                          : nextBadge.id === "volunteer-50"
                          ? (hours / 50) * 100
                          : (hours / 100) * 100
                      }
                      showLabel
                    />
                  </>
                ) : (
                  <p className="text-sm text-center text-muted-foreground py-4">
                    All hour badges earned! 🎉
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Badges */}
      <section className="py-16 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading badge="Recognition" title="Digital Badges" description="Earn badges as you serve and grow with the movement." />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {badges.map((b, i) => {
              const earned = user?.badges?.includes(b.id);
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-2xl border p-5 text-center transition-all ${
                    earned
                      ? "border-emerald-500/30 bg-emerald-500/5 shadow-sm"
                      : "border-border/50 bg-card opacity-60"
                  }`}
                >
                  <div className={`mx-auto h-12 w-12 rounded-full ${b.color} flex items-center justify-center mb-3`}>
                    <Award className="h-6 w-6 text-white" />
                  </div>
                  <p className="font-bold text-sm">{b.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{b.description}</p>
                  {earned && (
                    <Badge variant="success" className="mt-2">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Earned
                    </Badge>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Register */}
      <section id="register" className="py-16">
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
          <SectionHeading badge="Join Us" title="Volunteer Registration" />
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border/50 bg-card p-6 sm:p-8">
            <Input label="Full Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="District" required value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
            <Input label="Skills" placeholder="e.g. Teaching, First Aid, Coding" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
            <Input label="Availability" placeholder="e.g. Weekends, Evenings" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} />
            <Button type="submit" className="w-full" size="lg">
              <HandHelping className="h-4 w-4" /> Submit Registration
            </Button>
          </form>
        </div>
      </section>

      {/* Leaderboard */}
      <section id="leaderboard" className="py-16 bg-muted/30">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <SectionHeading badge="Top Volunteers" title="Achievement Leaderboard" />
          <div className="space-y-3">
            {leaderboard.map((entry, i) => (
              <motion.div
                key={entry.rank}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-4 rounded-2xl border p-4 ${
                  entry.rank <= 3
                    ? "border-yellow-500/30 bg-yellow-500/5"
                    : "border-border/50 bg-card"
                }`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm ${
                    entry.rank === 1
                      ? "bg-yellow-400 text-black"
                      : entry.rank === 2
                      ? "bg-gray-300 text-black"
                      : entry.rank === 3
                      ? "bg-amber-700 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {entry.rank}
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{entry.name}</p>
                  <p className="text-xs text-muted-foreground">{entry.district}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600">{entry.hours}h</p>
                  <p className="text-[10px] text-muted-foreground">hours</p>
                </div>
              </motion.div>
            ))}
          </div>

          {user && (
            <div className="mt-8 text-center">
              <Button
                variant="outline"
                onClick={() =>
                  toast.success("Certificate ready!", {
                    description: "Your volunteer certificate PDF would download here.",
                  })
                }
              >
                <Download className="h-4 w-4" /> Download Certificate
              </Button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
