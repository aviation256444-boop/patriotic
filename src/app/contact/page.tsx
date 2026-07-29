"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Send } from "lucide-react";
import {
  FacebookIcon,
  TwitterIcon,
  InstagramIcon,
  LinkedinIcon,
  YoutubeIcon,
  WhatsAppIcon,
} from "@/components/ui/social-icons";
import { PageHero } from "@/components/shared/page-hero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import { useSiteSettings } from "@/hooks/use-cms";
import { WhatsAppGroupCTA } from "@/components/shared/whatsapp-group-cta";
import { LocationMap } from "@/components/maps/location-map";
import {
  DEFAULT_WHATSAPP_GROUP_LABEL,
  getWhatsAppGroupUrl,
} from "@/lib/whatsapp";
import { PYU_HQ, googleMapsUrl } from "@/lib/maps/coords";

export default function ContactPage() {
  const { data: site } = useSiteSettings();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const whatsappGroupUrl = getWhatsAppGroupUrl(site);

  const contactInfo = [
    {
      icon: MapPin,
      label: "Address",
      value: site?.address || "Plot 1, Parliamentary Avenue, Kampala, Uganda",
    },
    {
      icon: Phone,
      label: "Hotline",
      value: site?.hotline || "+256 700 000 000",
      href: `tel:${(site?.hotline || "+256700000000").replace(/\s/g, "")}`,
    },
    {
      icon: Mail,
      label: "Email",
      value: site?.supportEmail || "info@pyu.ug",
      href: `mailto:${site?.supportEmail || "info@pyu.ug"}`,
    },
    {
      icon: WhatsAppIcon,
      label: "WhatsApp Group",
      value: site?.whatsappGroupLabel || DEFAULT_WHATSAPP_GROUP_LABEL,
      href: whatsappGroupUrl,
    },
  ];

  const socials = [
    { icon: FacebookIcon, label: "Facebook", href: site?.facebook || "https://facebook.com", color: "hover:text-blue-600" },
    { icon: TwitterIcon, label: "X (Twitter)", href: site?.twitter || "https://x.com", color: "hover:text-sky-500" },
    { icon: InstagramIcon, label: "Instagram", href: site?.instagram || "https://instagram.com", color: "hover:text-pink-500" },
    { icon: LinkedinIcon, label: "LinkedIn", href: site?.linkedin || "https://linkedin.com", color: "hover:text-blue-700" },
    { icon: YoutubeIcon, label: "YouTube / TikTok", href: site?.youtube || "https://youtube.com", color: "hover:text-red-600" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    toast.success("Message sent!", {
      description: "We'll get back to you within 24–48 hours.",
    });
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <>
      <PageHero
        badge="Contact"
        title="Get in Touch"
        description="We're here to help. Join our WhatsApp group first for instant updates, or reach us via form, phone, email, and social media."
      >
        <WhatsAppGroupCTA variant="inline" />
      </PageHero>

      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <WhatsAppGroupCTA variant="card" />
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-10">
            {/* Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-4">
                {contactInfo.map((item) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="flex items-start gap-4 rounded-2xl border border-border/50 bg-card p-4 hover:border-emerald-500/20 transition-colors"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{item.label}</p>
                      {item.href ? (
                        <a href={item.href} className="font-medium hover:text-emerald-600 transition-colors" target={item.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                          {item.value}
                        </a>
                      ) : (
                        <p className="font-medium">{item.value}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div>
                <p className="text-sm font-semibold mb-3">Follow Us</p>
                <div className="flex flex-wrap gap-2">
                  {socials.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border border-border/50 text-muted-foreground transition-all hover:border-emerald-500/30 ${s.color}`}
                    >
                      <s.icon className="h-5 w-5" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Real HQ map */}
              <div className="space-y-2">
                <LocationMap
                  height={240}
                  center={[PYU_HQ.lat, PYU_HQ.lng]}
                  zoom={15}
                  scrollWheelZoom={false}
                  markers={[
                    {
                      id: "hq",
                      lat: PYU_HQ.lat,
                      lng: PYU_HQ.lng,
                      title: "PYU Headquarters",
                      description:
                        site?.address ||
                        "Plot 1, Parliamentary Avenue, Kampala, Uganda",
                    },
                  ]}
                />
                <a
                  href={googleMapsUrl(
                    PYU_HQ.lat,
                    PYU_HQ.lng,
                    site?.address || PYU_HQ.query
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex text-xs font-semibold text-emerald-600 hover:underline"
                >
                  Open HQ in Google Maps →
                </a>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-3">
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-border/50 bg-card p-6 sm:p-8 space-y-4"
              >
                <h2 className="text-xl font-bold mb-2">Send a Message</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <Input
                    label="Email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <Input
                  label="Subject"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/80">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="flex w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                    placeholder="How can we help you?"
                  />
                </div>
                <Button type="submit" size="lg" loading={loading} className="w-full sm:w-auto">
                  <Send className="h-4 w-4" /> Send Message
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
