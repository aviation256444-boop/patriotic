import type { DistrictStats, Partner, Testimonial, Leader, Badge } from "@/types";

export const nationalStats = {
  members: 125480,
  districts: 146,
  projects: 342,
  volunteers: 28500,
  events: 1250,
  treesPlanted: 2500000,
  scholarships: 2000,
  businesses: 1200,
};

export const districts: DistrictStats[] = [
  { name: "Kampala", region: "Central", members: 18500, projects: 42, leaders: 85, volunteers: 3200, events: 48, lat: 0.3476, lng: 32.5825 },
  { name: "Wakiso", region: "Central", members: 12200, projects: 28, leaders: 62, volunteers: 2100, events: 32, lat: 0.4044, lng: 32.4594 },
  { name: "Mukono", region: "Central", members: 6800, projects: 15, leaders: 38, volunteers: 980, events: 18, lat: 0.3533, lng: 32.7553 },
  { name: "Gulu", region: "Northern", members: 5400, projects: 18, leaders: 42, volunteers: 1100, events: 22, lat: 2.7747, lng: 32.299 },
  { name: "Lira", region: "Northern", members: 4200, projects: 12, leaders: 30, volunteers: 850, events: 15, lat: 2.249, lng: 32.8998 },
  { name: "Arua", region: "West Nile", members: 3900, projects: 11, leaders: 28, volunteers: 720, events: 14, lat: 3.0201, lng: 30.9111 },
  { name: "Mbarara", region: "Western", members: 7100, projects: 20, leaders: 45, volunteers: 1400, events: 25, lat: -0.6072, lng: 30.6545 },
  { name: "Fort Portal", region: "Western", members: 3500, projects: 10, leaders: 25, volunteers: 680, events: 12, lat: 0.671, lng: 30.275 },
  { name: "Kabale", region: "Western", members: 3200, projects: 9, leaders: 22, volunteers: 590, events: 11, lat: -1.2486, lng: 29.9899 },
  { name: "Jinja", region: "Eastern", members: 5800, projects: 16, leaders: 35, volunteers: 1050, events: 20, lat: 0.4244, lng: 33.2041 },
  { name: "Mbale", region: "Eastern", members: 6100, projects: 17, leaders: 40, volunteers: 1180, events: 21, lat: 1.082, lng: 34.175 },
  { name: "Soroti", region: "Eastern", members: 2800, projects: 8, leaders: 20, volunteers: 520, events: 10, lat: 1.7145, lng: 33.6111 },
  { name: "Masaka", region: "Central", members: 4500, projects: 13, leaders: 28, volunteers: 800, events: 16, lat: -0.3333, lng: 31.7333 },
  { name: "Hoima", region: "Western", members: 3100, projects: 9, leaders: 22, volunteers: 560, events: 11, lat: 1.4333, lng: 31.35 },
  { name: "Tororo", region: "Eastern", members: 2900, projects: 8, leaders: 18, volunteers: 480, events: 9, lat: 0.6928, lng: 34.1809 },
  { name: "Moroto", region: "Karamoja", members: 1800, projects: 7, leaders: 15, volunteers: 320, events: 8, lat: 2.5347, lng: 34.6666 },
  { name: "Kotido", region: "Karamoja", members: 1500, projects: 6, leaders: 12, volunteers: 280, events: 7, lat: 2.9806, lng: 34.1331 },
  { name: "Kasese", region: "Western", members: 3400, projects: 10, leaders: 24, volunteers: 610, events: 12, lat: 0.1833, lng: 30.0833 },
  { name: "Entebbe", region: "Central", members: 2700, projects: 8, leaders: 18, volunteers: 450, events: 10, lat: 0.0512, lng: 32.4637 },
  { name: "Mityana", region: "Central", members: 2400, projects: 7, leaders: 16, volunteers: 400, events: 9, lat: 0.4175, lng: 32.0228 },
];

export const testimonials: Testimonial[] = [
  {
    id: "1",
    name: "Grace Achieng",
    role: "Entrepreneur & Chapter Leader",
    district: "Gulu",
    quote:
      "PYU's entrepreneurship program gave me the confidence and skills to launch my agribusiness. Today I employ 12 young people in my district.",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200",
    rating: 5,
  },
  {
    id: "2",
    name: "Brian Ssempijja",
    role: "ICT Volunteer",
    district: "Kampala",
    quote:
      "Through the ICT & Digital Skills program, I learned full-stack development and now freelancing for international clients while mentoring others.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
    rating: 5,
  },
  {
    id: "3",
    name: "Faith Namukasa",
    role: "Climate Ambassador",
    district: "Mbale",
    quote:
      "We've planted over 50,000 trees in our region. PYU showed us that youth can lead climate action and make a real difference.",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",
    rating: 5,
  },
  {
    id: "4",
    name: "Joseph Okot",
    role: "Scholarship Recipient",
    district: "Arua",
    quote:
      "The education program's scholarship changed my life. I'm now completing my degree and giving back as a peer tutor in my community.",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200",
    rating: 5,
  },
];

export const partners: Partner[] = [
  { id: "1", name: "Ministry of Gender, Labour & Social Development", logo: "/partners/mglsd.svg", type: "Government" },
  { id: "2", name: "National Youth Council", logo: "/partners/nyc.svg", type: "Government" },
  { id: "3", name: "Uganda Investment Authority", logo: "/partners/uia.svg", type: "Government" },
  { id: "4", name: "UNDP Uganda", logo: "/partners/undp.svg", type: "International" },
  { id: "5", name: "Mastercard Foundation", logo: "/partners/mcf.svg", type: "Foundation" },
  { id: "6", name: "Stanbic Bank Uganda", logo: "/partners/stanbic.svg", type: "Corporate" },
  { id: "7", name: "MTN Uganda", logo: "/partners/mtn.svg", type: "Corporate" },
  { id: "8", name: "Makerere University", logo: "/partners/mak.svg", type: "Academic" },
];

export const nationalLeaders: Leader[] = [
  {
    id: "1",
    name: "Hon. Rebecca Alitwala",
    position: "National Chairperson",
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400",
    bio: "A passionate advocate for youth empowerment with 15 years of civic leadership experience.",
    level: "national",
  },
  {
    id: "2",
    name: "Dr. Moses Kibirige",
    position: "Secretary General",
    photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400",
    bio: "Former university lecturer and development practitioner specializing in youth policy.",
    level: "national",
  },
  {
    id: "3",
    name: "Patricia Nabukeera",
    position: "Deputy Chairperson",
    photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400",
    bio: "Entrepreneur and gender equality champion leading our entrepreneurship pillar.",
    level: "national",
  },
  {
    id: "4",
    name: "Capt. James Odong",
    position: "National Coordinator – Patriotism",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400",
    bio: "Retired officer dedicated to instilling national values and discipline among youth.",
    level: "national",
  },
  {
    id: "5",
    name: "Eng. Sarah Tumusiime",
    position: "National Coordinator – Innovation & ICT",
    photo: "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400",
    bio: "Software engineer and innovator driving digital transformation for youth.",
    level: "national",
  },
  {
    id: "6",
    name: "Rev. Peter Ssenyonga",
    position: "Treasurer",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    bio: "Financial management expert ensuring transparency and accountability.",
    level: "national",
  },
];

export const badges: Badge[] = [
  { id: "first-event", name: "First Steps", description: "Attended your first event", icon: "Star", color: "bg-yellow-500", requirement: "Attend 1 event" },
  { id: "volunteer-10", name: "Helping Hand", description: "Completed 10 volunteer hours", icon: "HandHelping", color: "bg-emerald-500", requirement: "10 volunteer hours" },
  { id: "volunteer-50", name: "Community Pillar", description: "Completed 50 volunteer hours", icon: "Users", color: "bg-blue-500", requirement: "50 volunteer hours" },
  { id: "volunteer-100", name: "Service Champion", description: "Completed 100 volunteer hours", icon: "Award", color: "bg-purple-500", requirement: "100 volunteer hours" },
  { id: "patriot", name: "True Patriot", description: "Completed patriotism training", icon: "Flag", color: "bg-red-500", requirement: "Complete patriotism program" },
  { id: "leader", name: "Emerging Leader", description: "Completed leadership academy", icon: "Crown", color: "bg-amber-500", requirement: "Complete leadership program" },
  { id: "recruiter", name: "Ambassador", description: "Referred 10 new members", icon: "UserPlus", color: "bg-cyan-500", requirement: "Refer 10 members" },
  { id: "donor", name: "Supporter", description: "Made a donation", icon: "Heart", color: "bg-pink-500", requirement: "Make a donation" },
];

export const coreValues = [
  { title: "Unity", description: "We celebrate diversity and foster national cohesion across all regions, tribes, and faiths.", icon: "Users" },
  { title: "Service", description: "We put community first through selfless volunteerism and impactful action.", icon: "HeartHandshake" },
  { title: "Leadership", description: "We develop ethical, visionary leaders who inspire positive change.", icon: "Crown" },
  { title: "Integrity", description: "We uphold honesty, transparency, and accountability in all we do.", icon: "Shield" },
  { title: "Innovation", description: "We embrace creativity and technology to solve Uganda's challenges.", icon: "Lightbulb" },
  { title: "Excellence", description: "We strive for the highest standards in every program and initiative.", icon: "Trophy" },
];
