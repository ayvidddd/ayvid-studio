import { LandingHero } from "@/components/marketing/landing-hero";
import { FeatureGrid } from "@/components/marketing/feature-grid";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <LandingHero />
      <FeatureGrid />
    </main>
  );
}
