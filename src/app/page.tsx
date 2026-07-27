import { Hero } from "@/components/home/hero";
import { Stats } from "@/components/home/stats";
import { FeaturedPrograms } from "@/components/home/featured-programs";
import { LatestNews } from "@/components/home/latest-news";
import { UpcomingEvents } from "@/components/home/upcoming-events";
import { Testimonials } from "@/components/home/testimonials";
import { Partners } from "@/components/home/partners";
import { UgandaMapSection } from "@/components/home/uganda-map";
import { CTA } from "@/components/home/cta";
import { WhatsAppGroupCTA } from "@/components/shared/whatsapp-group-cta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Stats />
      <WhatsAppGroupCTA variant="banner" />
      <FeaturedPrograms />
      <LatestNews />
      <UpcomingEvents />
      <Testimonials />
      <UgandaMapSection />
      <Partners />
      <CTA />
    </>
  );
}
