import type { Program } from "@/types";

export const programs: Program[] = [
  {
    id: "1",
    slug: "leadership-development",
    title: "Leadership Development",
    shortDescription: "Cultivating the next generation of ethical, visionary Ugandan leaders.",
    description:
      "Our Leadership Development program equips young Ugandans with the skills, mindset, and networks needed to lead with integrity. Through workshops, mentorship, and practical community projects, participants learn strategic thinking, public speaking, conflict resolution, and servant leadership.",
    icon: "Crown",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80",
    color: "from-yellow-500 to-amber-600",
    goals: [
      "Train 10,000 youth leaders annually",
      "Establish leadership clubs in every district",
      "Connect mentees with national mentors",
    ],
    activities: [
      "National Leadership Academy",
      "District Leadership Bootcamps",
      "Peer Mentorship Circles",
      "Civic Engagement Projects",
    ],
    impact: "Over 25,000 young leaders trained across 146 districts.",
    beneficiaries: 25000,
    featured: true,
  },
  {
    id: "2",
    slug: "patriotism-training",
    title: "Patriotism Training",
    shortDescription: "Inspiring love of country, national identity, and civic duty.",
    description:
      "Patriotism Training deepens understanding of Uganda's history, constitution, cultural heritage, and national values. Participants engage in flag ceremonies, national dialogue forums, and community service that strengthens social cohesion.",
    icon: "Flag",
    image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80",
    color: "from-red-600 to-rose-700",
    goals: [
      "Reach every secondary school nationally",
      "Promote national unity across ethnic lines",
      "Celebrate cultural diversity",
    ],
    activities: [
      "National Values Workshops",
      "Heritage Tours",
      "Unity Dialogues",
      "Independence Day Programs",
    ],
    impact: "500+ schools engaged; 80,000 youth trained in national values.",
    beneficiaries: 80000,
    featured: true,
  },
  {
    id: "3",
    slug: "entrepreneurship",
    title: "Entrepreneurship",
    shortDescription: "Turning ideas into enterprises that create jobs and wealth.",
    description:
      "We empower young entrepreneurs with business skills, access to markets, microfinance linkages, and incubation support so they can build sustainable enterprises that drive Uganda's economy.",
    icon: "Lightbulb",
    image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80",
    color: "from-emerald-500 to-green-600",
    goals: [
      "Incubate 5,000 youth-led businesses",
      "Create 50,000 jobs by 2030",
      "Link startups to financing",
    ],
    activities: [
      "Business Bootcamps",
      "Pitch Competitions",
      "Market Linkages",
      "Mentorship Networks",
    ],
    impact: "1,200 businesses launched; UGX 8B+ in revenue generated.",
    beneficiaries: 15000,
    featured: true,
  },
  {
    id: "4",
    slug: "agriculture",
    title: "Agriculture",
    shortDescription: "Modernizing agribusiness for food security and prosperity.",
    description:
      "Our Agriculture program introduces climate-smart farming, agribusiness skills, value-chain development, and cooperative models that make farming attractive and profitable for youth.",
    icon: "Sprout",
    image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80",
    color: "from-lime-500 to-green-700",
    goals: [
      "Train 20,000 agripreneurs",
      "Establish demo farms in every region",
      "Improve yields by 40%",
    ],
    activities: [
      "Climate-Smart Farming Training",
      "Cooperative Formation",
      "Value Addition Workshops",
      "Agri-Tech Demonstrations",
    ],
    impact: "8,500 youth in agribusiness; 120 cooperatives formed.",
    beneficiaries: 8500,
  },
  {
    id: "5",
    slug: "innovation",
    title: "Innovation",
    shortDescription: "Fostering creativity and problem-solving for national challenges.",
    description:
      "Innovation hubs, hackathons, and design-thinking labs help young Ugandans invent solutions for health, education, energy, and governance challenges.",
    icon: "Rocket",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80",
    color: "from-violet-500 to-purple-700",
    goals: [
      "Launch innovation hubs in 4 regions",
      "Support 500 prototypes annually",
      "Partner with universities",
    ],
    activities: [
      "National Innovation Challenge",
      "Maker Spaces",
      "Design Thinking Labs",
      "IP Awareness Workshops",
    ],
    impact: "200+ prototypes; 40 patents filed; 15 startups spun out.",
    beneficiaries: 5000,
  },
  {
    id: "6",
    slug: "ict-digital-skills",
    title: "ICT & Digital Skills",
    shortDescription: "Bridging the digital divide with future-ready tech skills.",
    description:
      "From coding and digital literacy to cybersecurity and freelancing, this program prepares youth for the digital economy and remote work opportunities.",
    icon: "Monitor",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80",
    color: "from-blue-500 to-cyan-600",
    goals: [
      "Digitally skill 100,000 youth",
      "Establish coding clubs nationwide",
      "Enable global freelancing income",
    ],
    activities: [
      "Coding Bootcamps",
      "Digital Literacy Campaigns",
      "Cybersecurity Awareness",
      "Freelancer Training",
    ],
    impact: "35,000 digitally skilled; 2,000 freelancers earning online.",
    beneficiaries: 35000,
    featured: true,
  },
  {
    id: "7",
    slug: "climate-action",
    title: "Climate Action",
    shortDescription: "Youth-led solutions for a greener, resilient Uganda.",
    description:
      "Tree planting, renewable energy advocacy, waste management, and climate education put young people at the center of Uganda's environmental future.",
    icon: "Leaf",
    image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80",
    color: "from-teal-500 to-emerald-700",
    goals: [
      "Plant 10 million trees",
      "Train climate ambassadors in every district",
      "Promote clean energy adoption",
    ],
    activities: [
      "National Tree Planting Days",
      "Climate Clubs",
      "Waste Recycling Projects",
      "Green Energy Campaigns",
    ],
    impact: "2.5M trees planted; 500 climate clubs active.",
    beneficiaries: 40000,
  },
  {
    id: "8",
    slug: "community-service",
    title: "Community Service",
    shortDescription: "Serving communities to build solidarity and impact.",
    description:
      "Structured volunteer programs address local needs—health outreach, infrastructure support, education tutoring, and disaster response—while building character and civic pride.",
    icon: "HeartHandshake",
    image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80",
    color: "from-pink-500 to-rose-600",
    goals: [
      "Mobilize 50,000 volunteers yearly",
      "Complete 1,000 community projects",
      "Track and reward service hours",
    ],
    activities: [
      "Health Outreach Camps",
      "School Renovation Drives",
      "Disaster Response Teams",
      "Mentorship in Schools",
    ],
    impact: "120,000+ volunteer hours; 300 communities served.",
    beneficiaries: 100000,
  },
  {
    id: "9",
    slug: "sports",
    title: "Sports",
    shortDescription: "Building character, health, and unity through sport.",
    description:
      "Sports programs promote fitness, discipline, talent identification, and inter-district unity through tournaments, training, and coaching development.",
    icon: "Trophy",
    image: "https://images.unsplash.com/photo-1461896836934-ffe607ba6851?w=800&q=80",
    color: "from-orange-500 to-red-600",
    goals: [
      "Organize annual national youth games",
      "Identify talent for national teams",
      "Promote gender equity in sports",
    ],
    activities: [
      "Inter-District Tournaments",
      "Coaching Clinics",
      "Sports for Peace Events",
      "Parasports Inclusion",
    ],
    impact: "15,000 athletes engaged; 50 district leagues active.",
    beneficiaries: 15000,
  },
  {
    id: "10",
    slug: "arts-culture",
    title: "Arts & Culture",
    shortDescription: "Celebrating Uganda's rich cultural heritage and creative talent.",
    description:
      "Music, dance, theatre, visual arts, and storytelling preserve heritage while creating livelihoods for young creatives across Uganda.",
    icon: "Palette",
    image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&q=80",
    color: "from-fuchsia-500 to-purple-600",
    goals: [
      "Support 2,000 young creatives",
      "Document cultural heritage",
      "Stage national youth arts festival",
    ],
    activities: [
      "Cultural Festivals",
      "Creative Skills Workshops",
      "Heritage Documentation",
      "Creative Industry Linkages",
    ],
    impact: "800 artists supported; annual national arts festival launched.",
    beneficiaries: 8000,
  },
  {
    id: "11",
    slug: "education",
    title: "Education",
    shortDescription: "Expanding access to quality learning and lifelong skills.",
    description:
      "Scholarships, tutoring, literacy campaigns, and career guidance help close education gaps and prepare youth for productive futures.",
    icon: "GraduationCap",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80",
    color: "from-indigo-500 to-blue-700",
    goals: [
      "Award 5,000 scholarships",
      "Support literacy in rural areas",
      "Career guidance in every district",
    ],
    activities: [
      "Scholarship Fund",
      "Peer Tutoring Networks",
      "Career Fairs",
      "Adult Literacy Classes",
    ],
    impact: "2,000 scholarships awarded; 10,000 literacy learners.",
    beneficiaries: 20000,
    featured: true,
  },
];

export function getProgramBySlug(slug: string): Program | undefined {
  return programs.find((p) => p.slug === slug);
}

export function getFeaturedPrograms(): Program[] {
  return programs.filter((p) => p.featured);
}
