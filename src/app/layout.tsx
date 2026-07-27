import type { Metadata, Viewport } from "next";
import { Poppins, Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/providers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { AIChat } from "@/components/shared/ai-chat";
import { WhatsAppFloatingButton } from "@/components/shared/whatsapp-group-cta";
import { PWARegister } from "@/components/layout/pwa-register";
import { MomoScript } from "@/components/payments/momo-script";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Patriotic Youths of Uganda | Unity, Service, Leadership & Development",
    template: "%s | Patriotic Youths of Uganda",
  },
  description:
    "Building Uganda Through Unity, Service, Leadership, and Development. Join 125,000+ young patriots transforming communities across all 146 districts.",
  keywords: [
    "Patriotic Youths of Uganda",
    "PYU",
    "Uganda youth",
    "youth leadership",
    "patriotism",
    "volunteer Uganda",
    "youth development",
    "national service",
  ],
  authors: [{ name: "Patriotic Youths of Uganda" }],
  creator: "Patriotic Youths of Uganda",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_UG",
    siteName: "Patriotic Youths of Uganda",
    title: "Patriotic Youths of Uganda",
    description:
      "Building Uganda Through Unity, Service, Leadership, and Development.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "PYU" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Patriotic Youths of Uganda",
    description: "Building Uganda Through Unity, Service, Leadership, and Development.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PYU",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#059669" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} ${manrope.variable} antialiased`}>
        <Providers>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <Header />
          <main id="main-content" className="min-h-screen">
            {children}
          </main>
          <Footer />
          <WhatsAppFloatingButton />
          <AIChat />
          <PWARegister />
          <MomoScript />
        </Providers>
      </body>
    </html>
  );
}
