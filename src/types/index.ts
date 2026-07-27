export type UserRole =
  | "member"
  | "volunteer"
  | "district_admin"
  | "regional_admin"
  | "admin"
  | "super_admin";

export type MembershipStatus = "pending" | "approved" | "rejected" | "suspended" | "active";

export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  photoURL?: string;
  role: UserRole;
  membershipNumber?: string;
  membershipStatus?: MembershipStatus;
  nationalId?: string;
  dateOfBirth?: string;
  gender?: Gender;
  district?: string;
  subCounty?: string;
  parish?: string;
  village?: string;
  occupation?: string;
  education?: string;
  skills?: string[];
  interests?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  volunteerHours?: number;
  badges?: string[];
  createdAt: string;
  updatedAt: string;
  twoFactorEnabled?: boolean;
}

export interface Program {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  icon: string;
  image: string;
  color: string;
  goals: string[];
  activities: string[];
  impact: string;
  beneficiaries: number;
  featured?: boolean;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: "planned" | "ongoing" | "completed" | "on_hold";
  progress: number;
  location: string;
  district: string;
  images: string[];
  videos?: string[];
  startDate: string;
  endDate?: string;
  budget?: number;
  impactStats: { label: string; value: string }[];
  volunteers?: string[];
  category: string;
}

export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: "physical" | "online" | "hybrid";
  status: "upcoming" | "ongoing" | "past" | "cancelled";
  startDate: string;
  endDate: string;
  location: string;
  district?: string;
  image: string;
  capacity: number;
  registered: number;
  price?: number;
  isFree: boolean;
  organizer: string;
  tags: string[];
  agenda?: { time: string; title: string }[];
}

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags: string[];
  author: {
    name: string;
    avatar?: string;
    role?: string;
  };
  publishedAt: string;
  featured?: boolean;
  views: number;
  likes: number;
  commentsCount: number;
}

export interface GalleryItem {
  id: string;
  title: string;
  type: "photo" | "video" | "drone";
  url: string;
  thumbnail: string;
  album: string;
  category: string;
  district?: string;
  date: string;
  caption?: string;
}

export interface Opportunity {
  id: string;
  slug: string;
  title: string;
  type: "job" | "scholarship" | "internship" | "competition" | "grant" | "training" | "volunteer";
  description: string;
  organization: string;
  location: string;
  deadline: string;
  requirements: string[];
  benefits?: string[];
  applicationUrl?: string;
  isActive: boolean;
  image?: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: "pdf" | "policy" | "training" | "video" | "form" | "other";
  fileUrl: string;
  fileSize?: string;
  category: string;
  downloads: number;
  publishedAt: string;
  thumbnail?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  district: string;
  quote: string;
  avatar?: string;
  rating: number;
}

export interface Partner {
  id: string;
  name: string;
  logo: string;
  website?: string;
  type: string;
}

export interface DistrictStats {
  name: string;
  region: string;
  members: number;
  projects: number;
  leaders: number;
  volunteers: number;
  events: number;
  lat: number;
  lng: number;
}

export interface Leader {
  id: string;
  name: string;
  position: string;
  region?: string;
  district?: string;
  photo: string;
  bio: string;
  level: "national" | "regional" | "district";
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  requirement: string;
}

export interface Donation {
  id: string;
  amount: number;
  currency: string;
  donorName?: string;
  isAnonymous: boolean;
  campaign?: string;
  message?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "event" | "system";
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: { id: string; name: string; avatar?: string };
  category: string;
  likes: number;
  replies: number;
  createdAt: string;
  tags: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
