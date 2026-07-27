import type {
  Project,
  Event,
  NewsArticle,
  GalleryItem,
  Opportunity,
  Resource,
} from "@/types";

export const projects: Project[] = [
  {
    id: "1",
    slug: "youth-skills-hub-kampala",
    title: "Youth Skills Hub – Kampala",
    description:
      "A state-of-the-art skills training and innovation center providing free ICT, entrepreneurship, and vocational training to urban youth.",
    status: "ongoing",
    progress: 72,
    location: "Nakawa, Kampala",
    district: "Kampala",
    images: [
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800",
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800",
    ],
    startDate: "2024-03-01",
    endDate: "2025-12-31",
    budget: 450000000,
    impactStats: [
      { label: "Youth Trained", value: "2,400" },
      { label: "Jobs Created", value: "380" },
      { label: "Courses Offered", value: "24" },
    ],
    category: "ICT & Skills",
  },
  {
    id: "2",
    slug: "green-uganda-tree-planting",
    title: "Green Uganda Tree Planting Drive",
    description:
      "Nationwide campaign to plant 10 million trees by 2030, restoring degraded lands and creating green jobs for youth.",
    status: "ongoing",
    progress: 45,
    location: "Nationwide",
    district: "Multiple",
    images: [
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800",
      "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800",
    ],
    startDate: "2023-06-01",
    endDate: "2030-12-31",
    impactStats: [
      { label: "Trees Planted", value: "2.5M" },
      { label: "Districts Covered", value: "98" },
      { label: "Volunteers", value: "18,000" },
    ],
    category: "Climate Action",
  },
  {
    id: "3",
    slug: "northern-agribusiness-coop",
    title: "Northern Agribusiness Cooperative",
    description:
      "Supporting youth farmer cooperatives in Northern Uganda with training, inputs, and market access for cassava, maize, and sesame.",
    status: "completed",
    progress: 100,
    location: "Gulu & Lira",
    district: "Gulu",
    images: [
      "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800",
    ],
    startDate: "2022-01-01",
    endDate: "2024-06-30",
    impactStats: [
      { label: "Farmers Supported", value: "1,800" },
      { label: "Cooperatives", value: "24" },
      { label: "Income Increase", value: "65%" },
    ],
    category: "Agriculture",
  },
  {
    id: "4",
    slug: "girls-stem-scholarship",
    title: "Girls in STEM Scholarship Fund",
    description:
      "Full scholarships for 500 outstanding young women pursuing STEM degrees at Ugandan universities.",
    status: "ongoing",
    progress: 60,
    location: "National",
    district: "Multiple",
    images: [
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800",
    ],
    startDate: "2023-09-01",
    endDate: "2027-08-31",
    impactStats: [
      { label: "Scholars", value: "300" },
      { label: "Universities", value: "8" },
      { label: "Graduation Rate", value: "94%" },
    ],
    category: "Education",
  },
  {
    id: "5",
    slug: "community-health-outreach",
    title: "Community Health Outreach",
    description:
      "Mobile health camps providing free screenings, vaccinations, and health education in underserved communities.",
    status: "ongoing",
    progress: 55,
    location: "Eastern Region",
    district: "Mbale",
    images: [
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800",
    ],
    startDate: "2024-01-15",
    impactStats: [
      { label: "People Reached", value: "45,000" },
      { label: "Camps Held", value: "86" },
      { label: "Health Workers", value: "120" },
    ],
    category: "Community Service",
  },
  {
    id: "6",
    slug: "sports-for-peace",
    title: "Sports for Peace Tournament",
    description:
      "Inter-district football and netball tournaments promoting unity, talent discovery, and peacebuilding.",
    status: "completed",
    progress: 100,
    location: "Jinja",
    district: "Jinja",
    images: [
      "https://images.unsplash.com/photo-1461896836934-ffe607ba6851?w=800",
    ],
    startDate: "2024-08-01",
    endDate: "2024-08-15",
    impactStats: [
      { label: "Athletes", value: "2,400" },
      { label: "Districts", value: "32" },
      { label: "Spectators", value: "15,000" },
    ],
    category: "Sports",
  },
];

export const events: Event[] = [
  {
    id: "1",
    slug: "national-youth-summit-2025",
    title: "National Youth Summit 2025",
    description:
      "The premier gathering of young leaders, innovators, and changemakers from across Uganda. Featuring keynotes, workshops, networking, and awards.",
    type: "hybrid",
    status: "upcoming",
    startDate: "2025-09-15T09:00:00",
    endDate: "2025-09-17T17:00:00",
    location: "Kololo Ceremonial Grounds, Kampala",
    district: "Kampala",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
    capacity: 5000,
    registered: 3240,
    isFree: false,
    price: 25000,
    organizer: "PYU National Secretariat",
    tags: ["leadership", "networking", "summit"],
    agenda: [
      { time: "09:00", title: "Opening Ceremony & National Anthem" },
      { time: "10:00", title: "Keynote: Youth as Architects of Vision 2040" },
      { time: "11:30", title: "Panel: Entrepreneurship & Job Creation" },
      { time: "14:00", title: "Breakout Workshops" },
      { time: "16:30", title: "Networking & Exhibition" },
    ],
  },
  {
    id: "2",
    slug: "climate-action-day-mbale",
    title: "Climate Action Day – Mbale",
    description:
      "Mass tree planting, climate education workshops, and clean-up exercise across Mbale City.",
    type: "physical",
    status: "upcoming",
    startDate: "2025-08-20T07:00:00",
    endDate: "2025-08-20T16:00:00",
    location: "Mbale Municipal Stadium",
    district: "Mbale",
    image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800",
    capacity: 2000,
    registered: 1450,
    isFree: true,
    organizer: "PYU Eastern Region",
    tags: ["climate", "volunteer", "environment"],
  },
  {
    id: "3",
    slug: "digital-skills-bootcamp",
    title: "Digital Skills Bootcamp",
    description:
      "Intensive 5-day coding and digital marketing bootcamp for beginners. Certificates awarded upon completion.",
    type: "hybrid",
    status: "upcoming",
    startDate: "2025-08-05T08:00:00",
    endDate: "2025-08-09T17:00:00",
    location: "Youth Skills Hub, Nakawa",
    district: "Kampala",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800",
    capacity: 100,
    registered: 87,
    isFree: true,
    organizer: "PYU ICT Program",
    tags: ["ict", "training", "coding"],
  },
  {
    id: "4",
    slug: "patriotism-week-2024",
    title: "National Patriotism Week 2024",
    description:
      "A week of flag ceremonies, heritage tours, civic education, and community service across all districts.",
    type: "physical",
    status: "past",
    startDate: "2024-10-07T08:00:00",
    endDate: "2024-10-13T18:00:00",
    location: "Nationwide",
    image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800",
    capacity: 50000,
    registered: 42000,
    isFree: true,
    organizer: "PYU National Secretariat",
    tags: ["patriotism", "culture", "unity"],
  },
  {
    id: "5",
    slug: "startup-pitch-night",
    title: "Startup Pitch Night",
    description:
      "Young entrepreneurs pitch their ventures to investors and mentors. UGX 50M in seed funding available.",
    type: "physical",
    status: "upcoming",
    startDate: "2025-09-28T17:00:00",
    endDate: "2025-09-28T21:00:00",
    location: "Innovation Village, Ntinda",
    district: "Kampala",
    image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800",
    capacity: 200,
    registered: 156,
    isFree: false,
    price: 10000,
    organizer: "PYU Entrepreneurship Program",
    tags: ["entrepreneurship", "startup", "funding"],
  },
];

export const newsArticles: NewsArticle[] = [
  {
    id: "1",
    slug: "pyu-launches-national-youth-summit-2025",
    title: "PYU Launches National Youth Summit 2025: Unity for Development",
    excerpt:
      "Thousands of young leaders will gather in Kampala this September for the largest youth summit in Uganda's history.",
    content: `
## A Historic Gathering

The Patriotic Youths of Uganda is proud to announce the National Youth Summit 2025, set to take place from September 15–17 at Kololo Ceremonial Grounds.

### What to Expect

- Keynote addresses from national leaders and youth champions
- 20+ workshops on leadership, entrepreneurship, and civic engagement
- Exhibition of youth-led innovations and enterprises
- National Youth Awards ceremony

### Registration

Early bird registration is now open for members. Non-members can join and register simultaneously through our membership portal.

> "This summit will be a defining moment for Uganda's youth movement." — Hon. Rebecca Alitwala, National Chairperson
    `,
    coverImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200",
    category: "Announcements",
    tags: ["summit", "events", "leadership"],
    author: { name: "Communications Team", role: "PYU Secretariat" },
    publishedAt: "2025-07-01T10:00:00Z",
    featured: true,
    views: 12450,
    likes: 890,
    commentsCount: 56,
  },
  {
    id: "2",
    slug: "2-5-million-trees-planted",
    title: "Milestone: 2.5 Million Trees Planted Across Uganda",
    excerpt:
      "Youth volunteers have reached a major climate milestone, planting 2.5 million trees in 98 districts.",
    content: `
## Greening Uganda Together

Our Green Uganda Tree Planting Drive has hit a remarkable milestone. Young patriots from 98 districts have collectively planted 2.5 million trees since the campaign launched in 2023.

### Impact

- Restored 1,200 hectares of degraded land
- Created 3,500 temporary green jobs
- Engaged 18,000 active volunteers

The goal remains 10 million trees by 2030. Join a planting day near you.
    `,
    coverImage: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200",
    category: "Impact",
    tags: ["climate", "environment", "volunteer"],
    author: { name: "Faith Namukasa", role: "Climate Ambassador", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100" },
    publishedAt: "2025-06-15T08:00:00Z",
    featured: true,
    views: 8900,
    likes: 1200,
    commentsCount: 78,
  },
  {
    id: "3",
    slug: "ict-bootcamp-graduates-200",
    title: "ICT Bootcamp Graduates 200 Youth with Industry Certificates",
    excerpt:
      "The latest cohort of digital skills trainees celebrated their graduation with job placement support.",
    content: `
## From Learners to Earners

Two hundred young Ugandans completed our intensive 8-week Digital Skills Bootcamp, covering web development, digital marketing, and freelancing skills.

Eighty-five percent of graduates have already secured internships, freelance contracts, or full-time employment.
    `,
    coverImage: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200",
    category: "Programs",
    tags: ["ict", "education", "jobs"],
    author: { name: "Eng. Sarah Tumusiime", role: "ICT Coordinator" },
    publishedAt: "2025-05-28T14:00:00Z",
    views: 5600,
    likes: 430,
    commentsCount: 34,
  },
  {
    id: "4",
    slug: "scholarship-applications-open",
    title: "2025 Scholarship Applications Now Open",
    excerpt:
      "Apply for full and partial scholarships under the Girls in STEM and General Education funds.",
    content: `
## Invest in Your Future

Applications for the 2025 academic year scholarships are now open. Eligible programs include:

1. Girls in STEM Full Scholarships
2. Need-based General Education Grants
3. Vocational Training Bursaries

**Deadline:** August 31, 2025
    `,
    coverImage: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200",
    category: "Opportunities",
    tags: ["scholarship", "education"],
    author: { name: "Education Desk", role: "PYU Programs" },
    publishedAt: "2025-05-10T09:00:00Z",
    views: 15200,
    likes: 2100,
    commentsCount: 145,
  },
];

export const galleryItems: GalleryItem[] = [
  {
    id: "1",
    title: "National Youth Summit Opening",
    type: "photo",
    url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200",
    thumbnail: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400",
    album: "Events 2024",
    category: "Events",
    district: "Kampala",
    date: "2024-09-15",
  },
  {
    id: "2",
    title: "Tree Planting in Mbale",
    type: "photo",
    url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200",
    thumbnail: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400",
    album: "Climate Action",
    category: "Climate",
    district: "Mbale",
    date: "2024-06-05",
  },
  {
    id: "3",
    title: "ICT Lab Training Session",
    type: "photo",
    url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200",
    thumbnail: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400",
    album: "Programs",
    category: "ICT",
    district: "Kampala",
    date: "2024-08-20",
  },
  {
    id: "4",
    title: "Agricultural Demo Farm",
    type: "photo",
    url: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200",
    thumbnail: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400",
    album: "Agriculture",
    category: "Agriculture",
    district: "Gulu",
    date: "2024-04-12",
  },
  {
    id: "5",
    title: "Sports for Peace Finals",
    type: "photo",
    url: "https://images.unsplash.com/photo-1461896836934-ffe607ba6851?w=1200",
    thumbnail: "https://images.unsplash.com/photo-1461896836934-ffe607ba6851?w=400",
    album: "Sports",
    category: "Sports",
    district: "Jinja",
    date: "2024-08-15",
  },
  {
    id: "6",
    title: "Community Health Camp",
    type: "photo",
    url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200",
    thumbnail: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400",
    album: "Community Service",
    category: "Health",
    district: "Mbale",
    date: "2024-03-22",
  },
  {
    id: "7",
    title: "Cultural Dance Performance",
    type: "photo",
    url: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=1200",
    thumbnail: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400",
    album: "Arts & Culture",
    category: "Culture",
    district: "Mbarara",
    date: "2024-10-09",
  },
  {
    id: "8",
    title: "Aerial View – Tree Planting Site",
    type: "drone",
    url: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200",
    thumbnail: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400",
    album: "Drone Footage",
    category: "Climate",
    district: "Wakiso",
    date: "2024-07-01",
  },
  {
    id: "9",
    title: "Leadership Academy Cohort",
    type: "photo",
    url: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200",
    thumbnail: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400",
    album: "Leadership",
    category: "Leadership",
    district: "Kampala",
    date: "2024-05-18",
  },
];

export const opportunities: Opportunity[] = [
  {
    id: "1",
    slug: "program-officer-kampala",
    title: "Program Officer – Youth Development",
    type: "job",
    description: "Lead program implementation for leadership and patriotism initiatives in Central Region.",
    organization: "PYU National Secretariat",
    location: "Kampala",
    deadline: "2025-08-30",
    requirements: ["Bachelor's degree", "3+ years youth programming experience", "Fluent in English and Luganda"],
    benefits: ["Competitive salary", "Health insurance", "Professional development"],
    isActive: true,
    image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=600",
  },
  {
    id: "2",
    slug: "stem-scholarship-2025",
    title: "Girls in STEM Scholarship 2025",
    type: "scholarship",
    description: "Full tuition and living stipend for female students pursuing STEM degrees.",
    organization: "PYU Education Fund",
    location: "National",
    deadline: "2025-08-31",
    requirements: ["Female Ugandan citizen", "Admitted to STEM program", "Strong academic record"],
    isActive: true,
    image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600",
  },
  {
    id: "3",
    slug: "communications-internship",
    title: "Communications Intern",
    type: "internship",
    description: "Support social media, content creation, and media relations for 6 months.",
    organization: "PYU Communications",
    location: "Kampala (Hybrid)",
    deadline: "2025-08-15",
    requirements: ["Currently enrolled or recent graduate", "Strong writing skills", "Social media savvy"],
    benefits: ["Monthly stipend", "Mentorship", "Certificate"],
    isActive: true,
  },
  {
    id: "4",
    slug: "innovation-challenge-2025",
    title: "National Youth Innovation Challenge",
    type: "competition",
    description: "Pitch solutions to national development challenges. Win seed funding up to UGX 20M.",
    organization: "PYU Innovation Hub",
    location: "Kampala",
    deadline: "2025-09-10",
    requirements: ["Age 18–35", "Ugandan citizen", "Original solution"],
    benefits: ["Seed funding", "Mentorship", "Incubation support"],
    isActive: true,
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600",
  },
  {
    id: "5",
    slug: "community-development-grant",
    title: "Community Development Micro-Grant",
    type: "grant",
    description: "Grants of UGX 2–5M for youth-led community development projects.",
    organization: "PYU Grants Desk",
    location: "All Districts",
    deadline: "2025-09-30",
    requirements: ["Registered PYU member", "Project proposal", "Community endorsement"],
    isActive: true,
  },
  {
    id: "6",
    slug: "leadership-academy-intake",
    title: "National Leadership Academy – Intake 12",
    type: "training",
    description: "Intensive residential leadership training for emerging youth leaders.",
    organization: "PYU Leadership Program",
    location: "Entebbe",
    deadline: "2025-08-20",
    requirements: ["Age 20–30", "Demonstrated leadership", "District nomination preferred"],
    isActive: true,
  },
  {
    id: "7",
    slug: "health-outreach-volunteers",
    title: "Health Outreach Volunteers Needed",
    type: "volunteer",
    description: "Join mobile health camps in Eastern Uganda. Medical and non-medical roles available.",
    organization: "PYU Community Service",
    location: "Mbale, Tororo, Soroti",
    deadline: "2025-08-10",
    requirements: ["Passion for service", "Availability for 2-week deployments"],
    isActive: true,
  },
];

export const resources: Resource[] = [
  {
    id: "1",
    title: "PYU Strategic Plan 2025–2030",
    description: "Five-year strategic roadmap for national youth empowerment.",
    type: "policy",
    fileUrl: "/resources/strategic-plan-2025-2030.pdf",
    fileSize: "2.4 MB",
    category: "Policy",
    downloads: 3450,
    publishedAt: "2025-01-15",
  },
  {
    id: "2",
    title: "Membership Handbook",
    description: "Complete guide to membership rights, responsibilities, and benefits.",
    type: "pdf",
    fileUrl: "/resources/membership-handbook.pdf",
    fileSize: "1.1 MB",
    category: "Membership",
    downloads: 8900,
    publishedAt: "2024-06-01",
  },
  {
    id: "3",
    title: "Leadership Training Manual",
    description: "Facilitator and participant guide for district leadership workshops.",
    type: "training",
    fileUrl: "/resources/leadership-manual.pdf",
    fileSize: "3.8 MB",
    category: "Training",
    downloads: 2100,
    publishedAt: "2024-09-10",
  },
  {
    id: "4",
    title: "Code of Conduct",
    description: "Ethical standards and conduct expectations for all members and staff.",
    type: "policy",
    fileUrl: "/resources/code-of-conduct.pdf",
    fileSize: "480 KB",
    category: "Policy",
    downloads: 5600,
    publishedAt: "2024-03-01",
  },
  {
    id: "5",
    title: "Event Registration Form",
    description: "Printable form for offline event registration.",
    type: "form",
    fileUrl: "/resources/event-registration-form.pdf",
    fileSize: "120 KB",
    category: "Forms",
    downloads: 12000,
    publishedAt: "2024-01-01",
  },
  {
    id: "6",
    title: "Introduction to Patriotism (Video Series)",
    description: "Six-part video series on national values and civic duty.",
    type: "video",
    fileUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    category: "Training",
    downloads: 4500,
    publishedAt: "2024-10-01",
  },
  {
    id: "7",
    title: "Volunteer Timesheet Template",
    description: "Track and submit volunteer hours for badge and certificate eligibility.",
    type: "form",
    fileUrl: "/resources/volunteer-timesheet.xlsx",
    fileSize: "45 KB",
    category: "Forms",
    downloads: 6700,
    publishedAt: "2024-02-15",
  },
  {
    id: "8",
    title: "Safeguarding Policy",
    description: "Child and vulnerable persons protection policy.",
    type: "policy",
    fileUrl: "/resources/safeguarding-policy.pdf",
    fileSize: "890 KB",
    category: "Policy",
    downloads: 2300,
    publishedAt: "2024-04-20",
  },
];

export function getProjectBySlug(slug: string) {
  return projects.find((p) => p.slug === slug);
}

export function getEventBySlug(slug: string) {
  return events.find((e) => e.slug === slug);
}

export function getArticleBySlug(slug: string) {
  return newsArticles.find((a) => a.slug === slug);
}

export function getOpportunityBySlug(slug: string) {
  return opportunities.find((o) => o.slug === slug);
}
