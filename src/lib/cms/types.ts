import type {
  Program,
  Project,
  Event,
  NewsArticle,
  GalleryItem,
  Opportunity,
  Resource,
  Leader,
  Partner,
  Testimonial,
  DistrictStats,
} from "@/types";

export type CollectionName =
  | "programs"
  | "projects"
  | "events"
  | "news"
  | "gallery"
  | "opportunities"
  | "resources"
  | "leaders"
  | "partners"
  | "testimonials"
  | "districts"
  | "coreValues"
  | "history"
  | "strategicGoals"
  | "members"
  | "donations"
  | "forumPosts"
  | "notifications"
  | "auditLogs";

export interface SiteSettings {
  orgName: string;
  tagline: string;
  heroHeadline: string;
  heroSubheadline: string;
  supportEmail: string;
  hotline: string;
  whatsapp: string;
  /** WhatsApp community/group invite link */
  whatsappGroup: string;
  whatsappGroupLabel: string;
  whatsappGroupDescription: string;
  address: string;
  facebook: string;
  twitter: string;
  instagram: string;
  linkedin: string;
  youtube: string;
  tiktok: string;
  logoUrl: string;
  heroImage: string;
  ogImage: string;
  maintenanceMode: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  ctaTitle: string;
  ctaDescription: string;
  aboutVision: string;
  aboutMission: string;
  mapDescription: string;
  footerAbout: string;
}

export interface NationalStats {
  members: number;
  districts: number;
  projects: number;
  volunteers: number;
  events: number;
  treesPlanted: number;
  scholarships: number;
  businesses: number;
}

export interface CoreValue {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface HistoryItem {
  id: string;
  year: string;
  title: string;
  desc: string;
}

export interface StrategicGoal {
  id: string;
  year: string;
  title: string;
}

export interface CmsMember {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  photoURL?: string;
  role: string;
  membershipNumber?: string;
  membershipStatus?: string;
  district?: string;
  subCounty?: string;
  parish?: string;
  village?: string;
  occupation?: string;
  education?: string;
  skills?: string[];
  interests?: string[];
  volunteerHours?: number;
  badges?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CmsDonation {
  id: string;
  amount: number;
  currency: string;
  donorName?: string;
  isAnonymous: boolean;
  campaign: string;
  message?: string;
  email?: string;
  phone?: string;
  createdAt: string;
  updatedAt?: string;
  status: "pending" | "completed" | "failed";
  /** momo_widget | momo_request_to_pay | manual */
  paymentMethod?: string;
  externalId?: string;
  momoReferenceId?: string | null;
  invoiceId?: string | null;
  paymentReference?: string | null;
  purpose?: string;
  demo?: boolean;
  meta?: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  user: string;
  action: string;
  collection?: string;
  itemId?: string;
  detail?: string;
  createdAt: string;
}

export interface CmsDatabase {
  site: SiteSettings;
  stats: NationalStats;
  programs: Program[];
  projects: Project[];
  events: Event[];
  news: NewsArticle[];
  gallery: GalleryItem[];
  opportunities: Opportunity[];
  resources: Resource[];
  leaders: Leader[];
  partners: Partner[];
  testimonials: Testimonial[];
  districts: DistrictStats[];
  coreValues: CoreValue[];
  history: HistoryItem[];
  strategicGoals: StrategicGoal[];
  members: CmsMember[];
  donations: CmsDonation[];
  forumPosts: Array<{
    id: string;
    title: string;
    content: string;
    author: { id: string; name: string; avatar?: string };
    category: string;
    likes: number;
    replies: number;
    createdAt: string;
    tags: string[];
  }>;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    createdAt: string;
    link?: string;
  }>;
  /** All uploaded images available site-wide */
  media: MediaItem[];
  auditLogs: AuditLog[];
  updatedAt: string;
}

export interface MediaItem {
  id: string;
  url: string;
  filename: string;
  size?: number;
  type?: string;
  alt?: string;
  createdAt: string;
  updatedAt?: string;
}

export const COLLECTION_LABELS: Record<keyof CmsDatabase, string> = {
  site: "Site Settings",
  stats: "National Statistics",
  programs: "Programs",
  projects: "Projects",
  events: "Events",
  news: "News & Blog",
  gallery: "Gallery",
  opportunities: "Opportunities",
  resources: "Resources",
  leaders: "Leadership",
  partners: "Partners",
  testimonials: "Testimonials",
  districts: "Districts",
  coreValues: "Core Values",
  history: "History Timeline",
  strategicGoals: "Strategic Goals",
  members: "Members",
  donations: "Donations",
  forumPosts: "Forum Posts",
  notifications: "Notifications",
  media: "Media Library",
  auditLogs: "Audit Logs",
  updatedAt: "Updated",
};

export type EditableCollection = Exclude<keyof CmsDatabase, "updatedAt" | "site" | "stats">;
