import { Faq, Hero, HowItWorks, InsightsPreview, IntroSection, LifeStages, ModuleShowcase, Newsletter, Pricing, PrivacySection, Stories, TrustStrip, VideoSection } from '../sections';

/** Public website — home / landing page. */
export default function Home() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <IntroSection />
      <ModuleShowcase />
      <HowItWorks />
      <VideoSection className="bg-cream" />
      <InsightsPreview />
      <LifeStages />
      <PrivacySection />
      <Stories />
      <Pricing />
      <Faq />
      <Newsletter />
    </>
  );
}
