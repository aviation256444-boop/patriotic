"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  CreditCard,
  Activity,
  Clock,
  Award,
  Calendar,
  Bell,
  MessageSquare,
  Trophy,
  Download,
  Settings,
  LogOut,
  Users,
  FolderKanban,
  Newspaper,
  Image,
  HandHelping,
  Mail,
  BarChart3,
  Shield,
  Database,
  Palette,
  Lock,
  FileText,
  Heart,
  Menu,
  X,
  Home,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/shared/brand-logo";

export type NavItem = { href: string; label: string; icon: React.ElementType };

export const memberNav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/membership", label: "Membership Card", icon: CreditCard },
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
  { href: "/dashboard/volunteer", label: "Volunteer Hours", icon: Clock },
  { href: "/dashboard/certificates", label: "Certificates", icon: Award },
  { href: "/dashboard/events", label: "My Events", icon: Calendar },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { href: "/dashboard/achievements", label: "Achievements", icon: Trophy },
  { href: "/dashboard/downloads", label: "Downloads", icon: Download },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Analytics", icon: BarChart3 },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/events", label: "Events", icon: Calendar },
  { href: "/admin/news", label: "News", icon: Newspaper },
  { href: "/admin/gallery", label: "Gallery", icon: Image },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/volunteers", label: "Volunteers", icon: HandHelping },
  { href: "/admin/donations", label: "Donations", icon: Heart },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/campaigns", label: "Email/SMS", icon: Mail },
  { href: "/admin/reports", label: "Reports", icon: FileText },
  { href: "/admin/audit", label: "Audit Logs", icon: Activity },
];

export const superAdminNav: NavItem[] = [
  { href: "/super-admin", label: "CMS Overview", icon: Shield },
  { href: "/super-admin/users", label: "User accounts", icon: Users },
  { href: "/super-admin/account", label: "My credentials", icon: KeyRound },
  { href: "/super-admin/admins", label: "Manage Admins", icon: Lock },
  { href: "/super-admin/content", label: "Website Content", icon: FileText },
  { href: "/super-admin/stats", label: "Statistics", icon: BarChart3 },
  { href: "/super-admin/programs", label: "Programs", icon: Trophy },
  { href: "/super-admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/super-admin/events", label: "Events", icon: Calendar },
  { href: "/super-admin/news", label: "News & Blog", icon: Newspaper },
  { href: "/super-admin/gallery", label: "Gallery", icon: Image },
  { href: "/super-admin/opportunities", label: "Opportunities", icon: Award },
  { href: "/super-admin/resources", label: "Resources", icon: Download },
  { href: "/super-admin/leaders", label: "Leadership", icon: Users },
  { href: "/super-admin/media", label: "Media Library", icon: Image },
  { href: "/super-admin/partners", label: "Partners", icon: Heart },
  { href: "/super-admin/testimonials", label: "Testimonials", icon: MessageSquare },
  { href: "/super-admin/districts", label: "Districts Map", icon: Home },
  { href: "/super-admin/coreValues", label: "Core Values", icon: Lock },
  { href: "/super-admin/history", label: "History", icon: Activity },
  { href: "/super-admin/strategicGoals", label: "Strategic Goals", icon: Trophy },
  { href: "/super-admin/members", label: "CMS Members", icon: Users },
  { href: "/super-admin/donations", label: "Donations", icon: Heart },
  { href: "/super-admin/backup", label: "Backup & Restore", icon: Database },
  { href: "/super-admin/settings", label: "System Settings", icon: Settings },
  { href: "/super-admin/theme", label: "Theme", icon: Palette },
  { href: "/super-admin/security", label: "Security", icon: Shield },
  { href: "/super-admin/api", label: "API Management", icon: Activity },
];

interface SidebarProps {
  nav: NavItem[];
  title: string;
  accent?: string;
}

export function DashboardSidebar({ nav, title }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const content = (
    <>
      <div className="p-4 border-b border-border/50">
        <div className="mb-3">
          <BrandLogo href="/" size="md" showText variant="crest" className="!bg-muted/60 !ring-border/40" />
        </div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {title}
        </p>
        {user && (
          <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-2.5">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 text-xs font-bold">
                {user.fullName[0]}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{user.fullName}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{user.role.replace("_", " ")}</p>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border/50 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <Home className="h-4 w-4" /> Back to Site
        </Link>
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-border/50 bg-card px-4 py-3">
        <span className="font-bold text-sm">{title}</span>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-64 flex flex-col border-r border-border/50 bg-card transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {content}
      </aside>
    </>
  );
}
