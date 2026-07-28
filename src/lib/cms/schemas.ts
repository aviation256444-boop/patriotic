export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "url"
  | "email"
  | "date"
  | "datetime"
  | "select"
  | "checkbox"
  | "image"
  | "images"
  | "tags"
  | "json";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
  rows?: number;
}

export interface CollectionSchema {
  key: string;
  label: string;
  description: string;
  titleField: string;
  imageField?: string;
  fields: FieldDef[];
  defaults?: Record<string, unknown>;
}

export const collectionSchemas: CollectionSchema[] = [
  {
    key: "programs",
    label: "Programs",
    description: "All youth empowerment programs shown on the website.",
    titleField: "title",
    imageField: "image",
    defaults: {
      featured: false,
      beneficiaries: 0,
      goals: [],
      activities: [],
      color: "from-emerald-500 to-green-600",
      icon: "Crown",
    },
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "slug", label: "URL Slug", type: "text", required: true, help: "e.g. leadership-development" },
      { key: "shortDescription", label: "Short Description", type: "textarea", required: true, rows: 2 },
      { key: "description", label: "Full Description", type: "textarea", required: true, rows: 5 },
      { key: "image", label: "Cover Image", type: "image", required: true },
      { key: "icon", label: "Icon Name", type: "text", placeholder: "Crown" },
      { key: "color", label: "Gradient Class", type: "text", placeholder: "from-emerald-500 to-green-600" },
      { key: "impact", label: "Impact Summary", type: "textarea", rows: 2 },
      { key: "beneficiaries", label: "Beneficiaries Count", type: "number" },
      { key: "goals", label: "Goals (one per line)", type: "tags" },
      { key: "activities", label: "Activities (one per line)", type: "tags" },
      { key: "featured", label: "Featured on Homepage", type: "checkbox" },
    ],
  },
  {
    key: "projects",
    label: "Projects",
    description: "Completed and ongoing projects across Uganda.",
    titleField: "title",
    imageField: "images",
    defaults: {
      status: "ongoing",
      progress: 0,
      images: [],
      impactStats: [],
    },
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "slug", label: "URL slug", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea", required: true, rows: 4 },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "planned", label: "Planned" },
          { value: "ongoing", label: "Ongoing" },
          { value: "completed", label: "Completed" },
          { value: "on_hold", label: "On Hold" },
        ],
      },
      { key: "progress", label: "Progress %", type: "number" },
      { key: "location", label: "Location", type: "text" },
      { key: "district", label: "District", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "startDate", label: "Start Date", type: "date" },
      { key: "endDate", label: "End Date", type: "date" },
      {
        key: "images",
        label: "Gallery Images",
        type: "images",
        help: "Upload images directly — no links needed. They show on the project page.",
      },
      {
        key: "impactStats",
        label: "Impact Stats (JSON array)",
        type: "json",
        help: 'e.g. [{"label":"Youth Trained","value":"2,400"}]',
      },
    ],
  },
  {
    key: "events",
    label: "Events",
    description: "Upcoming and past events with registration details.",
    titleField: "title",
    imageField: "image",
    defaults: {
      type: "physical",
      status: "upcoming",
      isFree: true,
      capacity: 100,
      registered: 0,
      tags: [],
    },
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "slug", label: "URL Slug", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea", required: true, rows: 4 },
      {
        key: "type",
        label: "Type",
        type: "select",
        options: [
          { value: "physical", label: "Physical" },
          { value: "online", label: "Online" },
          { value: "hybrid", label: "Hybrid" },
        ],
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "upcoming", label: "Upcoming" },
          { value: "ongoing", label: "Ongoing" },
          { value: "past", label: "Past" },
          { value: "cancelled", label: "Cancelled" },
        ],
      },
      { key: "startDate", label: "Start Date/Time", type: "datetime", required: true },
      { key: "endDate", label: "End Date/Time", type: "datetime" },
      { key: "location", label: "Location", type: "text", required: true },
      { key: "district", label: "District", type: "text" },
      { key: "image", label: "Cover Image", type: "image" },
      { key: "capacity", label: "Capacity", type: "number" },
      { key: "registered", label: "Registered Count", type: "number" },
      { key: "isFree", label: "Free Event", type: "checkbox" },
      { key: "price", label: "Price (UGX)", type: "number" },
      { key: "organizer", label: "Organizer", type: "text" },
      { key: "tags", label: "Tags", type: "tags" },
    ],
  },
  {
    key: "news",
    label: "News & Blog",
    description: "Articles, announcements, and impact stories.",
    titleField: "title",
    imageField: "coverImage",
    defaults: {
      views: 0,
      likes: 0,
      commentsCount: 0,
      featured: false,
      tags: [],
      author: { name: "Communications Team", role: "PYU Secretariat" },
    },
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "slug", label: "URL Slug", type: "text", required: true },
      { key: "excerpt", label: "Excerpt", type: "textarea", required: true, rows: 2 },
      { key: "content", label: "Article Content (Markdown)", type: "textarea", required: true, rows: 10 },
      { key: "coverImage", label: "Cover Image", type: "image" },
      { key: "category", label: "Category", type: "text", required: true },
      { key: "tags", label: "Tags", type: "tags" },
      { key: "authorName", label: "Author Name", type: "text" },
      { key: "authorRole", label: "Author Role", type: "text" },
      { key: "authorAvatar", label: "Author Photo", type: "image" },
      { key: "publishedAt", label: "Published At", type: "datetime" },
      { key: "featured", label: "Featured Story", type: "checkbox" },
      { key: "views", label: "Views", type: "number" },
      { key: "likes", label: "Likes", type: "number" },
    ],
  },
  {
    key: "gallery",
    label: "Gallery",
    description: "Photos, videos, and drone footage.",
    titleField: "title",
    imageField: "thumbnail",
    defaults: { type: "photo" },
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      {
        key: "type",
        label: "Type",
        type: "select",
        options: [
          { value: "photo", label: "Photo" },
          { value: "video", label: "Video" },
          { value: "drone", label: "Drone" },
        ],
      },
      { key: "url", label: "Full Image/Video URL", type: "image", required: true },
      { key: "thumbnail", label: "Thumbnail", type: "image" },
      { key: "album", label: "Album", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "district", label: "District", type: "text" },
      { key: "date", label: "Date", type: "date" },
      { key: "caption", label: "Caption", type: "textarea", rows: 2 },
    ],
  },
  {
    key: "opportunities",
    label: "Opportunities",
    description: "Jobs, scholarships, internships, grants, and more.",
    titleField: "title",
    imageField: "image",
    defaults: {
      type: "job",
      isActive: true,
      requirements: [],
      benefits: [],
    },
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "slug", label: "URL Slug", type: "text", required: true },
      {
        key: "type",
        label: "Type",
        type: "select",
        options: [
          { value: "job", label: "Job" },
          { value: "scholarship", label: "Scholarship" },
          { value: "internship", label: "Internship" },
          { value: "competition", label: "Competition" },
          { value: "grant", label: "Grant" },
          { value: "training", label: "Training" },
          { value: "volunteer", label: "Volunteer" },
        ],
      },
      { key: "description", label: "Description", type: "textarea", required: true, rows: 4 },
      { key: "organization", label: "Organization", type: "text" },
      { key: "location", label: "Location", type: "text" },
      { key: "deadline", label: "Deadline", type: "date" },
      { key: "requirements", label: "Requirements", type: "tags" },
      { key: "benefits", label: "Benefits", type: "tags" },
      { key: "image", label: "Image", type: "image" },
      { key: "applicationUrl", label: "Application URL", type: "url" },
      { key: "isActive", label: "Active / Open", type: "checkbox" },
    ],
  },
  {
    key: "resources",
    label: "Resources",
    description: "PDFs, policies, training materials, and forms.",
    titleField: "title",
    defaults: { type: "pdf", downloads: 0 },
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea", rows: 3 },
      {
        key: "type",
        label: "Type",
        type: "select",
        options: [
          { value: "pdf", label: "PDF" },
          { value: "policy", label: "Policy" },
          { value: "training", label: "Training" },
          { value: "video", label: "Video" },
          { value: "form", label: "Form" },
          { value: "other", label: "Other" },
        ],
      },
      { key: "fileUrl", label: "File URL", type: "url", required: true },
      { key: "fileSize", label: "File Size", type: "text", placeholder: "2.4 MB" },
      { key: "category", label: "Category", type: "text" },
      { key: "downloads", label: "Download Count", type: "number" },
      { key: "publishedAt", label: "Published Date", type: "date" },
      { key: "thumbnail", label: "Thumbnail", type: "image" },
    ],
  },
  {
    key: "leaders",
    label: "Leadership",
    description:
      "National, regional, and district leaders. Changes appear on the About page immediately after save.",
    titleField: "name",
    imageField: "photo",
    defaults: { level: "national" },
    fields: [
      { key: "name", label: "Full Name", type: "text", required: true },
      { key: "position", label: "Position / Title", type: "text", required: true },
      {
        key: "photo",
        label: "Photo (upload or pick from Media Library)",
        type: "image",
        help: "Upload a new photo or choose a previous upload — it shows on About → Leadership site-wide.",
      },
      { key: "bio", label: "Biography", type: "textarea", rows: 4 },
      {
        key: "level",
        label: "Level",
        type: "select",
        required: true,
        options: [
          { value: "national", label: "National (shown on About page)" },
          { value: "regional", label: "Regional" },
          { value: "district", label: "District" },
        ],
      },
      { key: "region", label: "Region", type: "text" },
      { key: "district", label: "District", type: "text" },
    ],
  },
  {
    key: "media",
    label: "Media Library",
    description: "All uploaded images. Reuse any image across leaders, programs, news, and more.",
    titleField: "filename",
    imageField: "url",
    fields: [
      { key: "filename", label: "Filename", type: "text", required: true },
      { key: "url", label: "Image", type: "image", required: true },
      { key: "alt", label: "Alt text", type: "text" },
    ],
  },
  {
    key: "partners",
    label: "Partners",
    description: "Partner organizations shown on the homepage.",
    titleField: "name",
    imageField: "logo",
    defaults: { type: "Corporate" },
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "logo", label: "Logo URL / Image", type: "image" },
      { key: "website", label: "Website", type: "url" },
      { key: "type", label: "Type", type: "text", placeholder: "Government / Corporate / Foundation" },
    ],
  },
  {
    key: "testimonials",
    label: "Testimonials",
    description: "Member and volunteer quotes on the homepage.",
    titleField: "name",
    imageField: "avatar",
    defaults: { rating: 5 },
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "role", label: "Role / Title", type: "text" },
      { key: "district", label: "District", type: "text" },
      { key: "quote", label: "Quote", type: "textarea", required: true, rows: 4 },
      { key: "avatar", label: "Photo", type: "image" },
      { key: "rating", label: "Rating (1-5)", type: "number" },
    ],
  },
  {
    key: "districts",
    label: "Districts",
    description: "District statistics for the interactive map.",
    titleField: "name",
    defaults: {
      members: 0,
      projects: 0,
      leaders: 0,
      volunteers: 0,
      events: 0,
      lat: 0.3,
      lng: 32.5,
    },
    fields: [
      { key: "name", label: "District Name", type: "text", required: true },
      { key: "region", label: "Region", type: "text", required: true },
      { key: "members", label: "Members", type: "number" },
      { key: "projects", label: "Projects", type: "number" },
      { key: "leaders", label: "Leaders", type: "number" },
      { key: "volunteers", label: "Volunteers", type: "number" },
      { key: "events", label: "Events", type: "number" },
      { key: "lat", label: "Latitude", type: "number" },
      { key: "lng", label: "Longitude", type: "number" },
    ],
  },
  {
    key: "coreValues",
    label: "Core Values",
    description: "Organization core values on the About page.",
    titleField: "title",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea", required: true, rows: 3 },
      { key: "icon", label: "Icon Name", type: "text", placeholder: "Shield" },
    ],
  },
  {
    key: "history",
    label: "History Timeline",
    description: "Organization history milestones.",
    titleField: "title",
    fields: [
      { key: "year", label: "Year", type: "text", required: true },
      { key: "title", label: "Title", type: "text", required: true },
      { key: "desc", label: "Description", type: "textarea", required: true, rows: 2 },
    ],
  },
  {
    key: "strategicGoals",
    label: "Strategic Goals",
    description: "Strategic roadmap goals.",
    titleField: "title",
    fields: [
      { key: "year", label: "Year", type: "text", required: true },
      { key: "title", label: "Goal", type: "text", required: true },
    ],
  },
  {
    key: "members",
    label: "Members",
    description: "Registered members and applications.",
    titleField: "fullName",
    imageField: "photoURL",
    defaults: {
      role: "member",
      membershipStatus: "pending",
      volunteerHours: 0,
      badges: [],
    },
    fields: [
      { key: "fullName", label: "Full Name", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "phone", label: "Phone", type: "text" },
      { key: "photoURL", label: "Photo", type: "image" },
      {
        key: "role",
        label: "Role",
        type: "select",
        options: [
          { value: "member", label: "Member" },
          { value: "volunteer", label: "Volunteer" },
          { value: "district_admin", label: "District Admin" },
          { value: "regional_admin", label: "Regional Admin" },
          { value: "admin", label: "Admin" },
          { value: "super_admin", label: "Super Admin" },
        ],
      },
      {
        key: "membershipStatus",
        label: "Status",
        type: "select",
        options: [
          { value: "pending", label: "Pending" },
          { value: "active", label: "Active" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
          { value: "suspended", label: "Suspended" },
        ],
      },
      { key: "membershipNumber", label: "Membership Number", type: "text" },
      { key: "district", label: "District", type: "text" },
      { key: "occupation", label: "Occupation", type: "text" },
      { key: "volunteerHours", label: "Volunteer Hours", type: "number" },
    ],
  },
  {
    key: "donations",
    label: "Donations",
    description: "Donation & MoMo payment records (widget + Request to Pay).",
    titleField: "donorName",
    defaults: {
      currency: "UGX",
      isAnonymous: false,
      status: "pending",
      campaign: "General Fund",
      paymentMethod: "momo_widget",
    },
    fields: [
      { key: "donorName", label: "Donor Name", type: "text" },
      { key: "amount", label: "Amount", type: "number", required: true },
      { key: "currency", label: "Currency", type: "text" },
      { key: "campaign", label: "Campaign", type: "text" },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "MoMo Phone", type: "text" },
      { key: "message", label: "Message", type: "textarea", rows: 2 },
      { key: "isAnonymous", label: "Anonymous", type: "checkbox" },
      {
        key: "paymentMethod",
        label: "Payment Method",
        type: "select",
        options: [
          { value: "momo_widget", label: "MoMo Widget / QR" },
          { value: "momo_request_to_pay", label: "MoMo Request to Pay" },
          { value: "manual", label: "Manual" },
        ],
      },
      { key: "externalId", label: "External / Order ID", type: "text" },
      { key: "momoReferenceId", label: "MoMo Reference ID", type: "text" },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "pending", label: "Pending" },
          { value: "completed", label: "Completed" },
          { value: "failed", label: "Failed" },
        ],
      },
      { key: "createdAt", label: "Date", type: "datetime" },
    ],
  },
];

export function getSchema(key: string): CollectionSchema | undefined {
  return collectionSchemas.find((s) => s.key === key);
}

export const siteSettingsFields: FieldDef[] = [
  { key: "orgName", label: "Organization Name", type: "text", required: true },
  { key: "tagline", label: "Tagline", type: "textarea", rows: 2 },
  { key: "heroHeadline", label: "Hero Headline", type: "textarea", rows: 2, required: true },
  { key: "heroSubheadline", label: "Hero Subheadline", type: "textarea", rows: 3 },
  {
    key: "logoUrl",
    label: "Site Logo (Header & Footer)",
    type: "image",
    help: "Upload any logo (even large). It is auto-resized, saved permanently in site settings, and shows in the header/footer immediately.",
  },
  {
    key: "heroImage",
    label: "Homepage Hero Image",
    type: "image",
    help: "Upload a photo for the homepage hero. It saves automatically. For permanent hosting on free Render, use Cloudinary env vars or a small image.",
  },
  {
    key: "ogImage",
    label: "Social Share Image",
    type: "image",
    help: "Optional image for social media previews. Saves automatically when uploaded.",
  },
  { key: "ctaTitle", label: "CTA Section Title", type: "text" },
  { key: "ctaDescription", label: "CTA Description", type: "textarea", rows: 2 },
  { key: "aboutVision", label: "Vision Statement", type: "textarea", rows: 4 },
  { key: "aboutMission", label: "Mission Statement", type: "textarea", rows: 4 },
  { key: "mapDescription", label: "Map Section Description", type: "textarea", rows: 2 },
  { key: "footerAbout", label: "Footer About Text", type: "textarea", rows: 2 },
  { key: "supportEmail", label: "Support Email", type: "email" },
  { key: "hotline", label: "Hotline", type: "text" },
  { key: "whatsapp", label: "WhatsApp Number", type: "text" },
  {
    key: "whatsappGroup",
    label: "WhatsApp Group Invite Link",
    type: "url",
    help: "Official community group link (chat.whatsapp.com/...)",
  },
  { key: "whatsappGroupLabel", label: "WhatsApp Group Button Label", type: "text" },
  {
    key: "whatsappGroupDescription",
    label: "WhatsApp Group Call-to-Action Text",
    type: "textarea",
    rows: 2,
  },
  { key: "address", label: "Address", type: "text" },
  { key: "facebook", label: "Facebook URL", type: "url" },
  { key: "twitter", label: "X / Twitter URL", type: "url" },
  { key: "instagram", label: "Instagram URL", type: "url" },
  { key: "linkedin", label: "LinkedIn URL", type: "url" },
  { key: "youtube", label: "YouTube URL", type: "url" },
  { key: "tiktok", label: "TikTok URL", type: "url" },
  { key: "primaryColor", label: "Primary Color", type: "text" },
  { key: "secondaryColor", label: "Secondary Color", type: "text" },
  { key: "accentColor", label: "Accent Color", type: "text" },
  { key: "maintenanceMode", label: "Maintenance Mode", type: "checkbox" },
];

export const statsFields: FieldDef[] = [
  { key: "members", label: "Total Members", type: "number" },
  { key: "districts", label: "Districts", type: "number" },
  { key: "projects", label: "Projects", type: "number" },
  { key: "volunteers", label: "Volunteers", type: "number" },
  { key: "events", label: "Events", type: "number" },
  { key: "treesPlanted", label: "Trees Planted", type: "number" },
  { key: "scholarships", label: "Scholarships", type: "number" },
  { key: "businesses", label: "Businesses Launched", type: "number" },
];
