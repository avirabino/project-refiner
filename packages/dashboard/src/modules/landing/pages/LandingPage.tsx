import { useEffect } from 'react';
import { SEO } from '../data/content';
import { LandingNav } from '../components/LandingNav';
import { HeroSection } from '../components/HeroSection';
import { HowItWorksSection } from '../components/HowItWorksSection';
import { FeaturesSection } from '../components/FeaturesSection';
import { PricingSection } from '../components/PricingSection';
import { CTASection } from '../components/CTASection';
import { Footer } from '../components/Footer';

export function LandingPage() {
  // ── SEO: set document head ──────────────────────────────────────────────
  useEffect(() => {
    document.title = SEO.title;

    const metaTags: Record<string, string> = {
      description: SEO.description,
      'og:title': SEO.ogTitle,
      'og:description': SEO.ogDescription,
      'og:url': SEO.ogUrl,
      'og:image': SEO.ogImage,
      'og:type': 'website',
      'twitter:card': 'summary_large_image',
      'twitter:title': SEO.ogTitle,
      'twitter:description': SEO.ogDescription,
      'twitter:image': SEO.ogImage,
    };

    const cleanupTags: HTMLMetaElement[] = [];

    for (const [key, value] of Object.entries(metaTags)) {
      const isOg = key.startsWith('og:') || key.startsWith('twitter:');
      const attr = isOg ? 'property' : 'name';

      // Check if tag already exists
      let tag = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
        cleanupTags.push(tag);
      }
      tag.setAttribute('content', value);
    }

    return () => {
      // Clean up only tags we created
      cleanupTags.forEach((tag) => tag.remove());
    };
  }, []);

  return (
    <div className="min-h-screen bg-v-bg-base font-ui text-v-text-primary antialiased">
      <LandingNav />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <FeaturesSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
