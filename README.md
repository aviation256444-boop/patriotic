# Patriotic Youths of Uganda (PYU)

A world-class, fully responsive Progressive Web App for the **Patriotic Youths of Uganda** — built with Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion, TanStack Query, Firebase, and Cloudinary.

## Features

- **Premium UI** — Apple/Stripe/Tesla/Vercel-inspired design with glassmorphism, gradients, dark/light mode
- **Uganda national colors** — Black, Yellow, Red with Emerald Green accents
- **PWA** — Installable, offline support, push notification ready
- **11 Programs** with detailed pages
- **Projects, Events, News, Gallery, Opportunities, Resources**
- **Membership** — Multi-step form, membership number, QR code, digital card
- **Volunteer Portal** — Hours tracking, badges, leaderboard, certificates
- **Member Dashboard** — Profile, card, activity, events, notifications, achievements
- **Admin Dashboard** — Analytics charts, CRUD for all content, campaigns, reports, audit logs
- **Super Admin** — Full system control, RBAC, backups, security, API keys
- **Interactive Uganda Map** — District-level statistics
- **AI Chat Assistant** — FAQ-based helper
- **Forum, Donations, Search, Contact**

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS 4, Framer Motion |
| State | Zustand, TanStack Query |
| Auth & DB | Firebase Auth + Firestore (demo mode included) |
| Media | Cloudinary-ready, next/image |
| Charts | Recharts |
| QR Codes | qrcode.react |
| PWA | Custom service worker + manifest |

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Member | member@pyu.ug | demo1234 |
| Admin | admin@pyu.ug | admin1234 |
| Super Admin | superadmin@pyu.ug | super1234 |

Demo mode works without Firebase credentials. Set `NEXT_PUBLIC_DEMO_MODE=false` and add Firebase keys to connect a real backend.

## Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email, Google, Facebook, Apple, Phone)
3. Create a Firestore database
4. Copy config values into `.env.local`
5. Set `NEXT_PUBLIC_DEMO_MODE=false`

## Cloudinary Setup

1. Create a Cloudinary account
2. Add `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` and upload preset to `.env.local`

## Scripts

```bash
npm run dev      # Development (Turbopack)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

## Project Structure

```
src/
  app/              # App Router pages
  components/       # UI, layout, home, dashboard, shared
  lib/              # Firebase, utils, mock data
  providers/        # React Query + Theme
  store/            # Zustand auth store
  types/            # TypeScript types
public/
  icons/            # PWA icons
  manifest.json
  sw.js             # Service worker
```

## License

Proprietary — Patriotic Youths of Uganda. All rights reserved.