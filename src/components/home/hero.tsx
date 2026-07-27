"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Heart, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppGroupCTA } from "@/components/shared/whatsapp-group-cta";
import { useSiteSettings, useNationalStats } from "@/hooks/use-cms";
import { mediaUrl } from "@/lib/cms/media-url";
import { formatNumber } from "@/lib/utils";

export function Hero() {
  const { data: site } = useSiteSettings();
  const { data: stats } = useNationalStats();

  const headline =
    site?.heroHeadline ||
    "Building Uganda Through Unity, Service, Leadership & Development";
  const sub =
    site?.heroSubheadline ||
    "Join the movement shaping Uganda's future. Across all 146 districts, young patriots are leading change through service, innovation, and national pride.";
  const heroImage = mediaUrl(
    site?.heroImage ||
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80",
    // Bust cache when site settings change
    site?.heroImage
  );
  const members = stats?.members ?? 125480;
  const districts = stats?.districts ?? 146;
  const projects = stats?.projects ?? 342;
  const volunteers = stats?.volunteers ?? 28500;

  return (
    <section className="relative min-h-[100svh] flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-[#050505]" aria-hidden="true">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-emerald-600/30 blur-[120px] animate-float" />
          <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-yellow-500/20 blur-[100px] animate-float [animation-delay:2s]" />
          <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] rounded-full bg-red-600/15 blur-[80px] animate-float [animation-delay:4s]" />
        </div>
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 flag-stripe h-1" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-32 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur-sm mb-6"
            >
              <Sparkles className="h-4 w-4 text-yellow-400" />
              <span>Empowering {formatNumber(members)}+ Young Patriots</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-white leading-[1.1]"
            >
              {headline.includes("Unity") ? (
                <>
                  Building Uganda Through{" "}
                  <span className="bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-500 bg-clip-text text-transparent">
                    Unity, Service, Leadership
                  </span>{" "}
                  & Development
                </>
              ) : (
                <span className="bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-500 bg-clip-text text-transparent">
                  {headline}
                </span>
              )}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-lg text-white/60 max-w-xl leading-relaxed"
            >
              {sub}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link href="/membership">
                <Button size="lg" className="group">
                  Join Now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/programs">
                <Button size="lg" variant="glass" className="text-white border-white/20">
                  <Play className="h-4 w-4" />
                  Explore Programs
                </Button>
              </Link>
              <Link href="/donate">
                <Button size="lg" variant="secondary">
                  <Heart className="h-4 w-4" />
                  Donate
                </Button>
              </Link>
            </motion.div>

            <div className="mt-6">
              <WhatsAppGroupCTA variant="hero" />
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-10 flex items-center gap-6 text-sm text-white/50"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-[#050505] bg-gradient-to-br from-emerald-500 to-yellow-500"
                  />
                ))}
              </div>
              <p>
                <span className="text-white font-semibold">{formatNumber(volunteers)}+</span> active volunteers
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden lg:block relative"
          >
            <div className="relative aspect-square max-w-lg mx-auto">
              <div className="absolute inset-0 rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroImage}
                  alt="Young Ugandan leaders united"
                  className="h-full w-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-white font-semibold text-lg">Youth Leading Change</p>
                  <p className="text-white/60 text-sm mt-1">From Kampala to Karamoja</p>
                </div>
              </div>

              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -left-8 top-1/4 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-4 shadow-2xl"
              >
                <p className="text-2xl font-bold text-emerald-400">{districts}</p>
                <p className="text-xs text-white/60">Districts</p>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity }}
                className="absolute -right-4 bottom-1/3 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-4 shadow-2xl"
              >
                <p className="text-2xl font-bold text-yellow-400">{projects}</p>
                <p className="text-xs text-white/60">Projects</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
