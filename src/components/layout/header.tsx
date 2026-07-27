"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  ChevronDown,
  Search,
  User,
  LogOut,
  LayoutDashboard,
  Shield,
  Heart,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/social-icons";
import { BrandLogo } from "@/components/shared/brand-logo";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useSiteSettings } from "@/hooks/use-cms";
import { getWhatsAppGroupUrl } from "@/lib/whatsapp";

const navLinks = [
  { href: "/", label: "Home" },
  {
    href: "/about",
    label: "About",
    children: [
      { href: "/about#vision", label: "Vision & Mission" },
      { href: "/about#values", label: "Core Values" },
      { href: "/about#history", label: "History" },
      { href: "/about#leadership", label: "Leadership" },
      { href: "/about#structure", label: "Structure" },
    ],
  },
  {
    href: "/programs",
    label: "Programs",
    children: [
      { href: "/programs/leadership-development", label: "Leadership" },
      { href: "/programs/patriotism-training", label: "Patriotism" },
      { href: "/programs/entrepreneurship", label: "Entrepreneurship" },
      { href: "/programs/ict-digital-skills", label: "ICT & Digital Skills" },
      { href: "/programs", label: "All Programs →" },
    ],
  },
  { href: "/projects", label: "Projects" },
  { href: "/events", label: "Events" },
  { href: "/news", label: "News" },
  {
    href: "#",
    label: "More",
    children: [
      { href: "/gallery", label: "Gallery" },
      { href: "/volunteer", label: "Volunteer" },
      { href: "/opportunities", label: "Opportunities" },
      { href: "/resources", label: "Resources" },
      { href: "/membership", label: "Membership" },
      { href: "/forum", label: "Forum" },
      { href: "/donate", label: "Donate" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout, isAdmin, isSuperAdmin } = useAuthStore();
  const { data: site } = useSiteSettings();
  const whatsappGroupUrl = getWhatsAppGroupUrl(site);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setOpenDropdown(null);
  }, [pathname]);

  const isDashboard = pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname.startsWith("/super-admin");
  if (isDashboard) return null;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "glass-strong shadow-lg shadow-black/10 py-2.5"
          : "bg-black/20 backdrop-blur-md py-3 sm:bg-transparent sm:backdrop-blur-none sm:py-4"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Crest sits in a circular cutout — feels built into the nav chrome */}
        <BrandLogo href="/" size="md" showText variant="crest" className="shrink-0" />

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
          {navLinks.map((link) => (
            <div
              key={link.label}
              className="relative"
              onMouseEnter={() => link.children && setOpenDropdown(link.label)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <Link
                href={link.href}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href) && link.href !== "#")
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                )}
              >
                {link.label}
                {link.children && <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
              </Link>

              <AnimatePresence>
                {link.children && openDropdown === link.label && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-1 w-56 rounded-2xl border border-border/50 bg-card p-2 shadow-xl shadow-black/10"
                  >
                    {link.children.map((child) => (
                      <Link
                        key={child.href + child.label}
                        href={child.href}
                        className="block rounded-xl px-3 py-2.5 text-sm text-foreground/80 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link href="/search" aria-label="Search">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Search className="h-5 w-5" />
            </Button>
          </Link>
          <ThemeToggle />

          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-full border border-border/50 p-1 pr-3 hover:bg-muted/50 transition-colors"
                aria-label="User menu"
              >
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600">
                    <User className="h-4 w-4" />
                  </div>
                )}
                <span className="hidden sm:block text-sm font-medium max-w-[100px] truncate">
                  {user.fullName.split(" ")[0]}
                </span>
              </button>
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border/50 bg-card p-2 shadow-xl z-50"
                  >
                    <div className="px-3 py-2 border-b border-border/50 mb-1">
                      <p className="text-sm font-semibold truncate">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                    >
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    {isAdmin() && (
                      <Link
                        href="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                      >
                        <Shield className="h-4 w-4" /> Admin
                      </Link>
                    )}
                    {isSuperAdmin() && (
                      <Link
                        href="/super-admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                      >
                        <Shield className="h-4 w-4 text-red-500" /> Super Admin
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <Link href="/auth/login" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/membership">
                <Button size="sm" className="hidden xs:inline-flex sm:inline-flex">
                  Join Now
                </Button>
              </Link>
            </>
          )}

          <a
            href={whatsappGroupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex"
          >
            <Button
              size="sm"
              className="bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md shadow-[#25D366]/30 border-0"
            >
              <WhatsAppIcon className="h-4 w-4" /> Join Group
            </Button>
          </a>

          <Link href="/donate" className="hidden lg:block">
            <Button variant="secondary" size="sm">
              <Heart className="h-4 w-4" /> Donate
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden rounded-full"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-border/50 glass-strong overflow-hidden"
          >
            <nav className="mx-auto max-w-7xl px-4 py-4 space-y-1 max-h-[70vh] overflow-y-auto" aria-label="Mobile navigation">
              {navLinks.map((link) => (
                <div key={link.label}>
                  <Link
                    href={link.href === "#" ? link.children?.[0]?.href || "/" : link.href}
                    className={cn(
                      "block rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                      pathname === link.href
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "hover:bg-muted"
                    )}
                  >
                    {link.label}
                  </Link>
                  {link.children && (
                    <div className="ml-4 space-y-0.5 border-l border-border/50 pl-3">
                      {link.children.map((child) => (
                        <Link
                          key={child.href + child.label}
                          href={child.href}
                          className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="pt-3 flex flex-col gap-2 border-t border-border/50">
                <a href={whatsappGroupUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white border-0">
                    <WhatsAppIcon className="h-4 w-4" /> Join WhatsApp Group
                  </Button>
                </a>
                {!user && (
                  <>
                    <Link href="/auth/login">
                      <Button variant="outline" className="w-full">Sign In</Button>
                    </Link>
                    <Link href="/membership">
                      <Button className="w-full">Join Now</Button>
                    </Link>
                  </>
                )}
                <Link href="/donate">
                  <Button variant="secondary" className="w-full">
                    <Heart className="h-4 w-4" /> Donate
                  </Button>
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
